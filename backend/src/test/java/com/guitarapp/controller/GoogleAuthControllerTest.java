package com.guitarapp.controller;

import com.guitarapp.exception.AuthException;
import com.guitarapp.model.User;
import com.guitarapp.security.GoogleTokenClaims;
import com.guitarapp.security.GoogleTokenVerifier;
import com.guitarapp.support.WebMockTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInfo;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.Optional;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.emptyString;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Exercises the real AuthController + AuthService for Google sign-in, against a mocked
 * UserRepository and a mocked {@link GoogleTokenVerifier} (an interface, so it mocks
 * cleanly on the Java 25 test JVM). The verifier mock lives here, not in the base class —
 * only Google auth tests need it.
 */
class GoogleAuthControllerTest extends WebMockTestBase {

    @MockitoBean
    private GoogleTokenVerifier googleTokenVerifier;

    /** Unique per-test client IP so the shared rate-limit buckets don't leak across tests. */
    private String IP;

    @BeforeEach
    void assignUniqueIp(TestInfo info) {
        int suffix = Math.floorMod(info.getDisplayName().hashCode(), 250) + 1;
        IP = "203.0.113." + suffix;
    }

    private static final String ID_TOKEN = "a-google-id-token";
    private static final String GOOGLE_SUB = "google-sub-123";

    private GoogleTokenClaims claims(boolean emailVerified) {
        return new GoogleTokenClaims(GOOGLE_SUB, "guser@example.com", "Google User", emailVerified);
    }

    private User userWith(long id, String email, String googleId) {
        User user = User.builder().email(email).googleId(googleId).name("Google User").build();
        user.setId(id);
        return user;
    }

    private org.springframework.test.web.servlet.ResultActions postGoogle(String idTokenJsonValue) throws Exception {
        return mockMvc.perform(post("/api/v1/auth/google")
                .header("X-Forwarded-For", IP)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"idToken\":" + idTokenJsonValue + "}"));
    }

    @Test
    void new_google_user_creates_account_and_returns_token_and_cookie() throws Exception {
        when(googleTokenVerifier.verify(ID_TOKEN)).thenReturn(claims(true));
        when(userRepository.findByGoogleId(GOOGLE_SUB)).thenReturn(Optional.empty());
        when(userRepository.findByEmail("guser@example.com")).thenReturn(Optional.empty());
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> {
            User saved = invocation.getArgument(0);
            saved.setId(1L);
            return saved;
        });

        postGoogle("\"" + ID_TOKEN + "\"")
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.accessToken").value(not(emptyString())))
               .andExpect(jsonPath("$.user.email").value("guser@example.com"))
               .andExpect(jsonPath("$.user.name").value("Google User"))
               .andExpect(header().string("Set-Cookie", containsString("refresh_token=")))
               .andExpect(header().string("Set-Cookie", containsString("HttpOnly")));

        // New account persisted with the google_id populated.
        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).saveAndFlush(captor.capture());
        org.assertj.core.api.Assertions.assertThat(captor.getValue().getGoogleId()).isEqualTo(GOOGLE_SUB);
    }

    @Test
    void existing_google_id_logs_in_without_creating_a_row() throws Exception {
        when(googleTokenVerifier.verify(ID_TOKEN)).thenReturn(claims(true));
        when(userRepository.findByGoogleId(GOOGLE_SUB))
                .thenReturn(Optional.of(userWith(7L, "guser@example.com", GOOGLE_SUB)));

        postGoogle("\"" + ID_TOKEN + "\"")
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.accessToken").value(not(emptyString())))
               .andExpect(jsonPath("$.user.email").value("guser@example.com"));

        verify(userRepository, never()).save(any(User.class));
        verify(userRepository, never()).saveAndFlush(any(User.class));
    }

    @Test
    void existing_email_links_google_id_and_logs_in() throws Exception {
        // User previously registered via email/password (no google_id yet).
        User emailUser = userWith(9L, "guser@example.com", null);
        when(googleTokenVerifier.verify(ID_TOKEN)).thenReturn(claims(true));
        when(userRepository.findByGoogleId(GOOGLE_SUB)).thenReturn(Optional.empty());
        when(userRepository.findByEmail("guser@example.com")).thenReturn(Optional.of(emailUser));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        postGoogle("\"" + ID_TOKEN + "\"")
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.accessToken").value(not(emptyString())));

        // google_id linked to the existing row; no new account created.
        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        org.assertj.core.api.Assertions.assertThat(captor.getValue().getGoogleId()).isEqualTo(GOOGLE_SUB);
        verify(userRepository, never()).saveAndFlush(any(User.class));
    }

    @Test
    void invalid_token_returns_401_error_envelope() throws Exception {
        when(googleTokenVerifier.verify(anyString())).thenThrow(AuthException.invalidGoogleToken());

        postGoogle("\"bad-token\"")
               .andExpect(status().isUnauthorized())
               .andExpect(jsonPath("$.error.code").value("INVALID_GOOGLE_TOKEN"))
               .andExpect(jsonPath("$.error.status").value(401));

        verify(userRepository, never()).save(any(User.class));
        verify(userRepository, never()).saveAndFlush(any(User.class));
    }

    @Test
    void unverified_email_returns_401_invalid_google_token() throws Exception {
        when(googleTokenVerifier.verify(ID_TOKEN)).thenReturn(claims(false));

        postGoogle("\"" + ID_TOKEN + "\"")
               .andExpect(status().isUnauthorized())
               .andExpect(jsonPath("$.error.code").value("INVALID_GOOGLE_TOKEN"));

        verify(userRepository, never()).save(any(User.class));
        verify(userRepository, never()).saveAndFlush(any(User.class));
    }

    @Test
    void blank_id_token_returns_400_validation_error() throws Exception {
        postGoogle("\"\"")
               .andExpect(status().isBadRequest())
               .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));

        verify(googleTokenVerifier, never()).verify(anyString());
    }

    @Test
    void missing_id_token_field_returns_400_validation_error() throws Exception {
        mockMvc.perform(post("/api/v1/auth/google")
                        .header("X-Forwarded-For", IP)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
               .andExpect(status().isBadRequest())
               .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));

        verify(googleTokenVerifier, never()).verify(anyString());
    }

    @Test
    void verified_token_with_null_email_returns_401_invalid_google_token() throws Exception {
        // email_verified=true but no email claim (e.g. the email scope was never granted):
        // reject as INVALID_GOOGLE_TOKEN rather than creating an email-less account (→ 500).
        when(googleTokenVerifier.verify(ID_TOKEN))
                .thenReturn(new GoogleTokenClaims(GOOGLE_SUB, null, "Google User", true));

        postGoogle("\"" + ID_TOKEN + "\"")
               .andExpect(status().isUnauthorized())
               .andExpect(jsonPath("$.error.code").value("INVALID_GOOGLE_TOKEN"));

        verify(userRepository, never()).save(any(User.class));
        verify(userRepository, never()).saveAndFlush(any(User.class));
    }

    @Test
    void email_row_already_linked_to_different_google_id_logs_in_without_overwriting() throws Exception {
        // The email account is already bound to another Google identity; a different sub sharing
        // the same verified email logs in by email but must NOT clobber the stored google_id.
        User linkedUser = userWith(11L, "guser@example.com", "other-google-sub-999");
        when(googleTokenVerifier.verify(ID_TOKEN)).thenReturn(claims(true));
        when(userRepository.findByGoogleId(GOOGLE_SUB)).thenReturn(Optional.empty());
        when(userRepository.findByEmail("guser@example.com")).thenReturn(Optional.of(linkedUser));

        postGoogle("\"" + ID_TOKEN + "\"")
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.accessToken").value(not(emptyString())))
               .andExpect(jsonPath("$.user.email").value("guser@example.com"));

        // No overwrite, no new row: the existing google_id is left intact.
        org.assertj.core.api.Assertions.assertThat(linkedUser.getGoogleId()).isEqualTo("other-google-sub-999");
        verify(userRepository, never()).save(any(User.class));
        verify(userRepository, never()).saveAndFlush(any(User.class));
    }

    @Test
    void concurrent_new_google_user_db_violation_returns_409_not_500() throws Exception {
        // Two first-time sign-ins with the same new token race: both find nothing, both insert,
        // the loser hits the unique constraint. It must surface as 409, not a 500.
        when(googleTokenVerifier.verify(ID_TOKEN)).thenReturn(claims(true));
        when(userRepository.findByGoogleId(GOOGLE_SUB)).thenReturn(Optional.empty());
        when(userRepository.findByEmail("guser@example.com")).thenReturn(Optional.empty());
        when(userRepository.saveAndFlush(any(User.class)))
                .thenThrow(new DataIntegrityViolationException("duplicate key"));

        postGoogle("\"" + ID_TOKEN + "\"")
               .andExpect(status().isConflict())
               .andExpect(jsonPath("$.error.code").value("GOOGLE_ACCOUNT_CONFLICT"))
               .andExpect(jsonPath("$.error.status").value(409));
    }
}
