package com.guitarapp.controller;

import com.guitarapp.exception.PaymentException;
import com.guitarapp.model.User;
import com.guitarapp.security.JwtService;
import com.guitarapp.support.WebMockTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Exercises the real CheckoutController + service against a mocked UserRepository,
 * SubscriptionRepository, and StripeGateway (all interfaces — mock cleanly on the
 * Java 25 test JVM).
 */
class CheckoutControllerTest extends WebMockTestBase {

    @Autowired
    private JwtService jwtService;

    private String tokenForUser(long id) {
        User user = User.builder().email("alice@example.com").name("Alice").tokenVersion(0).build();
        user.setId(id);
        return jwtService.generateAccessToken(user, JwtService.ROLE_FREE);
    }

    @Test
    void session_authenticated_returnsCheckoutUrl() throws Exception {
        User user = User.builder().email("alice@example.com").build();
        user.setId(42L);
        when(userRepository.findById(42L)).thenReturn(java.util.Optional.of(user));
        when(subscriptionRepository.findByUserId(42L)).thenReturn(java.util.Optional.empty());
        when(stripeGateway.createCheckoutSession(eq(42L), eq("alice@example.com"), isNull()))
                .thenReturn("https://checkout.stripe.com/test-session");

        mockMvc.perform(post("/api/v1/checkout/session")
                        .header("Authorization", "Bearer " + tokenForUser(42L)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.url").value("https://checkout.stripe.com/test-session"));
    }

    @Test
    void session_unauthenticated_returns401Envelope() throws Exception {
        mockMvc.perform(post("/api/v1/checkout/session"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
    }

    @Test
    void session_stripeFailure_returns502Envelope() throws Exception {
        User user = User.builder().email("alice@example.com").build();
        user.setId(42L);
        when(userRepository.findById(42L)).thenReturn(java.util.Optional.of(user));
        when(subscriptionRepository.findByUserId(42L)).thenReturn(java.util.Optional.empty());
        when(stripeGateway.createCheckoutSession(anyLong(), any(), any())).thenThrow(PaymentException.checkoutFailed());

        mockMvc.perform(post("/api/v1/checkout/session")
                        .header("Authorization", "Bearer " + tokenForUser(42L)))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.error.code").value("CHECKOUT_SESSION_FAILED"));
    }
}
