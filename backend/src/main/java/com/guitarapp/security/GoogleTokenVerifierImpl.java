package com.guitarapp.security;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.guitarapp.config.GoogleProperties;
import com.guitarapp.exception.AuthException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Collections;

/**
 * Verifies Google ID tokens against Google's JWKS using {@link GoogleIdTokenVerifier}.
 *
 * <p>The underlying {@link GoogleIdTokenVerifier} is built once (its public keys are
 * fetched from Google on first {@code verify()} and cached). It is held in a field so a
 * test double can be injected via the package-private constructor — the class is concrete
 * and therefore not mockable on the Java 25 test JVM.
 */
@Service
@Primary
public class GoogleTokenVerifierImpl implements GoogleTokenVerifier {

    private final GoogleIdTokenVerifier verifier;

    @Autowired
    public GoogleTokenVerifierImpl(GoogleProperties googleProperties) {
        this(new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
                .setAudience(Collections.singletonList(googleProperties.clientId()))
                .build());
    }

    /** Test seam: inject a pre-built (or subclassed) verifier. */
    GoogleTokenVerifierImpl(GoogleIdTokenVerifier verifier) {
        this.verifier = verifier;
    }

    @Override
    public GoogleTokenClaims verify(String idToken) throws AuthException {
        GoogleIdToken token;
        try {
            token = verifier.verify(idToken);
        } catch (GeneralSecurityException | IOException | IllegalArgumentException e) {
            // IllegalArgumentException: GoogleIdTokenVerifier.verify() → JWS parser rejects a
            // structurally malformed token (missing dots / non-base64 segments) with an
            // unchecked exception; map it to a 401 so AC1 ("malformed → 401") holds. Scoped to
            // just this call so an unrelated failure below isn't mislabeled as an invalid token.
            throw AuthException.invalidGoogleToken();
        }
        if (token == null) {
            throw AuthException.invalidGoogleToken();
        }
        GoogleIdToken.Payload payload = token.getPayload();
        Object nameClaim = payload.get("name");
        return new GoogleTokenClaims(
                payload.getSubject(),
                payload.getEmail(),
                nameClaim instanceof String s ? s : null,
                Boolean.TRUE.equals(payload.getEmailVerified()));
    }
}
