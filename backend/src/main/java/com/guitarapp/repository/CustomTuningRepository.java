package com.guitarapp.repository;

import com.guitarapp.model.CustomTuning;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CustomTuningRepository extends JpaRepository<CustomTuning, Long> {

    /** Navigates the {@code user} relation's id — a user's own tunings, oldest first. */
    List<CustomTuning> findByUserIdOrderByCreatedAtAsc(Long userId);
}
