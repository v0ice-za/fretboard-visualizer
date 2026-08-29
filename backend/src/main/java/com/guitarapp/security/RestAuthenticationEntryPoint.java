package com.guitarapp.security;

import com.guitarapp.exception.ErrorResponseWriter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Renders the {@code UNAUTHORIZED}/401 error envelope for unauthenticated requests to
 * protected routes — replacing Spring Security's default bare 403/HTML response
 * (resolves the deferred Story 3.1 finding).
 */
@Component
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ErrorResponseWriter errorResponseWriter;

    public RestAuthenticationEntryPoint(ErrorResponseWriter errorResponseWriter) {
        this.errorResponseWriter = errorResponseWriter;
    }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException authException) throws IOException {
        errorResponseWriter.write(response, "UNAUTHORIZED",
                "Authentication is required to access this resource.", HttpStatus.UNAUTHORIZED);
    }
}
