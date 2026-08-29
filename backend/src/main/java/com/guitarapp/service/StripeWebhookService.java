package com.guitarapp.service;

import com.guitarapp.exception.PaymentException;
import com.guitarapp.model.ProcessedStripeEvent;
import com.guitarapp.model.Subscription;
import com.guitarapp.repository.ProcessedStripeEventRepository;
import com.guitarapp.repository.SubscriptionRepository;
import com.guitarapp.repository.UserRepository;
import com.guitarapp.security.StripeGateway;
import com.guitarapp.security.StripeSubscriptionSnapshot;
import com.stripe.exception.EventDataObjectDeserializationException;
import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.model.StripeObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Processes verified Stripe webhook events. Idempotent: a duplicate event ID is a no-op
 * (checked before any side effect). Only {@code checkout.session.completed} and
 * {@code customer.subscription.{updated,deleted}} are handled — other event types are
 * ignored, not errors (Stripe sends many event types we don't act on).
 */
@Service
public class StripeWebhookService {

    private static final Logger log = LoggerFactory.getLogger(StripeWebhookService.class);

    private static final String CHECKOUT_SESSION_COMPLETED = "checkout.session.completed";
    private static final String SUBSCRIPTION_UPDATED = "customer.subscription.updated";
    private static final String SUBSCRIPTION_DELETED = "customer.subscription.deleted";

    private final SubscriptionRepository subscriptionRepository;
    private final UserRepository userRepository;
    private final ProcessedStripeEventRepository processedStripeEventRepository;
    private final StripeGateway stripeGateway;

    public StripeWebhookService(SubscriptionRepository subscriptionRepository, UserRepository userRepository,
                                ProcessedStripeEventRepository processedStripeEventRepository,
                                StripeGateway stripeGateway) {
        this.subscriptionRepository = subscriptionRepository;
        this.userRepository = userRepository;
        this.processedStripeEventRepository = processedStripeEventRepository;
        this.stripeGateway = stripeGateway;
    }

    @Transactional
    public void process(Event event) {
        if (processedStripeEventRepository.existsById(event.getId())) {
            // Duplicate delivery (Stripe retry) — already applied, no side effect.
            return;
        }

        switch (event.getType()) {
            case CHECKOUT_SESSION_COMPLETED -> handleCheckoutCompleted(event);
            case SUBSCRIPTION_UPDATED, SUBSCRIPTION_DELETED -> handleSubscriptionChanged(event);
            default -> log.debug("Ignoring unhandled Stripe event type: {}", event.getType());
        }

        recordProcessed(event);
    }

    private void handleCheckoutCompleted(Event event) {
        com.stripe.model.checkout.Session session = (com.stripe.model.checkout.Session) deserialize(event);
        Long userId = Long.valueOf(session.getClientReferenceId());
        StripeSubscriptionSnapshot snapshot = stripeGateway.retrieveSubscription(session.getSubscription());

        Subscription subscription = subscriptionRepository.findByUserId(userId)
                .orElseGet(() -> Subscription.builder().user(userRepository.getReferenceById(userId)).build());
        subscription.setStripeCustomerId(snapshot.customerId());
        subscription.setStripeSubscriptionId(snapshot.subscriptionId());
        subscription.setStatus("ACTIVE");
        subscription.setCurrentPeriodEnd(snapshot.currentPeriodEnd());
        subscriptionRepository.save(subscription);
    }

    private void handleSubscriptionChanged(Event event) {
        com.stripe.model.Subscription stripeSubscription = (com.stripe.model.Subscription) deserialize(event);
        subscriptionRepository.findByStripeSubscriptionId(stripeSubscription.getId()).ifPresentOrElse(row -> {
            StripeSubscriptionSnapshot snapshot = stripeGateway.retrieveSubscription(stripeSubscription.getId());
            row.setStatus(mapStatus(snapshot.status()));
            row.setCurrentPeriodEnd(snapshot.currentPeriodEnd());
            subscriptionRepository.save(row);
        }, () -> log.warn("No subscription row found for stripeSubscriptionId={} on event type={}",
                stripeSubscription.getId(), event.getType()));
    }

    /** {@code active}/{@code trialing} are the only Stripe statuses that mean "premium access". */
    private String mapStatus(String stripeStatus) {
        return switch (stripeStatus) {
            case "active", "trialing" -> "ACTIVE";
            default -> "EXPIRED";
        };
    }

    /**
     * {@code getObject()} only returns a value when the event's {@code api_version} matches
     * the SDK's compiled-in version, and its version-comparison can itself throw (e.g. a
     * {@code NullPointerException} if {@code api_version} is absent) rather than just
     * returning empty — so its failure modes are swallowed here too, not just an empty
     * {@code Optional}, before falling back to the always-succeeds-or-throws unsafe path.
     */
    private StripeObject deserialize(Event event) {
        EventDataObjectDeserializer deserializer = event.getDataObjectDeserializer();
        try {
            Optional<StripeObject> object = deserializer.getObject();
            if (object.isPresent()) {
                return object.get();
            }
        } catch (RuntimeException e) {
            // Fall through to the unsafe path below.
        }
        try {
            return deserializer.deserializeUnsafe();
        } catch (EventDataObjectDeserializationException e) {
            throw PaymentException.checkoutFailed();
        }
    }

    private void recordProcessed(Event event) {
        try {
            processedStripeEventRepository.saveAndFlush(
                    ProcessedStripeEvent.builder().stripeEventId(event.getId()).eventType(event.getType()).build());
        } catch (DataIntegrityViolationException e) {
            // A concurrent duplicate delivery raced this insert — the other request's
            // (idempotent) domain write already applied; safe to ignore.
        }
    }
}
