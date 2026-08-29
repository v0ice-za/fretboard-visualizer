package com.guitarapp.dto;

import com.guitarapp.dto.validation.ValidBcryptLength;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Email/password registration payload. {@code name} is optional (the column is nullable).
 */
public record RegisterRequestDto(
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Size(min = 8, message = "must be at least 8 characters") @ValidBcryptLength String password,
        @Size(max = 255) String name) {
}
