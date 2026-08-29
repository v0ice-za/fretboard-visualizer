package com.guitarapp.security;

import com.guitarapp.config.JwtProperties;
import com.guitarapp.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;

/**
 * Issues and verifies the HS256 JWT pair (jjwt 0.12.x API).
 *
 * <ul>
 *   <li>Access token — subject = user id; claims {@code email}, {@code role}; short-lived.</li>
 *   <li>Refresh token — subject = user id; claim {@code tokenVersion} (drives rotation/invalidation).</li>
 * </ul>
 * The access token is validated statelessly on every request (no DB lookup).
 */
@Service
public class JwtService {

    public static final String CLAIM_EMAIL = "email";
    public static final String CLAIM_ROLE = "role";
    public static final String CLAIM_TOKEN_VERSION = "tokenVersion";

    /** Authority strings carried verbatim in the {@code role} claim — already include the
     *  {@code ROLE_} prefix Spring's {@code hasRole('PREMIUM')} expects, so do not re-prefix. */
    public static final String ROLE_PREMIUM = "ROLE_PREMIUM";
    public static final String ROLE_FREE = "ROLE_FREE";

    private final SecretKey key;
    private final JwtProperties properties;

    public JwtService(JwtProperties properties) {
        this.properties = properties;
        this.key = Keys.hmacShaKeyFor(Base64.getDecoder().decode(properties.secret()));
    }

    /**
     * @param role the subscription-tier authority ({@link #ROLE_PREMIUM} / {@link #ROLE_FREE}),
     *             resolved by the caller from the user's effective subscription status.
     */
    public String generateAccessToken(User user, String role) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(user.getId().toString())
                .claim(CLAIM_EMAIL, user.getEmail())
                .claim(CLAIM_ROLE, role)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(properties.accessTokenTtl())))
                .signWith(key)
                .compact();
    }

    public String generateRefreshToken(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(user.getId().toString())
                .claim(CLAIM_TOKEN_VERSION, user.getTokenVersion())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(properties.refreshTokenTtl())))
                .signWith(key)
                .compact();
    }

    /**
     * Parses and verifies the signature + expiry of a token.
     *
     * @throws io.jsonwebtoken.JwtException if the token is malformed, tampered, or expired
     */
    public Claims parseAndValidate(String token) {
        Jws<Claims> jws = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token);
        return jws.getPayload();
    }

    public Long extractUserId(Claims claims) {
        String subject = claims.getSubject();
        if (subject == null) {
            throw new JwtException("Token is missing the subject claim.");
        }
        try {
            return Long.valueOf(subject);
        } catch (NumberFormatException e) {
            throw new JwtException("Token subject is not a numeric user id.", e);
        }
    }

    public String extractEmail(Claims claims) {
        return claims.get(CLAIM_EMAIL, String.class);
    }

    public String extractRole(Claims claims) {
        return claims.get(CLAIM_ROLE, String.class);
    }

    public int extractTokenVersion(Claims claims) {
        Integer version = claims.get(CLAIM_TOKEN_VERSION, Integer.class);
        if (version == null) {
            throw new JwtException("Refresh token is missing the tokenVersion claim.");
        }
        return version;
    }
}
