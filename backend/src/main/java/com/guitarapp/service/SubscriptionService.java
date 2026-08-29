package com.guitarapp.service;

import com.guitarapp.dto.SubscriptionResponseDto;
import com.guitarapp.model.Subscription;
import com.guitarapp.repository.SubscriptionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

/**
 * Subscription tier resolution — the single source of truth for a user's effective status,
 * consumed by both {@code GET /api/v1/subscriptions/me} (→ frontend {@code isPremium}) and
 * {@code AuthService} (→ JWT {@code role} claim). They must never disagree, so both go through
 * {@link #resolveEffectiveStatus}.
 *
 * <p>Expiry is evaluated here (a row marked {@code ACTIVE} whose {@code current_period_end} has
 * passed is treated as {@code EXPIRED}) as defense-in-depth against a missed/late Stripe webhook.
 */
@Service
public class SubscriptionService {

    public static final String STATUS_ACTIVE = "ACTIVE";
    public static final String STATUS_EXPIRED = "EXPIRED";
    public static final String STATUS_NONE = "NONE";

    private final SubscriptionRepository subscriptionRepository;

    public SubscriptionService(SubscriptionRepository subscriptionRepository) {
        this.subscriptionRepository = subscriptionRepository;
    }

    @Transactional(readOnly = true)
    public SubscriptionResponseDto getForUser(Long userId) {
        return subscriptionRepository.findByUserId(userId)
                .map(sub -> SubscriptionResponseDto.of(effectiveStatus(sub), sub.getCurrentPeriodEnd()))
                .orElseGet(SubscriptionResponseDto::none);
    }

    /**
     * Effective tier status: {@code ACTIVE} / {@code EXPIRED} / {@code NONE} (no row).
     * Shared verbatim by the status endpoint and the JWT role claim.
     */
    @Transactional(readOnly = true)
    public String resolveEffectiveStatus(Long userId) {
        return subscriptionRepository.findByUserId(userId)
                .map(this::effectiveStatus)
                .orElse(STATUS_NONE);
    }

    @Transactional(readOnly = true)
    public boolean isPremiumActive(Long userId) {
        return STATUS_ACTIVE.equals(resolveEffectiveStatus(userId));
    }

    /** A row is effectively ACTIVE only if stored ACTIVE and its period has not lapsed; else EXPIRED. */
    private String effectiveStatus(Subscription sub) {
        boolean active = STATUS_ACTIVE.equals(sub.getStatus()) && notExpired(sub.getCurrentPeriodEnd());
        return active ? STATUS_ACTIVE : STATUS_EXPIRED;
    }

    private boolean notExpired(OffsetDateTime periodEnd) {
        return periodEnd == null || periodEnd.isAfter(OffsetDateTime.now());
    }
}
