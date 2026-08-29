package com.guitarapp.dto;

/**
 * Response body for register/login/refresh. The refresh token is NOT in the body —
 * it is delivered as an httpOnly cookie by the controller.
 */
public record AuthResponseDto(String accessToken, UserResponseDto user) {
}
