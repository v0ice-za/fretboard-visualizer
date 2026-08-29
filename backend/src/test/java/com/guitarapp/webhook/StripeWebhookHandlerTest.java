package com.guitarapp.webhook;

import com.guitarapp.exception.PaymentException;
import com.guitarapp.security.StripeSubscriptionSnapshot;
import com.guitarapp.support.WebMockTestBase;
import com.stripe.model.Event;
import com.stripe.net.ApiResource;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Exercises the real {@code StripeWebhookHandler} → {@code StripeWebhookService} pipeline
 * against mocked repositories/{@code StripeGateway} (all interfaces, inherited from
 * {@link WebMockTestBase} — {@code StripeWebhookService} itself is a concrete class and is
 * deliberately NOT mocked here, since Byte Buddy can't mock concrete classes on the Java 25
 * test JVM). Domain-logic edge cases (status mapping, idempotency) are covered in
 * {@code StripeWebhookServiceTest}; this test is about the HTTP-level wiring.
 */
class StripeWebhookHandlerTest extends WebMockTestBase {

    private static Event eventFromJson(String json) {
        return ApiResource.GSON.fromJson(json, Event.class);
    }

    @Test
    void validSignature_processesEventAndReturns200() throws Exception {
        Event event = eventFromJson("""
            {
              "id": "evt_test_123",
              "object": "event",
              "type": "customer.subscription.updated",
              "data": { "object": { "id": "sub_123", "object": "subscription" }}
            }
            """);
        when(stripeGateway.constructWebhookEvent(any(), any())).thenReturn(event);
        when(processedStripeEventRepository.existsById("evt_test_123")).thenReturn(false);
        when(subscriptionRepository.findByStripeSubscriptionId("sub_123")).thenReturn(Optional.empty());

        mockMvc.perform(post("/api/v1/webhooks/stripe")
                        .header("Stripe-Signature", "t=1,v1=validsig")
                        .contentType("application/json")
                        .content("{\"id\":\"evt_test_123\"}"))
                .andExpect(status().isOk());

        verify(processedStripeEventRepository).saveAndFlush(any());
    }

    @Test
    void checkoutSessionCompleted_activatesSubscriptionEndToEnd() throws Exception {
        Event event = eventFromJson("""
            {
              "id": "evt_test_789",
              "object": "event",
              "type": "checkout.session.completed",
              "data": { "object": {
                "id": "cs_test_1",
                "object": "checkout.session",
                "client_reference_id": "42",
                "customer": "cus_123",
                "subscription": "sub_123"
              }}
            }
            """);
        when(stripeGateway.constructWebhookEvent(any(), any())).thenReturn(event);
        when(processedStripeEventRepository.existsById("evt_test_789")).thenReturn(false);
        when(subscriptionRepository.findByUserId(42L)).thenReturn(Optional.empty());
        when(stripeGateway.retrieveSubscription("sub_123")).thenReturn(
                new StripeSubscriptionSnapshot("sub_123", "cus_123", "active",
                        OffsetDateTime.of(2027, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC)));

        mockMvc.perform(post("/api/v1/webhooks/stripe")
                        .header("Stripe-Signature", "t=1,v1=validsig")
                        .contentType("application/json")
                        .content("{\"id\":\"evt_test_789\"}"))
                .andExpect(status().isOk());

        verify(subscriptionRepository).save(any());
        verify(processedStripeEventRepository).saveAndFlush(any());
    }

    @Test
    void invalidSignature_returns400AndDoesNotProcess() throws Exception {
        when(stripeGateway.constructWebhookEvent(any(), any())).thenThrow(PaymentException.invalidSignature());

        mockMvc.perform(post("/api/v1/webhooks/stripe")
                        .header("Stripe-Signature", "t=1,v1=badsig")
                        .contentType("application/json")
                        .content("{\"id\":\"evt_test_123\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_STRIPE_SIGNATURE"));

        verify(processedStripeEventRepository, org.mockito.Mockito.never()).saveAndFlush(any());
    }

    @Test
    void noAuthRequired_endpointIsPermitAll() throws Exception {
        // No Authorization header at all — must not 401, since Stripe never sends a JWT.
        Event event = eventFromJson("""
            {
              "id": "evt_test_456",
              "object": "event",
              "type": "customer.subscription.updated",
              "data": { "object": { "id": "sub_unknown", "object": "subscription" }}
            }
            """);
        when(stripeGateway.constructWebhookEvent(any(), any())).thenReturn(event);
        when(processedStripeEventRepository.existsById("evt_test_456")).thenReturn(false);
        when(subscriptionRepository.findByStripeSubscriptionId("sub_unknown")).thenReturn(Optional.empty());

        mockMvc.perform(post("/api/v1/webhooks/stripe")
                        .header("Stripe-Signature", "t=1,v1=validsig")
                        .contentType("application/json")
                        .content("{\"id\":\"evt_test_456\"}"))
                .andExpect(status().isOk());
    }
}
