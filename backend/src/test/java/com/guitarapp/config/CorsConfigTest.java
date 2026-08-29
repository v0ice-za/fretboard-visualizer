package com.guitarapp.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CorsConfigTest {

    @Test
    void whitespaceAroundOrigins_isTrimmedSoTheOriginStillMatches() {
        // A common env-var formatting habit ("a.com, b.com") would otherwise leave a leading
        // space on the second origin, which then never matches a real Origin header.
        CorsConfig config = new CorsConfig(List.of("http://localhost:5173", " https://app.example.com "));
        CorsConfigurationSource source = config.corsConfigurationSource();

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Origin", "https://app.example.com");
        CorsConfiguration resolved = source.getCorsConfiguration(request);

        assertThat(resolved).isNotNull();
        assertThat(resolved.getAllowedOrigins()).contains("https://app.example.com");
    }
}
