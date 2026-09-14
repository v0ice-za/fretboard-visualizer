package com.guitarapp.dto;

import com.guitarapp.model.SavedSession;

import java.time.format.DateTimeFormatter;

/**
 * Read model for a saved session. Enforces a DTO boundary — the {@link SavedSession} entity is
 * never serialized, and {@link #from} deliberately does not touch {@code getUser()} (avoids the
 * lazy-init trap when serialized outside a transaction, same as {@code TuningResponseDto}).
 */
public record SessionResponseDto(Long id, SessionStateDto state, String updatedAt) {

    public static SessionResponseDto from(SavedSession session) {
        String updated = session.getUpdatedAt() == null
                ? null
                : session.getUpdatedAt().format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
        return new SessionResponseDto(session.getId(), session.getState(), updated);
    }
}
