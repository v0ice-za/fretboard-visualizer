package com.guitarapp.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

/**
 * Binds the {@code app.jwt} block from application.yml.
 *
 * @param secret         base64-encoded HMAC-SHA secret (>=256 bits for HS256); from JWT_SECRET env in prod
 * @param accessTokenTtl access-token lifetime (e.g. 15m)
 * @param refreshTokenTtl refresh-token lifetime (e.g. 7d)
 */
@ConfigurationProperties("app.jwt")
public record JwtProperties(
        String secret,
        Duration accessTokenTtl,
        Duration refreshTokenTtl) {
}
