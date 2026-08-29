package com.guitarapp.exception;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.guitarapp.dto.ErrorResponse;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Writes the standard error envelope directly to an {@link HttpServletResponse}.
 * Used by servlet filters and the security entry point — places that run outside
 * {@code @RestControllerAdvice} and therefore cannot rely on {@link GlobalExceptionHandler}.
 */
@Component
public class ErrorResponseWriter {

    private final ObjectMapper objectMapper;

    public ErrorResponseWriter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public void write(HttpServletResponse response, String code, String message, HttpStatus status) throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(), ErrorResponse.of(code, message, status.value()));
    }
}
