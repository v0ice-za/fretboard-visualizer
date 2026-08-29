package com.guitarapp.security;

import com.guitarapp.config.FrontendProperties;
import com.guitarapp.config.StripeProperties;
import com.guitarapp.exception.PaymentException;
import com.stripe.Stripe;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.Subscription;
import com.stripe.model.SubscriptionItem;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.checkout.SessionCreateParams;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

/**
 * Calls the real Stripe SDK. Held behind {@link StripeGateway} so callers can inject a
 * test double — the raw SDK types are concrete with static methods and are not
 * mockable on the Java 25 test JVM (mirrors {@link GoogleTokenVerifierImpl}).
 */
@Service
public class StripeGatewayImpl implements StripeGateway {

    private final StripeProperties stripeProperties;
    private final FrontendProperties frontendProperties;

    @Autowired
    public StripeGatewayImpl(StripeProperties stripeProperties, FrontendProperties frontendProperties) {
        this.stripeProperties = stripeProperties;
        this.frontendProperties = frontendProperties;
        Stripe.apiKey = stripeProperties.secretKey();
    }

    @Override
    public String createCheckoutSession(Long userId, String customerEmail, String existingStripeCustomerId) {
        SessionCreateParams.Builder builder = SessionCreateParams.builder()
                .setMode(SessionCreateParams.Mode.SUBSCRIPTION)
                .addLineItem(SessionCreateParams.LineItem.builder()
                        .setPrice(stripeProperties.priceId())
                        .setQuantity(1L)
                        .build())
                .setClientReferenceId(userId.toString())
                .setSuccessUrl(frontendProperties.baseUrl() + "/?checkout=success")
                .setCancelUrl(frontendProperties.baseUrl() + "/?checkout=cancelled");

        if (StringUtils.hasText(existingStripeCustomerId)) {
            builder.setCustomer(existingStripeCustomerId);
        } else {
            builder.setCustomerEmail(customerEmail);
        }

        try {
            Session session = Session.create(builder.build());
            return session.getUrl();
        } catch (StripeException e) {
            throw PaymentException.checkoutFailed();
        }
    }

    @Override
    public Event constructWebhookEvent(String payload, String sigHeader) {
        try {
            return Webhook.constructEvent(payload, sigHeader, stripeProperties.webhookSecret());
        } catch (SignatureVerificationException e) {
            throw PaymentException.invalidSignature();
        }
    }

    @Override
    public StripeSubscriptionSnapshot retrieveSubscription(String stripeSubscriptionId) {
        try {
            Subscription subscription = Subscription.retrieve(stripeSubscriptionId);
            return toSnapshot(subscription);
        } catch (StripeException e) {
            throw PaymentException.checkoutFailed();
        }
    }

    /**
     * As of Stripe's 2025-03-31 ("Basil") API version, {@code current_period_end} lives on
     * the subscription's items, not on the Subscription object itself — reading
     * {@code Subscription.getCurrentPeriodEnd()} (removed from the SDK) would not compile,
     * and pre-Basil code that cached the old field silently got nulls back.
     */
    private StripeSubscriptionSnapshot toSnapshot(Subscription subscription) {
        Long periodEndEpoch = subscription.getItems().getData().stream()
                .findFirst()
                .map(SubscriptionItem::getCurrentPeriodEnd)
                .orElse(null);
        OffsetDateTime currentPeriodEnd = periodEndEpoch == null
                ? null
                : Instant.ofEpochSecond(periodEndEpoch).atOffset(ZoneOffset.UTC);
        return new StripeSubscriptionSnapshot(subscription.getId(), subscription.getCustomer(),
                subscription.getStatus(), currentPeriodEnd);
    }
}
