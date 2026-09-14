package com.guitarapp.controller;

import com.guitarapp.dto.SessionStateDto;
import com.guitarapp.model.SavedSession;
import com.guitarapp.model.User;
import com.guitarapp.security.JwtService;
import com.guitarapp.support.WebMockTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Web-slice test for {@code /api/v1/sessions} — proves premium gating, ownership scoping,
 * and validation route through the standard error envelope. {@code SessionService} is a real
 * bean; its {@link com.guitarapp.repository.SavedSessionRepository} dependency is mocked.
 */
class SessionControllerTest extends WebMockTestBase {

    @Autowired
    private JwtService jwtService;

    private static final String VALID_BODY =
            "{\"tuning\":\"Standard E\",\"capoPosition\":2,\"freeformMarks\":[{\"fret\":3,\"string\":1}]}";

    private String token(long id, String role) {
        User user = User.builder().email("u@example.com").name("U").tokenVersion(0).build();
        user.setId(id);
        return jwtService.generateAccessToken(user, role);
    }

    @Test
    void premiumUser_getReturns200WhenSessionExists() throws Exception {
        User user = User.builder().id(1L).build();
        SavedSession session = SavedSession.builder()
                .id(10L).user(user)
                .state(new SessionStateDto("Standard E", 2, List.of()))
                .updatedAt(OffsetDateTime.now(ZoneOffset.UTC))
                .build();
        when(savedSessionRepository.findByUserId(1L)).thenReturn(Optional.of(session));

        mockMvc.perform(get("/api/v1/sessions")
                        .header("Authorization", "Bearer " + token(1L, JwtService.ROLE_PREMIUM)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.state.tuning").value("Standard E"))
                .andExpect(jsonPath("$.state.capoPosition").value(2));
    }

    @Test
    void premiumUser_getReturns204WhenNoSessionSaved() throws Exception {
        when(savedSessionRepository.findByUserId(1L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/sessions")
                        .header("Authorization", "Bearer " + token(1L, JwtService.ROLE_PREMIUM)))
                .andExpect(status().isNoContent());
    }

    @Test
    void freeUser_getGets403Envelope() throws Exception {
        mockMvc.perform(get("/api/v1/sessions")
                        .header("Authorization", "Bearer " + token(2L, JwtService.ROLE_FREE)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
    }

    @Test
    void unauthenticated_getGets401Envelope() throws Exception {
        mockMvc.perform(get("/api/v1/sessions"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
    }

    @Test
    void premiumUser_postCreatesAndReturns200() throws Exception {
        when(savedSessionRepository.findByUserId(1L)).thenReturn(Optional.empty());
        when(userRepository.getReferenceById(1L)).thenReturn(User.builder().id(1L).build());
        when(savedSessionRepository.save(any(SavedSession.class))).thenAnswer(inv -> {
            SavedSession s = inv.getArgument(0);
            return SavedSession.builder()
                    .id(10L).user(s.getUser()).state(s.getState())
                    .updatedAt(OffsetDateTime.now(ZoneOffset.UTC))
                    .build();
        });

        mockMvc.perform(post("/api/v1/sessions")
                        .header("Authorization", "Bearer " + token(1L, JwtService.ROLE_PREMIUM))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.state.tuning").value("Standard E"))
                .andExpect(jsonPath("$.state.freeformMarks[0].fret").value(3));
    }

    @Test
    void freeUser_postGets403() throws Exception {
        mockMvc.perform(post("/api/v1/sessions")
                        .header("Authorization", "Bearer " + token(2L, JwtService.ROLE_FREE))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_BODY))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
    }

    @Test
    void premiumUser_postTuningOver255CharsGets400() throws Exception {
        String tooLong = "E".repeat(256);
        mockMvc.perform(post("/api/v1/sessions")
                        .header("Authorization", "Bearer " + token(1L, JwtService.ROLE_PREMIUM))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tuning\":\"" + tooLong + "\",\"capoPosition\":0,\"freeformMarks\":[]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    void premiumUser_postBlankTuningGets400() throws Exception {
        mockMvc.perform(post("/api/v1/sessions")
                        .header("Authorization", "Bearer " + token(1L, JwtService.ROLE_PREMIUM))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tuning\":\"\",\"capoPosition\":0,\"freeformMarks\":[]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    void premiumUser_postCapoOutOfRangeGets400() throws Exception {
        mockMvc.perform(post("/api/v1/sessions")
                        .header("Authorization", "Bearer " + token(1L, JwtService.ROLE_PREMIUM))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tuning\":\"Standard E\",\"capoPosition\":13,\"freeformMarks\":[]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    void premiumUser_deleteOwnSessionReturns204() throws Exception {
        User user = User.builder().id(1L).build();
        SavedSession session = SavedSession.builder()
                .id(10L).user(user)
                .state(new SessionStateDto("Standard E", 0, List.of()))
                .build();
        when(savedSessionRepository.findById(10L)).thenReturn(Optional.of(session));

        mockMvc.perform(delete("/api/v1/sessions/10")
                        .header("Authorization", "Bearer " + token(1L, JwtService.ROLE_PREMIUM)))
                .andExpect(status().isNoContent());
    }

    @Test
    void freeUser_deleteGets403() throws Exception {
        mockMvc.perform(delete("/api/v1/sessions/10")
                        .header("Authorization", "Bearer " + token(2L, JwtService.ROLE_FREE)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
    }

    @Test
    void unauthenticated_deleteGets401() throws Exception {
        mockMvc.perform(delete("/api/v1/sessions/10"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
    }

    @Test
    void premiumUser_deleteOtherUsersSessionGets403() throws Exception {
        User otherUser = User.builder().id(99L).build();
        SavedSession session = SavedSession.builder()
                .id(10L).user(otherUser)
                .state(new SessionStateDto("Standard E", 0, List.of()))
                .build();
        when(savedSessionRepository.findById(10L)).thenReturn(Optional.of(session));

        mockMvc.perform(delete("/api/v1/sessions/10")
                        .header("Authorization", "Bearer " + token(1L, JwtService.ROLE_PREMIUM)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
    }

    @Test
    void premiumUser_deleteNonexistentGets404() throws Exception {
        when(savedSessionRepository.findById(999L)).thenReturn(Optional.empty());

        mockMvc.perform(delete("/api/v1/sessions/999")
                        .header("Authorization", "Bearer " + token(1L, JwtService.ROLE_PREMIUM)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));
    }
}
