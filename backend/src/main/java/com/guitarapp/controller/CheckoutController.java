package com.guitarapp.controller;

import com.guitarapp.dto.CheckoutSessionResponseDto;
import com.guitarapp.security.AuthenticatedUser;
import com.guitarapp.service.CheckoutService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Authenticated Stripe Checkout session creation. Not permit-listed —
 * {@code anyRequest().authenticated()} covers it, same as {@code /subscriptions/me}.
 */
@RestController
@RequestMapping("/api/v1/checkout")
public class CheckoutController {

    private final CheckoutService checkoutService;

    public CheckoutController(CheckoutService checkoutService) {
        this.checkoutService = checkoutService;
    }

    @PostMapping("/session")
    public CheckoutSessionResponseDto session(Authentication authentication) {
        return checkoutService.createSession(AuthenticatedUser.id(authentication));
    }
}
