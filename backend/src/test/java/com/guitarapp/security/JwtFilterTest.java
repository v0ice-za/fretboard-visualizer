package com.guitarapp.security;

import com.guitarapp.model.User;
import com.guitarapp.support.WebMockTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;

import java.util.Optional;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Exercises the JwtFilter + entry-point round-trip through the protected /users/me route (AC5, AC7). */
class JwtFilterTest extends WebMockTestBase {

    @Autowired
    private JwtService jwtService;

    private User existingUser() {
        User user = User.builder().email("alice@example.com").name("Alice").tokenVersion(0).build();
        user.setId(7L);
        return user;
    }

    @Test
    void valid_bearer_token_reaches_protected_route() throws Exception {
        User user = existingUser();
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));
        String token = jwtService.generateAccessToken(user);

        mockMvc.perform(get("/api/v1/users/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.id").value(7))
               .andExpect(jsonPath("$.email").value("alice@example.com"))
               .andExpect(jsonPath("$.name").value("Alice"));
    }

    @Test
    void missing_token_returns_401_envelope() throws Exception {
        mockMvc.perform(get("/api/v1/users/me"))
               .andExpect(status().isUnauthorized())
               .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"))
               .andExpect(jsonPath("$.error.status").value(401));
    }

    @Test
    void invalid_token_returns_401_envelope() throws Exception {
        mockMvc.perform(get("/api/v1/users/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer not.a.valid.token"))
               .andExpect(status().isUnauthorized())
               .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
    }
}
