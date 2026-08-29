package com.guitarapp.exception;

import org.springframework.http.HttpStatus;

/**
 * Authentication/authorization failures. Static factories keep the stable
 * error codes in one place. Note {@link #invalidCredentials()} is intentionally
 * identical for both unknown-email and wrong-password to prevent user enumeration.
 */
public class AuthException extends GuitarAppException {

    public AuthException(String code, String message, HttpStatus status) {
        super(code, message, status);
    }

    public static AuthException emailAlreadyExists() {
        return new AuthException("EMAIL_ALREADY_EXISTS", "An account with this email already exists.", HttpStatus.CONFLICT);
    }

    public static AuthException invalidCredentials() {
        return new AuthException("INVALID_CREDENTIALS", "Invalid email or password.", HttpStatus.UNAUTHORIZED);
    }

    public static AuthException invalidRefreshToken() {
        return new AuthException("INVALID_REFRESH_TOKEN", "Refresh token is missing, invalid, or expired.", HttpStatus.UNAUTHORIZED);
    }

    public static AuthException invalidGoogleToken() {
        return new AuthException("INVALID_GOOGLE_TOKEN", "Google ID token is invalid, expired, or unverified.", HttpStatus.UNAUTHORIZED);
    }

    /** Concurrent first-time Google sign-in lost the race to create the account — the row now exists; retry. */
    public static AuthException googleAccountConflict() {
        return new AuthException("GOOGLE_ACCOUNT_CONFLICT", "This account is being created by a concurrent sign-in; please retry.", HttpStatus.CONFLICT);
    }

    public static AuthException unauthorized() {
        return new AuthException("UNAUTHORIZED", "Authentication is required to access this resource.", HttpStatus.UNAUTHORIZED);
    }
}
