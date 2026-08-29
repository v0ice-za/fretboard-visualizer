package com.guitarapp.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Binds the {@code app.google} block from application.yml.
 *
 * @param clientId the Google OAuth 2.0 Web client ID; the audience an ID token must
 *                 match to be accepted. From GOOGLE_CLIENT_ID env (no dev fallback).
 */
@ConfigurationProperties("app.google")
public record GoogleProperties(String clientId) {
}
