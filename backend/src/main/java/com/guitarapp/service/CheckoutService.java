package com.guitarapp.service;

import com.guitarapp.dto.CheckoutSessionResponseDto;
import com.guitarapp.exception.AuthException;
import com.guitarapp.model.Subscription;
import com.guitarapp.model.User;
import com.guitarapp.repository.SubscriptionRepository;
import com.guitarapp.repository.UserRepository;
import com.guitarapp.security.StripeGateway;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CheckoutService {

    private final UserRepository userRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final StripeGateway stripeGateway;

    public CheckoutService(UserRepository userRepository, SubscriptionRepository subscriptionRepository,
                           StripeGateway stripeGateway) {
        this.userRepository = userRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.stripeGateway = stripeGateway;
    }

    @Transactional(readOnly = true)
    public CheckoutSessionResponseDto createSession(Long userId) {
        User user = userRepository.findById(userId).orElseThrow(AuthException::unauthorized);
        // Reuse a known Stripe customer from a prior checkout attempt, if one exists,
        // instead of letting Stripe mint a fresh customer on every attempt.
        String existingCustomerId = subscriptionRepository.findByUserId(userId)
                .map(Subscription::getStripeCustomerId)
                .orElse(null);
        String url = stripeGateway.createCheckoutSession(userId, user.getEmail(), existingCustomerId);
        return new CheckoutSessionResponseDto(url);
    }
}
