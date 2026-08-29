package com.guitarapp.dto;

/** Response for {@code POST /api/v1/checkout/session} — the frontend redirects here. */
public record CheckoutSessionResponseDto(String url) {
}
