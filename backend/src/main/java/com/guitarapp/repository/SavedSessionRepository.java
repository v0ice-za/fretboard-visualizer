package com.guitarapp.repository;

import com.guitarapp.model.SavedSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SavedSessionRepository extends JpaRepository<SavedSession, Long> {

    /** One row per user (see Story 4.4 Dev Notes — upsert, not history). */
    Optional<SavedSession> findByUserId(Long userId);
}
