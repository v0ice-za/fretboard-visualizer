package com.guitarapp.controller;

import com.guitarapp.model.Subscription;
import com.guitarapp.model.User;
import com.guitarapp.security.JwtService;
import com.guitarapp.support.WebMockTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Exercises the real SubscriptionController + service against a mocked repository interface
 * (mocks cleanly on the Java 25 test JVM — the concrete Subscription entity is built, not mocked).
 */
class SubscriptionControllerTest extends WebMockTestBase {

    @Autowired
    private JwtService jwtService;

    // subscriptionRepository (@MockitoBean) is inherited from WebMockTestBase.

    private String tokenForUser(long id) {
        User user = User.builder().email("alice@example.com").name("Alice").tokenVersion(0).build();
        user.setId(id);
        return jwtService.generateAccessToken(user, JwtService.ROLE_FREE);
    }

    @Test
    void me_activeSubscription_returnsActiveStatusAndPeriodEnd() throws Exception {
        // Future period-end (expiry is now evaluated) → effective ACTIVE.
        OffsetDateTime periodEnd = OffsetDateTime.of(2030, 9, 1, 0, 0, 0, 0, ZoneOffset.UTC);
        Subscription sub = Subscription.builder().status("ACTIVE").currentPeriodEnd(periodEnd).build();
        when(subscriptionRepository.findByUserId(42L)).thenReturn(Optional.of(sub));

        mockMvc.perform(get("/api/v1/subscriptions/me")
                        .header("Authorization", "Bearer " + tokenForUser(42L)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.currentPeriodEnd").value("2030-09-01T00:00:00Z"));
    }

    @Test
    void me_lapsedActiveSubscription_returnsExpiredButKeepsPeriodEnd() throws Exception {
        // Stored ACTIVE but the period ended in the past → time-based lapse reports EXPIRED.
        OffsetDateTime periodEnd = OffsetDateTime.of(2020, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC);
        Subscription sub = Subscription.builder().status("ACTIVE").currentPeriodEnd(periodEnd).build();
        when(subscriptionRepository.findByUserId(43L)).thenReturn(Optional.of(sub));

        mockMvc.perform(get("/api/v1/subscriptions/me")
                        .header("Authorization", "Bearer " + tokenForUser(43L)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("EXPIRED"))
                .andExpect(jsonPath("$.currentPeriodEnd").value("2020-01-01T00:00:00Z"));
    }

    @Test
    void me_noSubscriptionRow_returnsNoneStatus() throws Exception {
        when(subscriptionRepository.findByUserId(7L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/subscriptions/me")
                        .header("Authorization", "Bearer " + tokenForUser(7L)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("NONE"))
                .andExpect(jsonPath("$.currentPeriodEnd").doesNotExist());
    }

    @Test
    void me_unauthenticated_returns401Envelope() throws Exception {
        mockMvc.perform(get("/api/v1/subscriptions/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
    }

    @Test
    void preflight_returnsCorsAllowHeaders() throws Exception {
        mockMvc.perform(options("/api/v1/subscriptions/me")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"))
                .andExpect(header().string("Access-Control-Allow-Credentials", "true"));
    }
}
