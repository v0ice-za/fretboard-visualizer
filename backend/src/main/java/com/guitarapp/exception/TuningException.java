package com.guitarapp.exception;

import org.springframework.http.HttpStatus;

/**
 * Custom-tuning management failures. Static factories keep the stable error codes
 * in one place (mirrors {@link AuthException}). Replaces the earlier fragile
 * message-based routing of {@code IllegalArgumentException}/{@code NoSuchElementException}
 * in {@link GlobalExceptionHandler} — these route through {@link #handleGuitarApp} by type.
 */
public class TuningException extends GuitarAppException {

    public TuningException(String code, String message, HttpStatus status) {
        super(code, message, status);
    }

    /** Caller attempted to modify/delete a tuning they do not own. */
    public static TuningException accessDenied() {
        return new TuningException("FORBIDDEN", "You do not have permission to modify this resource.",
                HttpStatus.FORBIDDEN);
    }

    /** No tuning exists with the requested id. */
    public static TuningException notFound() {
        return new TuningException("NOT_FOUND", "The requested resource was not found.", HttpStatus.NOT_FOUND);
    }
}
