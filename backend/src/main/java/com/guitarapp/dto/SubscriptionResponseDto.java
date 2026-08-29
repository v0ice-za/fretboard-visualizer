package com.guitarapp.dto;

import com.guitarapp.model.Subscription;

import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Read-only subscription status for {@code GET /api/v1/subscriptions/me}. Enforces a DTO
 * boundary — the {@link Subscription} entity is never serialized. Kept minimal so the
 * enforcement/expiry logic (Story 3.6) can drive it without a breaking rename.
 *
 * @param status           effective status ({@code ACTIVE} / {@code EXPIRED} / {@code NONE})
 * @param currentPeriodEnd ISO-8601 offset date-time, or {@code null}
 */
public record SubscriptionResponseDto(String status, String currentPeriodEnd) {

    /**
     * Builds a response with an explicit (already evaluated) status — the caller has applied
     * expiry evaluation; see {@code SubscriptionService.resolveEffectiveStatus}.
     */
    public static SubscriptionResponseDto of(String status, OffsetDateTime periodEnd) {
        String end = periodEnd == null ? null : periodEnd.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
        return new SubscriptionResponseDto(status, end);
    }

    /**
     * Raw mapping straight off the entity (persisted status, expiry NOT evaluated). Retained
     * for callers that intentionally want the stored status; the status-only endpoint uses
     * {@link #of} with the effective status instead.
     */
    public static SubscriptionResponseDto from(Subscription subscription) {
        return of(subscription.getStatus(), subscription.getCurrentPeriodEnd());
    }

    /** No subscription row for the user — free tier. Frontend maps any non-ACTIVE to isPremium=false. */
    public static SubscriptionResponseDto none() {
        return new SubscriptionResponseDto("NONE", null);
    }
}
