package com.guitarapp.controller;

import com.guitarapp.dto.SubscriptionResponseDto;
import com.guitarapp.security.AuthenticatedUser;
import com.guitarapp.service.SubscriptionService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Authenticated read-only subscription status. Not permit-listed, so an unauthenticated
 * call yields the {@code RestAuthenticationEntryPoint} 401 envelope.
 */
@RestController
@RequestMapping("/api/v1/subscriptions")
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    public SubscriptionController(SubscriptionService subscriptionService) {
        this.subscriptionService = subscriptionService;
    }

    @GetMapping("/me")
    public SubscriptionResponseDto me(Authentication authentication) {
        return subscriptionService.getForUser(AuthenticatedUser.id(authentication));
    }
}
