package com.guitarapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Create-custom-tuning payload. {@code strings} is exactly 6 non-blank tokens ordered
 * low → high (e.g. {@code "E2"}). Per-note format is constrained by the frontend Select;
 * server validation here is shape/length (see Story 4.1 Q3 for the hardening follow-up).
 */
public record TuningRequestDto(
        @NotBlank @Size(max = 255) String name,
        @NotNull @Size(min = 6, max = 6, message = "must have exactly 6 strings")
        List<@NotBlank String> strings) {
}
