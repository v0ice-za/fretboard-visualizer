package com.guitarapp.dto;

import com.guitarapp.model.CustomTuning;

import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Read model for custom tunings. Enforces a DTO boundary — the {@link CustomTuning} entity is
 * never serialized, and {@link #from} deliberately does not touch {@code getUser()} (avoids the
 * lazy-init trap when serialized outside a transaction).
 *
 * @param createdAt ISO-8601 offset date-time string, or {@code null}
 */
public record TuningResponseDto(Long id, String name, List<String> strings, String createdAt) {

    public static TuningResponseDto from(CustomTuning tuning) {
        String created = tuning.getCreatedAt() == null
                ? null
                : tuning.getCreatedAt().format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
        return new TuningResponseDto(tuning.getId(), tuning.getName(), tuning.getStrings(), created);
    }
}
