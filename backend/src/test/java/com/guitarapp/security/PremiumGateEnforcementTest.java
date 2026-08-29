package com.guitarapp.security;

import com.guitarapp.model.User;
import com.guitarapp.support.WebMockTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Import;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Proves the premium-gate enforcement mechanism (method security + role claim + 403 handler)
 * against a <em>test-only</em> {@code @PreAuthorize("hasRole('PREMIUM')")} endpoint. No production
 * premium endpoints exist yet (they are Epic 4); those will carry the same annotation. The
 * fixture controller is {@code @Import}ed — {@code src/test} controllers are not component-scanned
 * by {@code @SpringBootTest}.
 */
@Import(PremiumGateEnforcementTest.TestOnlyPremiumController.class)
class PremiumGateEnforcementTest extends WebMockTestBase {

    @Autowired
    private JwtService jwtService;

    private String token(long id, String role) {
        User user = User.builder().email("u@example.com").name("U").tokenVersion(0).build();
        user.setId(id);
        return jwtService.generateAccessToken(user, role);
    }

    @Test
    void premiumUser_reachesGatedEndpoint() throws Exception {
        mockMvc.perform(get("/api/v1/test-only/premium")
                        .header("Authorization", "Bearer " + token(1L, JwtService.ROLE_PREMIUM)))
                .andExpect(status().isOk());
    }

    @Test
    void freeUser_gets403Envelope() throws Exception {
        mockMvc.perform(get("/api/v1/test-only/premium")
                        .header("Authorization", "Bearer " + token(2L, JwtService.ROLE_FREE)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("FORBIDDEN"))
                .andExpect(jsonPath("$.error.status").value(403));
    }

    @Test
    void unauthenticated_gets401Envelope() throws Exception {
        mockMvc.perform(get("/api/v1/test-only/premium"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
    }

    @TestConfiguration
    @RestController
    @RequestMapping("/api/v1/test-only")
    static class TestOnlyPremiumController {

        @GetMapping("/premium")
        @PreAuthorize("hasRole('PREMIUM')")
        public String premiumOnly() {
            return "ok";
        }
    }
}
