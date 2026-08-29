package com.guitarapp.service;

import com.guitarapp.dto.AuthResponseDto;
import com.guitarapp.dto.GoogleAuthRequestDto;
import com.guitarapp.dto.LoginRequestDto;
import com.guitarapp.dto.RegisterRequestDto;
import com.guitarapp.dto.UserResponseDto;
import com.guitarapp.exception.AuthException;
import com.guitarapp.model.User;
import com.guitarapp.repository.UserRepository;
import com.guitarapp.security.GoogleTokenClaims;
import com.guitarapp.security.GoogleTokenVerifier;
import com.guitarapp.security.JwtService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Locale;
import java.util.Optional;

/**
 * Email/password auth: registration, login, and stateless-JWT refresh-token rotation.
 *
 * <p>Refresh invalidation uses {@code user.tokenVersion}: each refresh token embeds the
 * version it was minted with; rotating (refresh) or logout increments the version, which
 * immediately staleness-checks any previously issued refresh token.
 */
@Service
public class AuthService {

    /** Access-token body + the refresh token the controller writes as an httpOnly cookie. */
    public record AuthResult(AuthResponseDto body, String refreshToken) {
    }

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final GoogleTokenVerifier googleTokenVerifier;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService,
                       GoogleTokenVerifier googleTokenVerifier) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.googleTokenVerifier = googleTokenVerifier;
    }

    @Transactional
    public AuthResult register(RegisterRequestDto request) {
        String email = normalizeEmail(request.email());
        if (userRepository.existsByEmail(email)) {
            throw AuthException.emailAlreadyExists();
        }
        User user = User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(request.password()))
                .name(StringUtils.hasText(request.name()) ? request.name() : null)
                .build();
        try {
            // saveAndFlush surfaces the email unique-constraint violation here
            // (instead of at commit), so a concurrent duplicate races into 409 not 500.
            user = userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException e) {
            throw AuthException.emailAlreadyExists();
        }
        return issueTokens(user);
    }

    @Transactional(readOnly = true)
    public AuthResult login(LoginRequestDto request) {
        User user = userRepository.findByEmail(normalizeEmail(request.email()))
                .orElseThrow(AuthException::invalidCredentials);
        // Google-only accounts have no password hash — treat as invalid (no enumeration).
        if (!StringUtils.hasText(user.getPasswordHash())
                || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw AuthException.invalidCredentials();
        }
        return issueTokens(user);
    }

    /**
     * Google sign-in. Verifies the ID token, then finds-or-links-or-creates the user:
     * <ol>
     *   <li>match on {@code google_id} → log in</li>
     *   <li>else match on verified {@code email} → link the google_id to that account, then log in
     *       (lets an email/password user later sign in with Google on the same verified address)</li>
     *   <li>else → create a new password-less account</li>
     * </ol>
     */
    @Transactional
    public AuthResult loginWithGoogle(GoogleAuthRequestDto request) {
        GoogleTokenClaims claims = googleTokenVerifier.verify(request.idToken());
        // A verified email is mandatory; a token without one (unverified, or the email scope
        // was never granted) is treated as invalid rather than creating an email-less account.
        if (!claims.emailVerified() || !StringUtils.hasText(claims.email())) {
            throw AuthException.invalidGoogleToken();
        }
        String email = normalizeEmail(claims.email());

        // 1. Known google_id → log in.
        Optional<User> byGoogleId = userRepository.findByGoogleId(claims.googleId());
        if (byGoogleId.isPresent()) {
            return issueTokens(byGoogleId.get());
        }

        // 2. Verified-email account (e.g. a prior email/password registration) → link the
        //    google_id, but only when the row is not already bound to a different identity.
        //    A mismatched, already-linked account logs in by verified email without clobbering
        //    its existing google_id.
        Optional<User> byEmail = userRepository.findByEmail(email);
        if (byEmail.isPresent()) {
            User existing = byEmail.get();
            if (existing.getGoogleId() == null) {
                existing.setGoogleId(claims.googleId());
                userRepository.save(existing);
            }
            return issueTokens(existing);
        }

        // 3. New password-less account. saveAndFlush surfaces the email/google_id unique
        //    violation here, so a concurrent first sign-in resolves to a clean 409 (mirroring
        //    register()) rather than a 500 — the winning request has already logged the user in.
        try {
            User user = User.builder()
                    .email(email)
                    .googleId(claims.googleId())
                    .name(claims.name())
                    .build();
            return issueTokens(userRepository.saveAndFlush(user));
        } catch (DataIntegrityViolationException e) {
            throw AuthException.googleAccountConflict();
        }
    }

    @Transactional
    public AuthResult refresh(String refreshToken) {
        RefreshClaims parsed = parseRefreshToken(refreshToken);
        User user = userRepository.findById(parsed.userId())
                .orElseThrow(AuthException::invalidRefreshToken);
        if (parsed.tokenVersion() != user.getTokenVersion()) {
            throw AuthException.invalidRefreshToken();
        }
        // Rotate: bump the version so the just-used refresh token becomes stale.
        user.setTokenVersion(user.getTokenVersion() + 1);
        userRepository.save(user);
        return issueTokens(user);
    }

    /**
     * Invalidates the current refresh chain server-side. Safe (no-op) when the token is
     * missing, malformed, or already invalidated — the controller always clears the cookie.
     */
    @Transactional
    public void logout(String refreshToken) {
        if (!StringUtils.hasText(refreshToken)) {
            return;
        }
        RefreshClaims parsed;
        try {
            parsed = parseRefreshToken(refreshToken);
        } catch (AuthException ignored) {
            // Already logged out / malformed token — nothing to invalidate.
            return;
        }
        userRepository.findById(parsed.userId()).ifPresent(user -> {
            if (parsed.tokenVersion() == user.getTokenVersion()) {
                user.setTokenVersion(user.getTokenVersion() + 1);
                userRepository.save(user);
            }
        });
    }

    /** Validated refresh-token payload — only the fields the service consumes. */
    private record RefreshClaims(long userId, int tokenVersion) {
    }

    private RefreshClaims parseRefreshToken(String refreshToken) {
        if (!StringUtils.hasText(refreshToken)) {
            throw AuthException.invalidRefreshToken();
        }
        try {
            Claims claims = jwtService.parseAndValidate(refreshToken);
            return new RefreshClaims(jwtService.extractUserId(claims), jwtService.extractTokenVersion(claims));
        } catch (JwtException e) {
            throw AuthException.invalidRefreshToken();
        }
    }

    private AuthResult issueTokens(User user) {
        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);
        return new AuthResult(new AuthResponseDto(accessToken, UserResponseDto.from(user)), refreshToken);
    }

    private static String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }
}
