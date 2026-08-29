package com.guitarapp.controller;

import com.guitarapp.support.WebMockTestBase;
import org.junit.jupiter.api.Test;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class HealthControllerTest extends WebMockTestBase {

    @Test
    void health_endpoint_returns_200_with_status_up() throws Exception {
        mockMvc.perform(get("/api/v1/health"))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.status").value("UP"));
    }
}
