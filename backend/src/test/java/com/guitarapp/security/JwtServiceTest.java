package com.guitarapp.security;

import com.guitarapp.config.JwtProperties;
import com.guitarapp.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private static final String SECRET =
            Base64.getEncoder().encodeToString("0123456789012345678901234567890123456789".getBytes());

    private final JwtService jwtService = new JwtService(
            new JwtProperties(SECRET, Duration.ofMinutes(15), Duration.ofDays(7)));

    private User user() {
        User user = User.builder().email("alice@example.com").name("Alice").tokenVersion(3).build();
        user.setId(42L);
        return user;
    }

    @Test
    void access_token_round_trips_subject_email_and_role() {
        String token = jwtService.generateAccessToken(user());

        Claims claims = jwtService.parseAndValidate(token);

        assertThat(jwtService.extractUserId(claims)).isEqualTo(42L);
        assertThat(jwtService.extractEmail(claims)).isEqualTo("alice@example.com");
        assertThat(jwtService.extractRole(claims)).isEqualTo("ROLE_FREE");
    }

    @Test
    void refresh_token_carries_token_version() {
        String token = jwtService.generateRefreshToken(user());

        Claims claims = jwtService.parseAndValidate(token);

        assertThat(jwtService.extractUserId(claims)).isEqualTo(42L);
        assertThat(jwtService.extractTokenVersion(claims)).isEqualTo(3);
    }

    @Test
    void expired_token_is_rejected() {
        JwtService expiringService = new JwtService(
                new JwtProperties(SECRET, Duration.ofSeconds(-1), Duration.ofDays(7)));
        String token = expiringService.generateAccessToken(user());

        assertThatThrownBy(() -> jwtService.parseAndValidate(token))
                .isInstanceOf(JwtException.class);
    }

    @Test
    void tampered_signature_is_rejected() {
        String token = jwtService.generateAccessToken(user());
        String tampered = token.substring(0, token.length() - 2)
                + (token.endsWith("a") ? "bb" : "aa");

        assertThatThrownBy(() -> jwtService.parseAndValidate(tampered))
                .isInstanceOf(JwtException.class);
    }

    @Test
    void token_signed_with_a_different_key_is_rejected() {
        String otherSecret =
                Base64.getEncoder().encodeToString("abcdefghijabcdefghijabcdefghijabcdefghij".getBytes());
        JwtService otherService = new JwtService(
                new JwtProperties(otherSecret, Duration.ofMinutes(15), Duration.ofDays(7)));
        String foreignToken = otherService.generateAccessToken(user());

        assertThatThrownBy(() -> jwtService.parseAndValidate(foreignToken))
                .isInstanceOf(JwtException.class);
    }

    @Test
    void extract_token_version_throws_when_claim_missing() {
        // An access token has no tokenVersion claim; treating it as a refresh token must fail.
        String accessToken = jwtService.generateAccessToken(user());
        Claims claims = jwtService.parseAndValidate(accessToken);

        assertThatThrownBy(() -> jwtService.extractTokenVersion(claims))
                .isInstanceOf(JwtException.class);
    }

    @Test
    void extract_user_id_throws_when_subject_is_non_numeric() {
        String token = io.jsonwebtoken.Jwts.builder()
                .subject("not-a-number")
                .signWith(io.jsonwebtoken.security.Keys.hmacShaKeyFor(Base64.getDecoder().decode(SECRET)))
                .compact();
        Claims claims = jwtService.parseAndValidate(token);

        assertThatThrownBy(() -> jwtService.extractUserId(claims))
                .isInstanceOf(JwtException.class);
    }
}
