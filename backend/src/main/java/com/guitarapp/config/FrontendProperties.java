package com.guitarapp.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Binds the {@code app.frontend} block from application.yml — used to build the Stripe
 * Checkout success/cancel redirect URLs. Not a secret, so it has a local-dev fallback.
 *
 * @param baseUrl the frontend's origin (from FRONTEND_BASE_URL, default the Vite dev server)
 */
@ConfigurationProperties("app.frontend")
public record FrontendProperties(String baseUrl) {
}
