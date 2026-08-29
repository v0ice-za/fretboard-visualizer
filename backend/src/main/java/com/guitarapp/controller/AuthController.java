package com.guitarapp.controller;

import com.guitarapp.config.CookieProperties;
import com.guitarapp.config.JwtProperties;
import com.guitarapp.dto.AuthResponseDto;
import com.guitarapp.dto.GoogleAuthRequestDto;
import com.guitarapp.dto.LoginRequestDto;
import com.guitarapp.dto.RegisterRequestDto;
import com.guitarapp.exception.AuthException;
import com.guitarapp.service.AuthService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    static final String REFRESH_COOKIE = "refresh_token";
    private static final String COOKIE_PATH = "/api/v1/auth";

    private final AuthService authService;
    private final Duration refreshTtl;
    private final CookieProperties cookieProperties;

    public AuthController(AuthService authService, JwtProperties jwtProperties,
                          CookieProperties cookieProperties) {
        this.authService = authService;
        this.refreshTtl = jwtProperties.refreshTokenTtl();
        this.cookieProperties = cookieProperties;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponseDto> register(@Valid @RequestBody RegisterRequestDto request) {
        return tokenResponse(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponseDto> login(@Valid @RequestBody LoginRequestDto request) {
        return tokenResponse(authService.login(request));
    }

    @PostMapping("/google")
    public ResponseEntity<AuthResponseDto> googleAuth(@Valid @RequestBody GoogleAuthRequestDto request) {
        return tokenResponse(authService.loginWithGoogle(request));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponseDto> refresh(
            @CookieValue(value = REFRESH_COOKIE, required = false) String refreshToken,
            HttpServletResponse response) {
        try {
            return tokenResponse(authService.refresh(refreshToken));
        } catch (AuthException ex) {
            // Kill the dead/invalid refresh cookie (aligns with logout) instead of leaving
            // it to linger its full TTL; the GlobalExceptionHandler still writes the envelope.
            // Scoped to AuthException (not RuntimeException) so a transient/unrelated failure
            // (e.g. a DB blip) doesn't force an unnecessary re-login.
            response.addHeader(HttpHeaders.SET_COOKIE, expiredRefreshCookie().toString());
            throw ex;
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @CookieValue(value = REFRESH_COOKIE, required = false) String refreshToken) {
        authService.logout(refreshToken);
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, expiredRefreshCookie().toString())
                .build();
    }

    private ResponseEntity<AuthResponseDto> tokenResponse(AuthService.AuthResult result) {
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookie(result.refreshToken()).toString())
                .body(result.body());
    }

    private ResponseCookie refreshCookie(String token) {
        return baseCookie(token).maxAge(refreshTtl).build();
    }

    private ResponseCookie expiredRefreshCookie() {
        return baseCookie("").maxAge(0).build();
    }

    private ResponseCookie.ResponseCookieBuilder baseCookie(String value) {
        // SameSite/Secure are profile/env-driven (app.cookie.*): dev Lax+insecure over http
        // localhost; prod None+Secure for the cross-origin Vercel→Railway request.
        return ResponseCookie.from(REFRESH_COOKIE, value)
                .httpOnly(true)
                .secure(cookieProperties.secure())
                .sameSite(cookieProperties.sameSite())
                .path(COOKIE_PATH);
    }
}
