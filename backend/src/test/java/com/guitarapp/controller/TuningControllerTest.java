package com.guitarapp.controller;

import com.guitarapp.model.CustomTuning;
import com.guitarapp.model.User;
import com.guitarapp.security.JwtService;
import com.guitarapp.support.WebMockTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Web-slice test for {@code /api/v1/tunings} — proves premium gating, ownership scoping,
 * and validation route through the standard error envelope. {@code TuningService} is a real
 * bean; its {@link CustomTuningRepository} dependency is mocked (DB autoconfig excluded by base).
 */
class TuningControllerTest extends WebMockTestBase {

    @Autowired
    private JwtService jwtService;

    private static final String VALID_BODY =
            "{\"name\":\"Drop C\",\"strings\":[\"C2\",\"G2\",\"C3\",\"F3\",\"A3\",\"D4\"]}";

    private String token(long id, String role) {
        User user = User.builder().email("u@example.com").name("U").tokenVersion(0).build();
        user.setId(id);
        return jwtService.generateAccessToken(user, role);
    }

    @Test
    void premiumUser_createReturns201AndBody() throws Exception {
        when(userRepository.getReferenceById(1L)).thenReturn(User.builder().id(1L).build());
        when(customTuningRepository.save(any(CustomTuning.class))).thenAnswer(inv -> {
            CustomTuning t = inv.getArgument(0);
            return CustomTuning.builder()
                    .id(10L).user(t.getUser()).name(t.getName()).strings(t.getStrings())
                    .createdAt(OffsetDateTime.now(ZoneOffset.UTC))
                    .build();
        });

        mockMvc.perform(post("/api/v1/tunings")
                        .header("Authorization", "Bearer " + token(1L, JwtService.ROLE_PREMIUM))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_BODY))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.name").value("Drop C"))
                .andExpect(jsonPath("$.strings[0]").value("C2"))
                .andExpect(jsonPath("$.strings.length()").value(6));
    }

    @Test
    void freeUser_createGets403Envelope() throws Exception {
        mockMvc.perform(post("/api/v1/tunings")
                        .header("Authorization", "Bearer " + token(2L, JwtService.ROLE_FREE))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_BODY))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("FORBIDDEN"))
                .andExpect(jsonPath("$.error.status").value(403));
    }

    @Test
    void unauthenticated_createGets401Envelope() throws Exception {
        mockMvc.perform(post("/api/v1/tunings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_BODY))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
    }

    @Test
    void premiumUser_blankNameGets400() throws Exception {
        mockMvc.perform(post("/api/v1/tunings")
                        .header("Authorization", "Bearer " + token(1L, JwtService.ROLE_PREMIUM))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"\",\"strings\":[\"C2\",\"G2\",\"C3\",\"F3\",\"A3\",\"D4\"]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    void premiumUser_wrongStringCountGets400() throws Exception {
        mockMvc.perform(post("/api/v1/tunings")
                        .header("Authorization", "Bearer " + token(1L, JwtService.ROLE_PREMIUM))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Bad\",\"strings\":[\"C2\",\"G2\",\"C3\"]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    void premiumUser_listReturnsOwnTunings() throws Exception {
        CustomTuning t = CustomTuning.builder()
                .id(5L).name("My Tuning")
                .strings(List.of("E2", "A2", "D3", "G3", "B3", "E4"))
                .createdAt(OffsetDateTime.now(ZoneOffset.UTC))
                .build();
        when(customTuningRepository.findByUserIdOrderByCreatedAtAsc(3L)).thenReturn(List.of(t));

        mockMvc.perform(get("/api/v1/tunings")
                        .header("Authorization", "Bearer " + token(3L, JwtService.ROLE_PREMIUM)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("My Tuning"));
    }

    @Test
    void freeUser_listGets403() throws Exception {
        mockMvc.perform(get("/api/v1/tunings")
                        .header("Authorization", "Bearer " + token(4L, JwtService.ROLE_FREE)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
    }

    @Test
    void premiumUser_updateNameReturns200() throws Exception {
        User user = User.builder().id(1L).build();
        CustomTuning existingTuning = CustomTuning.builder()
                .id(5L).user(user).name("Drop C").strings(List.of("C2", "G2", "C3", "F3", "A3", "D4"))
                .createdAt(OffsetDateTime.now(ZoneOffset.UTC))
                .build();
        when(customTuningRepository.findById(5L)).thenReturn(java.util.Optional.of(existingTuning));
        when(customTuningRepository.save(any(CustomTuning.class))).thenAnswer(inv -> inv.getArgument(0));

        mockMvc.perform(patch("/api/v1/tunings/5")
                        .header("Authorization", "Bearer " + token(1L, JwtService.ROLE_PREMIUM))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Open D\",\"strings\":[\"D2\",\"A2\",\"D3\",\"F#3\",\"A3\",\"D4\"]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(5))
                .andExpect(jsonPath("$.name").value("Open D"))
                .andExpect(jsonPath("$.strings[0]").value("D2"));
    }

    @Test
    void freeUser_patchGets403() throws Exception {
        mockMvc.perform(patch("/api/v1/tunings/5")
                        .header("Authorization", "Bearer " + token(2L, JwtService.ROLE_FREE))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_BODY))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
    }

    @Test
    void unauthenticated_patchGets401() throws Exception {
        mockMvc.perform(patch("/api/v1/tunings/5")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_BODY))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
    }

    @Test
    void premiumUser_patchOtherUsersTuningGets403() throws Exception {
        User otherUser = User.builder().id(99L).build();
        CustomTuning tuning = CustomTuning.builder()
                .id(5L).user(otherUser).name("Drop C").strings(List.of("C2", "G2", "C3", "F3", "A3", "D4"))
                .createdAt(OffsetDateTime.now(ZoneOffset.UTC))
                .build();
        when(customTuningRepository.findById(5L)).thenReturn(java.util.Optional.of(tuning));

        mockMvc.perform(patch("/api/v1/tunings/5")
                        .header("Authorization", "Bearer " + token(1L, JwtService.ROLE_PREMIUM))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_BODY))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
    }

    @Test
    void premiumUser_deleteReturns204() throws Exception {
        User user = User.builder().id(1L).build();
        CustomTuning tuning = CustomTuning.builder()
                .id(5L).user(user).name("Drop C").strings(List.of("C2", "G2", "C3", "F3", "A3", "D4"))
                .createdAt(OffsetDateTime.now(ZoneOffset.UTC))
                .build();
        when(customTuningRepository.findById(5L)).thenReturn(java.util.Optional.of(tuning));

        mockMvc.perform(delete("/api/v1/tunings/5")
                        .header("Authorization", "Bearer " + token(1L, JwtService.ROLE_PREMIUM)))
                .andExpect(status().isNoContent());
    }

    @Test
    void freeUser_deleteGets403() throws Exception {
        mockMvc.perform(delete("/api/v1/tunings/5")
                        .header("Authorization", "Bearer " + token(2L, JwtService.ROLE_FREE)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
    }

    @Test
    void unauthenticated_deleteGets401() throws Exception {
        mockMvc.perform(delete("/api/v1/tunings/5"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
    }

    @Test
    void premiumUser_deleteOtherUsersTuningGets403() throws Exception {
        User otherUser = User.builder().id(99L).build();
        CustomTuning tuning = CustomTuning.builder()
                .id(5L).user(otherUser).name("Drop C").strings(List.of("C2", "G2", "C3", "F3", "A3", "D4"))
                .createdAt(OffsetDateTime.now(ZoneOffset.UTC))
                .build();
        when(customTuningRepository.findById(5L)).thenReturn(java.util.Optional.of(tuning));

        mockMvc.perform(delete("/api/v1/tunings/5")
                        .header("Authorization", "Bearer " + token(1L, JwtService.ROLE_PREMIUM)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
    }

    @Test
    void premiumUser_deleteNonexistentGets404() throws Exception {
        when(customTuningRepository.findById(999L)).thenReturn(java.util.Optional.empty());

        mockMvc.perform(delete("/api/v1/tunings/999")
                        .header("Authorization", "Bearer " + token(1L, JwtService.ROLE_PREMIUM)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));
    }
}
