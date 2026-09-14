package com.guitarapp.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Fretboard state saved/restored for premium session persistence. Matches
 * {@code fretboardStore}'s existing shape (tuning, capoPosition, freeformMarks) exactly —
 * no new frontend fields introduced by this story. {@code capoPosition} mirrors the store's
 * own clamp (0-12); {@code freeformMarks} mirrors the store's own 150-entry cap.
 */
public record SessionStateDto(
        @NotBlank @Size(max = 255) String tuning,
        @NotNull @Min(0) @Max(12) Integer capoPosition,
        @NotNull @Size(max = 150) List<@Valid FreeformMarkDto> freeformMarks) {
}
