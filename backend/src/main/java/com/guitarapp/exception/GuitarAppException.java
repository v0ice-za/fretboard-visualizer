package com.guitarapp.exception;

import org.springframework.http.HttpStatus;

/**
 * Base application exception. Every instance carries a stable SCREAMING_SNAKE_CASE
 * {@code code} (the frontend branches on this, not on the HTTP status) and the
 * {@link HttpStatus} to render. Handled centrally by {@link GlobalExceptionHandler}.
 */
public class GuitarAppException extends RuntimeException {

    private final String code;
    private final HttpStatus status;

    public GuitarAppException(String code, String message, HttpStatus status) {
        super(message);
        this.code = code;
        this.status = status;
    }

    public String getCode() {
        return code;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
