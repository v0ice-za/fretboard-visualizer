package com.guitarapp.security;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.client.json.webtoken.JsonWebSignature;
import com.guitarapp.exception.AuthException;
import org.junit.jupiter.api.Test;

import java.security.GeneralSecurityException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit test for the verifier wrapping logic. {@link GoogleIdTokenVerifier} is a concrete
 * class (unmockable on the Java 25 test JVM), so we inject an anonymous subclass as a test
 * double via {@link GoogleTokenVerifierImpl}'s package-private constructor.
 */
class GoogleTokenVerifierImplTest {

    private static GoogleIdTokenVerifier stubReturning(GoogleIdToken token) {
        return new GoogleIdTokenVerifier(new NetHttpTransport(), GsonFactory.getDefaultInstance()) {
            @Override
            public GoogleIdToken verify(String idTokenString) {
                return token;
            }
        };
    }

    private static GoogleIdTokenVerifier stubThrowing() {
        return new GoogleIdTokenVerifier(new NetHttpTransport(), GsonFactory.getDefaultInstance()) {
            @Override
            public GoogleIdToken verify(String idTokenString) throws GeneralSecurityException {
                throw new GeneralSecurityException("simulated verification failure");
            }
        };
    }

    private static GoogleIdTokenVerifier stubThrowingIllegalArgument() {
        return new GoogleIdTokenVerifier(new NetHttpTransport(), GsonFactory.getDefaultInstance()) {
            @Override
            public GoogleIdToken verify(String idTokenString) {
                // Mirrors the real JWS parser rejecting a structurally malformed token.
                throw new IllegalArgumentException("Expected JWS or JWE, not a valid token");
            }
        };
    }

    private static GoogleIdToken tokenWith(String sub, String email, String name, boolean emailVerified) {
        GoogleIdToken.Payload payload = new GoogleIdToken.Payload();
        payload.setSubject(sub);
        payload.setEmail(email);
        payload.set("name", name);
        payload.setEmailVerified(emailVerified);
        return new GoogleIdToken(new JsonWebSignature.Header(), payload, new byte[0], new byte[0]);
    }

    @Test
    void valid_token_maps_to_claims() {
        GoogleTokenVerifierImpl impl = new GoogleTokenVerifierImpl(
                stubReturning(tokenWith("sub-1", "a@example.com", "Alice", true)));

        GoogleTokenClaims claims = impl.verify("token");

        assertThat(claims.googleId()).isEqualTo("sub-1");
        assertThat(claims.email()).isEqualTo("a@example.com");
        assertThat(claims.name()).isEqualTo("Alice");
        assertThat(claims.emailVerified()).isTrue();
    }

    @Test
    void unverified_email_is_reported_faithfully() {
        // The impl reports emailVerified as-is; the service is what rejects unverified emails.
        GoogleTokenVerifierImpl impl = new GoogleTokenVerifierImpl(
                stubReturning(tokenWith("sub-2", "b@example.com", "Bob", false)));

        GoogleTokenClaims claims = impl.verify("token");

        assertThat(claims.emailVerified()).isFalse();
    }

    @Test
    void null_result_throws_invalid_google_token() {
        GoogleTokenVerifierImpl impl = new GoogleTokenVerifierImpl(stubReturning(null));

        assertThatThrownBy(() -> impl.verify("token"))
                .isInstanceOf(AuthException.class)
                .hasFieldOrPropertyWithValue("code", "INVALID_GOOGLE_TOKEN");
    }

    @Test
    void security_exception_throws_invalid_google_token() {
        GoogleTokenVerifierImpl impl = new GoogleTokenVerifierImpl(stubThrowing());

        assertThatThrownBy(() -> impl.verify("token"))
                .isInstanceOf(AuthException.class)
                .hasFieldOrPropertyWithValue("code", "INVALID_GOOGLE_TOKEN");
    }

    @Test
    void non_string_name_claim_maps_to_null_instead_of_throwing() {
        // Defense-in-depth: a validly-signed token with a malformed 'name' claim type (e.g. a
        // number) must not blow up with an unhandled ClassCastException.
        GoogleIdToken.Payload payload = new GoogleIdToken.Payload();
        payload.setSubject("sub-3");
        payload.setEmail("c@example.com");
        payload.set("name", 12345); // not a String
        payload.setEmailVerified(true);
        GoogleIdToken token = new GoogleIdToken(new JsonWebSignature.Header(), payload, new byte[0], new byte[0]);
        GoogleTokenVerifierImpl impl = new GoogleTokenVerifierImpl(stubReturning(token));

        GoogleTokenClaims claims = impl.verify("token");

        assertThat(claims.name()).isNull();
        assertThat(claims.googleId()).isEqualTo("sub-3");
    }

    @Test
    void malformed_token_illegal_argument_throws_invalid_google_token() {
        // A structurally malformed token makes GoogleIdTokenVerifier's JWS parser throw an
        // unchecked IllegalArgumentException; it must surface as 401 INVALID_GOOGLE_TOKEN, not 500.
        GoogleTokenVerifierImpl impl = new GoogleTokenVerifierImpl(stubThrowingIllegalArgument());

        assertThatThrownBy(() -> impl.verify("not.a.valid.jwt"))
                .isInstanceOf(AuthException.class)
                .hasFieldOrPropertyWithValue("code", "INVALID_GOOGLE_TOKEN");
    }
}
