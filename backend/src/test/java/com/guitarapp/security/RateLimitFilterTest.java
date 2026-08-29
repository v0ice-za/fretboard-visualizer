package com.guitarapp.security;

import com.guitarapp.support.WebMockTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Verifies the Bucket4j 10/min per-IP limit on /api/v1/auth/* (AC6). */
class RateLimitFilterTest extends WebMockTestBase {

    // Dedicated IP so this test's bucket is isolated from other tests sharing the context.
    private static final String IP = "203.0.113.200";

    @Test
    void eleventh_request_within_a_minute_is_rate_limited() throws Exception {
        // First 10 requests are allowed through (they fail auth with 401, which is fine).
        for (int i = 0; i < 10; i++) {
            mockMvc.perform(post("/api/v1/auth/login")
                            .header("X-Forwarded-For", IP)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"email\":\"nobody@example.com\",\"password\":\"whatever123\"}"))
                   .andExpect(status().isUnauthorized());
        }

        // The 11th is blocked by the limiter before reaching the controller.
        mockMvc.perform(post("/api/v1/auth/login")
                        .header("X-Forwarded-For", IP)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"nobody@example.com\",\"password\":\"whatever123\"}"))
               .andExpect(status().isTooManyRequests())
               .andExpect(jsonPath("$.error.code").value("RATE_LIMITED"))
               .andExpect(jsonPath("$.error.status").value(429));
    }
}
