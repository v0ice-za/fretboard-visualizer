package com.guitarapp.security;

import com.guitarapp.exception.AuthException;

/**
 * Verifies a raw Google ID token and extracts its trusted claims.
 *
 * <p>Declared as an interface (not a concrete class) so it mocks cleanly on the Java 25
 * test JVM, where Byte Buddy cannot subclass concrete classes.
 */
public interface GoogleTokenVerifier {

    /**
     * @param idToken the raw Google ID token (a JWT)
     * @return the verified claims
     * @throws AuthException {@code INVALID_GOOGLE_TOKEN} if the token is invalid, expired, or malformed
     */
    GoogleTokenClaims verify(String idToken) throws AuthException;
}
