package com.guitarapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Google sign-in payload: the raw ID token issued by Google Identity Services.
 * Google ID tokens are JWTs (~1-2 KB typically, but hosted-domain / long profile claims can
 * exceed 2 KB); {@code @Size(max=8192)} bounds abuse without rejecting valid tokens.
 */
public record GoogleAuthRequestDto(
        @NotBlank @Size(max = 8192) String idToken) {
}
