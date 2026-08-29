package com.guitarapp.controller;

import com.guitarapp.model.User;
import com.guitarapp.security.JwtService;
import com.guitarapp.support.WebMockTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInfo;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;

import java.util.Optional;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.emptyString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Exercises the real AuthController + AuthService against a mocked UserRepository.
 * (UserRepository is an interface so it mocks cleanly on the Java 25 test JVM; the
 * concrete service is used directly rather than mocked.)
 */
class AuthControllerTest extends WebMockTestBase {

    /**
     * Each test gets a unique client IP so the Bucket4j rate-limit bucket
     * (keyed by IP, persisted in the shared Spring context) cannot leak
     * between tests and produce stray 429s.
     */
    private String IP;

    @BeforeEach
    void assignUniqueIp(TestInfo info) {
        // Hash the test display name to a deterministic /24 in TEST-NET-3 (203.0.113.0/24, RFC 5737).
        int suffix = Math.floorMod(info.getDisplayName().hashCode(), 250) + 1;
        IP = "203.0.113." + suffix;
    }

    @Autowired
    private JwtService jwtService;

    private User existingUser(long id, int tokenVersion) {
        User user = User.builder()
                .email("alice@example.com")
                .name("Alice")
                .tokenVersion(tokenVersion)
                .build();
        user.setId(id);
        return user;
    }

    @Test
    void register_success_returns_token_and_sets_refresh_cookie() throws Exception {
        when(userRepository.existsByEmail("alice@example.com")).thenReturn(false);
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> {
            User saved = invocation.getArgument(0);
            saved.setId(1L);
            return saved;
        });

        mockMvc.perform(post("/api/v1/auth/register")
                        .header("X-Forwarded-For", IP)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"alice@example.com\",\"password\":\"password123\",\"name\":\"Alice\"}"))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.accessToken").value(not(emptyString())))
               .andExpect(jsonPath("$.user.email").value("alice@example.com"))
               .andExpect(jsonPath("$.user.name").value("Alice"))
               .andExpect(header().string("Set-Cookie", containsString("refresh_token=")))
               .andExpect(header().string("Set-Cookie", containsString("HttpOnly")));
    }

    @Test
    void register_duplicate_email_returns_409() throws Exception {
        when(userRepository.existsByEmail("taken@example.com")).thenReturn(true);

        mockMvc.perform(post("/api/v1/auth/register")
                        .header("X-Forwarded-For", IP)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"taken@example.com\",\"password\":\"password123\"}"))
               .andExpect(status().isConflict())
               .andExpect(jsonPath("$.error.code").value("EMAIL_ALREADY_EXISTS"))
               .andExpect(jsonPath("$.error.status").value(409));
    }

    @Test
    void register_concurrent_duplicate_db_violation_returns_409() throws Exception {
        // existsByEmail loses the race; the unique constraint fires at saveAndFlush.
        when(userRepository.existsByEmail("racy@example.com")).thenReturn(false);
        when(userRepository.saveAndFlush(any(User.class)))
                .thenThrow(new DataIntegrityViolationException("unique violation"));

        mockMvc.perform(post("/api/v1/auth/register")
                        .header("X-Forwarded-For", IP)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"racy@example.com\",\"password\":\"password123\"}"))
               .andExpect(status().isConflict())
               .andExpect(jsonPath("$.error.code").value("EMAIL_ALREADY_EXISTS"));
    }

    @Test
    void register_normalizes_email_case() throws Exception {
        // The @Email validator runs before normalization, so we can only assert
        // case-folding here (whitespace trim is exercised by a unit test of the
        // normalization helper if needed; @Email rejects surrounding whitespace).
        when(userRepository.existsByEmail("alice@example.com")).thenReturn(false);
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> {
            User saved = invocation.getArgument(0);
            saved.setId(1L);
            return saved;
        });

        mockMvc.perform(post("/api/v1/auth/register")
                        .header("X-Forwarded-For", IP)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"Alice@EXAMPLE.com\",\"password\":\"password123\"}"))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.user.email").value("alice@example.com"));

        verify(userRepository).existsByEmail("alice@example.com");
    }

    @Test
    void register_oversized_email_returns_400() throws Exception {
        String longEmail = "a".repeat(250) + "@x.io"; // 256 chars total
        String body = "{\"email\":\"" + longEmail + "\",\"password\":\"password123\"}";

        mockMvc.perform(post("/api/v1/auth/register")
                        .header("X-Forwarded-For", IP)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
               .andExpect(status().isBadRequest())
               .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    void register_invalid_input_returns_400_validation_error() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .header("X-Forwarded-For", IP)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"not-an-email\",\"password\":\"short\"}"))
               .andExpect(status().isBadRequest())
               .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    void login_invalid_credentials_returns_401() throws Exception {
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());

        mockMvc.perform(post("/api/v1/auth/login")
                        .header("X-Forwarded-For", IP)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"ghost@example.com\",\"password\":\"wrongpass\"}"))
               .andExpect(status().isUnauthorized())
               .andExpect(jsonPath("$.error.code").value("INVALID_CREDENTIALS"))
               .andExpect(jsonPath("$.error.status").value(401));
    }

    @Test
    void login_normalizes_email_when_looking_up_user() throws Exception {
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());

        mockMvc.perform(post("/api/v1/auth/login")
                        .header("X-Forwarded-For", IP)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"  Alice@EXAMPLE.com \",\"password\":\"whatever1\"}"))
               .andExpect(status().isUnauthorized());

        verify(userRepository).findByEmail("alice@example.com");
    }

    @Test
    void refresh_rotates_token_version_and_returns_new_access_token() throws Exception {
        User user = existingUser(7L, 0);
        String refreshToken = jwtService.generateRefreshToken(user);

        when(userRepository.findById(7L)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .header("X-Forwarded-For", IP)
                        .cookie(new jakarta.servlet.http.Cookie("refresh_token", refreshToken)))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.accessToken").value(not(emptyString())))
               .andExpect(cookie().exists("refresh_token"))
               .andExpect(cookie().httpOnly("refresh_token", true));

        // tokenVersion bumped to invalidate the just-used refresh token.
        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        org.assertj.core.api.Assertions.assertThat(captor.getValue().getTokenVersion()).isEqualTo(1);
    }

    @Test
    void refresh_with_stale_token_version_returns_401() throws Exception {
        User userInDb = existingUser(7L, 5);
        // Mint a refresh token claiming an older version (0) than the user currently holds (5).
        User stale = existingUser(7L, 0);
        String oldRefreshToken = jwtService.generateRefreshToken(stale);

        when(userRepository.findById(7L)).thenReturn(Optional.of(userInDb));

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .header("X-Forwarded-For", IP)
                        .cookie(new jakarta.servlet.http.Cookie("refresh_token", oldRefreshToken)))
               .andExpect(status().isUnauthorized())
               .andExpect(jsonPath("$.error.code").value("INVALID_REFRESH_TOKEN"));

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void refresh_with_missing_cookie_returns_401() throws Exception {
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .header("X-Forwarded-For", IP))
               .andExpect(status().isUnauthorized())
               .andExpect(jsonPath("$.error.code").value("INVALID_REFRESH_TOKEN"));
    }

    @Test
    void refresh_with_access_token_returns_401_not_500() throws Exception {
        // Access tokens carry no tokenVersion claim; using one as a refresh cookie must
        // map to INVALID_REFRESH_TOKEN, not bubble out as an NPE/500. (Patch 1 regression.)
        User user = existingUser(7L, 0);
        String accessToken = jwtService.generateAccessToken(user);

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .header("X-Forwarded-For", IP)
                        .cookie(new jakarta.servlet.http.Cookie("refresh_token", accessToken)))
               .andExpect(status().isUnauthorized())
               .andExpect(jsonPath("$.error.code").value("INVALID_REFRESH_TOKEN"));
    }

    @Test
    void logout_invalidates_token_version_and_clears_cookie() throws Exception {
        User user = existingUser(9L, 4);
        String refreshToken = jwtService.generateRefreshToken(user);

        when(userRepository.findById(9L)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(post("/api/v1/auth/logout")
                        .header("X-Forwarded-For", IP)
                        .cookie(new jakarta.servlet.http.Cookie("refresh_token", refreshToken)))
               .andExpect(status().isNoContent())
               .andExpect(header().string("Set-Cookie", containsString("refresh_token=")))
               .andExpect(header().string("Set-Cookie", containsString("Max-Age=0")));

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        org.assertj.core.api.Assertions.assertThat(captor.getValue().getTokenVersion()).isEqualTo(5);
    }

    @Test
    void logout_is_idempotent_when_already_logged_out() throws Exception {
        // No cookie at all → should still return 204 and clear cookie, never touch the DB.
        mockMvc.perform(post("/api/v1/auth/logout")
                        .header("X-Forwarded-For", IP))
               .andExpect(status().isNoContent())
               .andExpect(header().string("Set-Cookie", containsString("Max-Age=0")));

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void logout_with_access_token_is_idempotent_not_500() throws Exception {
        // Access-token-shaped JWT carries no tokenVersion claim — logout must swallow the
        // exception and stay idempotent (204), not surface a 500. (Patch 1 regression.)
        User user = existingUser(11L, 0);
        String accessToken = jwtService.generateAccessToken(user);

        mockMvc.perform(post("/api/v1/auth/logout")
                        .header("X-Forwarded-For", IP)
                        .cookie(new jakarta.servlet.http.Cookie("refresh_token", accessToken)))
               .andExpect(status().isNoContent());

        verify(userRepository, never()).save(any(User.class));
    }
}
