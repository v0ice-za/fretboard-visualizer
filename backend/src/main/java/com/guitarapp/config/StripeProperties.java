package com.guitarapp.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Binds the {@code app.stripe} block from application.yml. All three values are real
 * secrets/identifiers with no dev fallback (same pattern as {@link GoogleProperties}) —
 * they must come from env (Railway in prod, a local `.env`/shell export in dev).
 *
 * @param secretKey      Stripe secret API key (from STRIPE_SECRET_KEY)
 * @param webhookSecret  signing secret for verifying the Stripe-Signature header (from STRIPE_WEBHOOK_SECRET)
 * @param priceId        the Stripe Price ID for the $12/yr subscription plan (from STRIPE_PRICE_ID)
 */
@ConfigurationProperties("app.stripe")
public record StripeProperties(String secretKey, String webhookSecret, String priceId) {
}
