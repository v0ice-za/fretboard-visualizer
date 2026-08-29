package com.guitarapp.security;

import com.guitarapp.exception.ErrorResponseWriter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Renders the {@code FORBIDDEN}/403 error envelope when an authenticated user lacks the
 * required authority (e.g. a {@code ROLE_FREE} user hitting a {@code @PreAuthorize("hasRole('PREMIUM')")}
 * endpoint) — replacing Spring Security's default HTML 403 so the {@code error.code} contract holds.
 * Parallels {@link RestAuthenticationEntryPoint} (which handles the unauthenticated 401 case).
 */
@Component
public class RestAccessDeniedHandler implements AccessDeniedHandler {

    private final ErrorResponseWriter errorResponseWriter;

    public RestAccessDeniedHandler(ErrorResponseWriter errorResponseWriter) {
        this.errorResponseWriter = errorResponseWriter;
    }

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response,
                       AccessDeniedException accessDeniedException) throws IOException {
        errorResponseWriter.write(response, "FORBIDDEN",
                "You do not have access to this resource.", HttpStatus.FORBIDDEN);
    }
}
