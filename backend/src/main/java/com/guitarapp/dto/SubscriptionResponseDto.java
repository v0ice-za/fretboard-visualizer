package com.guitarapp.dto;

import com.guitarapp.model.Subscription;

import java.time.format.DateTimeFormatter;

/**
 * Read-only subscription status for {@code GET /api/v1/subscriptions/me}. Enforces a DTO
 * boundary — the {@link Subscription} entity is never serialized. Kept minimal so Story 3.6
 * (enforcement) can extend it without a breaking rename.
 *
 * @param status           the raw status string (e.g. {@code ACTIVE}, {@code FREE}) or {@code NONE} when no row exists
 * @param currentPeriodEnd ISO-8601 offset date-time, or {@code null}
 */
public record SubscriptionResponseDto(String status, String currentPeriodEnd) {

    public static SubscriptionResponseDto from(Subscription subscription) {
        String end = subscription.getCurrentPeriodEnd() == null
                ? null
                : subscription.getCurrentPeriodEnd().format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
        return new SubscriptionResponseDto(subscription.getStatus(), end);
    }

    /** No subscription row for the user — free tier. Frontend maps any non-ACTIVE to isPremium=false. */
    public static SubscriptionResponseDto none() {
        return new SubscriptionResponseDto("NONE", null);
    }
}
