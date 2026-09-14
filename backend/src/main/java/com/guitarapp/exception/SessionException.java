package com.guitarapp.exception;

import org.springframework.http.HttpStatus;

/**
 * Saved-session persistence failures. Static factories keep the stable error codes
 * in one place (mirrors {@link TuningException}). Routes through {@link GlobalExceptionHandler}
 * by type via the {@link GuitarAppException} handler — no new registration needed.
 */
public class SessionException extends GuitarAppException {

    public SessionException(String code, String message, HttpStatus status) {
        super(code, message, status);
    }

    /** Caller attempted to delete a session they do not own. */
    public static SessionException accessDenied() {
        return new SessionException("FORBIDDEN", "You do not have permission to modify this resource.",
                HttpStatus.FORBIDDEN);
    }

    /** No saved session exists with the requested id. */
    public static SessionException notFound() {
        return new SessionException("NOT_FOUND", "The requested resource was not found.", HttpStatus.NOT_FOUND);
    }
}
