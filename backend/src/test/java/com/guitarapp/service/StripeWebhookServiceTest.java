package com.guitarapp.service;

import com.guitarapp.model.ProcessedStripeEvent;
import com.guitarapp.model.Subscription;
import com.guitarapp.model.User;
import com.guitarapp.repository.ProcessedStripeEventRepository;
import com.guitarapp.repository.SubscriptionRepository;
import com.guitarapp.repository.UserRepository;
import com.guitarapp.security.StripeGateway;
import com.guitarapp.security.StripeSubscriptionSnapshot;
import com.stripe.model.Event;
import com.stripe.net.ApiResource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Pure unit test — no Spring context. Stripe SDK objects ({@link Event} and its nested
 * data object) are real instances built via {@code ApiResource.GSON.fromJson(...)}, not
 * mocked (they're plain data holders once deserialized); only {@link StripeGateway} (an
 * interface, the network-calling boundary) is mocked.
 */
class StripeWebhookServiceTest {

    private SubscriptionRepository subscriptionRepository;
    private UserRepository userRepository;
    private ProcessedStripeEventRepository processedStripeEventRepository;
    private StripeGateway stripeGateway;
    private StripeWebhookService service;

    @BeforeEach
    void setUp() {
        subscriptionRepository = mock(SubscriptionRepository.class);
        userRepository = mock(UserRepository.class);
        processedStripeEventRepository = mock(ProcessedStripeEventRepository.class);
        stripeGateway = mock(StripeGateway.class);
        service = new StripeWebhookService(subscriptionRepository, userRepository, processedStripeEventRepository, stripeGateway);
    }

    private static Event eventFromJson(String json) {
        return ApiResource.GSON.fromJson(json, Event.class);
    }

    @Test
    void checkoutSessionCompleted_noExistingRow_createsActiveSubscription() {
        Event event = eventFromJson("""
            {
              "id": "evt_1",
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
        when(processedStripeEventRepository.existsById("evt_1")).thenReturn(false);
        when(subscriptionRepository.findByUserId(42L)).thenReturn(Optional.empty());
        User user = User.builder().email("a@example.com").build();
        user.setId(42L);
        when(userRepository.getReferenceById(42L)).thenReturn(user);
        OffsetDateTime periodEnd = OffsetDateTime.of(2027, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC);
        when(stripeGateway.retrieveSubscription("sub_123"))
                .thenReturn(new StripeSubscriptionSnapshot("sub_123", "cus_123", "active", periodEnd));

        service.process(event);

        ArgumentCaptor<Subscription> captor = ArgumentCaptor.forClass(Subscription.class);
        verify(subscriptionRepository).save(captor.capture());
        Subscription saved = captor.getValue();
        assertThat(saved.getStatus()).isEqualTo("ACTIVE");
        assertThat(saved.getStripeCustomerId()).isEqualTo("cus_123");
        assertThat(saved.getStripeSubscriptionId()).isEqualTo("sub_123");
        assertThat(saved.getCurrentPeriodEnd()).isEqualTo(periodEnd);
        verify(processedStripeEventRepository).saveAndFlush(any(ProcessedStripeEvent.class));
    }

    @Test
    void subscriptionUpdated_activeStatus_setsActive() {
        Event event = eventFromJson("""
            {
              "id": "evt_2",
              "object": "event",
              "type": "customer.subscription.updated",
              "data": { "object": { "id": "sub_123", "object": "subscription" }}
            }
            """);
        when(processedStripeEventRepository.existsById("evt_2")).thenReturn(false);
        Subscription existing = Subscription.builder().status("ACTIVE").build();
        when(subscriptionRepository.findByStripeSubscriptionId("sub_123")).thenReturn(Optional.of(existing));
        OffsetDateTime periodEnd = OffsetDateTime.of(2027, 2, 1, 0, 0, 0, 0, ZoneOffset.UTC);
        when(stripeGateway.retrieveSubscription("sub_123"))
                .thenReturn(new StripeSubscriptionSnapshot("sub_123", "cus_123", "active", periodEnd));

        service.process(event);

        assertThat(existing.getStatus()).isEqualTo("ACTIVE");
        assertThat(existing.getCurrentPeriodEnd()).isEqualTo(periodEnd);
        verify(subscriptionRepository).save(existing);
    }

    @Test
    void subscriptionUpdated_canceledStatus_setsExpired() {
        Event event = eventFromJson("""
            {
              "id": "evt_3",
              "object": "event",
              "type": "customer.subscription.updated",
              "data": { "object": { "id": "sub_123", "object": "subscription" }}
            }
            """);
        when(processedStripeEventRepository.existsById("evt_3")).thenReturn(false);
        Subscription existing = Subscription.builder().status("ACTIVE").build();
        when(subscriptionRepository.findByStripeSubscriptionId("sub_123")).thenReturn(Optional.of(existing));
        when(stripeGateway.retrieveSubscription("sub_123"))
                .thenReturn(new StripeSubscriptionSnapshot("sub_123", "cus_123", "canceled", null));

        service.process(event);

        assertThat(existing.getStatus()).isEqualTo("EXPIRED");
    }

    @Test
    void subscriptionDeleted_setsExpired() {
        Event event = eventFromJson("""
            {
              "id": "evt_4",
              "object": "event",
              "type": "customer.subscription.deleted",
              "data": { "object": { "id": "sub_123", "object": "subscription" }}
            }
            """);
        when(processedStripeEventRepository.existsById("evt_4")).thenReturn(false);
        Subscription existing = Subscription.builder().status("ACTIVE").build();
        when(subscriptionRepository.findByStripeSubscriptionId("sub_123")).thenReturn(Optional.of(existing));
        when(stripeGateway.retrieveSubscription("sub_123"))
                .thenReturn(new StripeSubscriptionSnapshot("sub_123", "cus_123", "canceled", null));

        service.process(event);

        assertThat(existing.getStatus()).isEqualTo("EXPIRED");
    }

    @Test
    void subscriptionUpdated_noMatchingRow_isSkippedWithoutError() {
        Event event = eventFromJson("""
            {
              "id": "evt_5",
              "object": "event",
              "type": "customer.subscription.updated",
              "data": { "object": { "id": "sub_unknown", "object": "subscription" }}
            }
            """);
        when(processedStripeEventRepository.existsById("evt_5")).thenReturn(false);
        when(subscriptionRepository.findByStripeSubscriptionId("sub_unknown")).thenReturn(Optional.empty());

        service.process(event);

        verify(subscriptionRepository, never()).save(any());
        verify(stripeGateway, never()).retrieveSubscription(any());
        // Still recorded as processed — a missing row is a data-consistency warning, not a retry-worthy failure.
        verify(processedStripeEventRepository).saveAndFlush(any(ProcessedStripeEvent.class));
    }

    @Test
    void duplicateEventId_isANoOp() {
        Event event = eventFromJson("""
            {
              "id": "evt_1",
              "object": "event",
              "type": "checkout.session.completed",
              "data": { "object": { "id": "cs_test_1", "object": "checkout.session", "client_reference_id": "42" }}
            }
            """);
        when(processedStripeEventRepository.existsById("evt_1")).thenReturn(true);

        service.process(event);

        verifyNoInteractions(subscriptionRepository, userRepository, stripeGateway);
        verify(processedStripeEventRepository, never()).saveAndFlush(any());
    }

    @Test
    void unhandledEventType_isIgnored() {
        Event event = eventFromJson("""
            {
              "id": "evt_6",
              "object": "event",
              "type": "invoice.paid",
              "data": { "object": { "id": "in_1", "object": "invoice" }}
            }
            """);
        when(processedStripeEventRepository.existsById("evt_6")).thenReturn(false);

        service.process(event);

        verifyNoInteractions(subscriptionRepository, userRepository, stripeGateway);
        verify(processedStripeEventRepository).saveAndFlush(any(ProcessedStripeEvent.class));
    }
}
