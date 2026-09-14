package com.guitarapp.controller;

import com.guitarapp.dto.SessionResponseDto;
import com.guitarapp.dto.SessionStateDto;
import com.guitarapp.security.AuthenticatedUser;
import com.guitarapp.service.SessionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * Saved fretboard session for premium users (Story 4.4). All three endpoints are
 * premium-gated via method security ({@code @PreAuthorize}); the routes are not
 * permit-listed, so unauthenticated calls yield the 401 envelope and authenticated
 * non-premium calls yield the 403 envelope (SecurityConfig).
 */
@RestController
@RequestMapping("/api/v1/sessions")
public class SessionController {

    private final SessionService sessionService;

    public SessionController(SessionService sessionService) {
        this.sessionService = sessionService;
    }

    @GetMapping
    @PreAuthorize("hasRole('PREMIUM')")
    public ResponseEntity<SessionResponseDto> get(Authentication authentication) {
        return sessionService.getForUser(AuthenticatedUser.id(authentication))
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PostMapping
    @PreAuthorize("hasRole('PREMIUM')")
    public SessionResponseDto save(@Valid @RequestBody SessionStateDto state, Authentication authentication) {
        return sessionService.upsert(AuthenticatedUser.id(authentication), state);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('PREMIUM')")
    public void delete(@PathVariable Long id, Authentication authentication) {
        sessionService.delete(AuthenticatedUser.id(authentication), id);
    }
}
