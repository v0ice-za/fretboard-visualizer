package com.guitarapp.dto;

import com.guitarapp.dto.validation.ValidBcryptLength;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequestDto(
        @NotBlank @Size(max = 255) String email,
        @NotBlank @ValidBcryptLength String password) {
}
