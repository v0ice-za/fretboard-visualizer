package com.guitarapp.dto;

/**
 * Standard API error envelope: {@code {"error":{"code","message","status"}}}.
 * The frontend branches on {@code code} (SCREAMING_SNAKE_CASE), never on status.
 */
public record ErrorResponse(ApiError error) {

    public record ApiError(String code, String message, int status) {
    }

    public static ErrorResponse of(String code, String message, int status) {
        return new ErrorResponse(new ApiError(code, message, status));
    }
}
