package com.guitarapp.security;

import org.springframework.security.core.Authentication;

/**
 * Small helper for the repeated principal → user-id unwrap. {@link JwtFilter} sets the
 * authentication principal to the {@code Long} user id, so authenticated controllers read it
 * back through here rather than each repeating the unchecked cast.
 */
public final class AuthenticatedUser {

    private AuthenticatedUser() {
    }

    public static Long id(Authentication authentication) {
        return (Long) authentication.getPrincipal();
    }
}
