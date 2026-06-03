package com.guitarapp.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "subscriptions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Subscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private String stripeCustomerId;

    @Column(unique = true)
    private String stripeSubscriptionId;

    @Column(nullable = false)
    private String status;

    private OffsetDateTime currentPeriodEnd;

    @Column(nullable = false)
    private OffsetDateTime createdAt;
}
