package com.guitarapp.security;

/**
 * The subset of verified Google ID-token claims the app consumes.
 *
 * @param googleId      the {@code sub} claim — Google's stable user identifier
 * @param email         the account email
 * @param name          display name (may be {@code null})
 * @param emailVerified whether Google has verified the email address
 */
public record GoogleTokenClaims(String googleId, String email, String name, boolean emailVerified) {
}
