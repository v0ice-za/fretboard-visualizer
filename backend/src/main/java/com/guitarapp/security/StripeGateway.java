package com.guitarapp.security;

import com.guitarapp.exception.PaymentException;
import com.stripe.model.Event;

/**
 * Wraps the Stripe SDK's static, concrete-class calls behind an interface so callers
 * mock cleanly on the Java 25 test JVM (Byte Buddy cannot subclass concrete classes,
 * and the raw Stripe SDK types are concrete with static factory/lookup methods).
 */
public interface StripeGateway {

    /**
     * Creates a Stripe Checkout Session for the $12/yr subscription plan.
     *
     * @param userId                  correlates the session back to our user via {@code client_reference_id}
     * @param customerEmail           used only when {@code existingStripeCustomerId} is null
     * @param existingStripeCustomerId reuse a known Stripe customer if one exists, else null
     * @return the Checkout Session's hosted URL
     * @throws PaymentException {@code CHECKOUT_SESSION_FAILED} on any Stripe API failure
     */
    String createCheckoutSession(Long userId, String customerEmail, String existingStripeCustomerId);

    /**
     * Verifies the {@code Stripe-Signature} header against the raw payload and returns the event.
     *
     * @throws PaymentException {@code INVALID_STRIPE_SIGNATURE} if verification fails
     */
    Event constructWebhookEvent(String payload, String sigHeader);

    /**
     * Retrieves a Stripe Subscription's current status/period-end, mapped to our own type
     * (never leak the Stripe SDK's {@code Subscription} model past this boundary).
     *
     * @throws PaymentException {@code CHECKOUT_SESSION_FAILED} on any Stripe API failure
     */
    StripeSubscriptionSnapshot retrieveSubscription(String stripeSubscriptionId);
}
