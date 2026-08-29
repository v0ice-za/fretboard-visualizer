package com.guitarapp.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Email/password registration payload. {@code name} is optional (the column is nullable).
 */
public record RegisterRequestDto(
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Size(min = 8, max = 72, message = "must be between 8 and 72 characters") String password,
        @Size(max = 255) String name) {
}
