package com.guitarapp.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/** A single freeform-marked fret/string pair, mirrors the frontend {@code FreeformMark} shape. */
public record FreeformMarkDto(
        @NotNull @Min(0) @Max(24) Integer fret,
        @NotNull @Min(0) @Max(5) Integer string) {
}
