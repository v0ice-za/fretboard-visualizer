package com.guitarapp.service;

import com.guitarapp.dto.SubscriptionResponseDto;
import com.guitarapp.repository.SubscriptionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Read-only subscription status lookup. Enforcement (@PreAuthorize, expiry evaluation,
 * Stripe-driven transitions) is Story 3.5/3.6 — this service is status-only.
 */
@Service
public class SubscriptionService {

    private final SubscriptionRepository subscriptionRepository;

    public SubscriptionService(SubscriptionRepository subscriptionRepository) {
        this.subscriptionRepository = subscriptionRepository;
    }

    @Transactional(readOnly = true)
    public SubscriptionResponseDto getForUser(Long userId) {
        return subscriptionRepository.findByUserId(userId)
                .map(SubscriptionResponseDto::from)
                .orElseGet(SubscriptionResponseDto::none);
    }
}
