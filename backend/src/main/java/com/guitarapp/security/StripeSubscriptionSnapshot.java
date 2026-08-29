package com.guitarapp.security;

import java.time.OffsetDateTime;

/** Our own read shape for a Stripe Subscription — never leaks the Stripe SDK model past {@link StripeGateway}. */
public record StripeSubscriptionSnapshot(String subscriptionId, String customerId, String status, OffsetDateTime currentPeriodEnd) {
}
