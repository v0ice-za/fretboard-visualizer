package com.guitarapp.repository;

import com.guitarapp.model.Subscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {

    /** Navigates the {@code user} relation's id (Subscription.user.id) — one row per user. */
    Optional<Subscription> findByUserId(Long userId);
}
