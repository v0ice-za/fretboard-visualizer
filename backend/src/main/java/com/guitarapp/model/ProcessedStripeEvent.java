package com.guitarapp.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;

/** Idempotency ledger row — one per successfully processed Stripe webhook event ID. */
@Entity
@Table(name = "processed_stripe_events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProcessedStripeEvent {

    @Id
    private String stripeEventId;

    @Column(nullable = false)
    private String eventType;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private OffsetDateTime processedAt;
}
