package com.guitarapp.controller;

import com.guitarapp.dto.TuningRequestDto;
import com.guitarapp.dto.TuningResponseDto;
import com.guitarapp.security.AuthenticatedUser;
import com.guitarapp.service.TuningService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Custom tunings for premium users. Both endpoints are premium-gated via method security
 * ({@code @PreAuthorize}); the routes are not permit-listed, so unauthenticated calls yield the
 * 401 envelope and authenticated non-premium calls yield the 403 envelope (SecurityConfig).
 * DELETE/PATCH are Story 4.2.
 */
@RestController
@RequestMapping("/api/v1/tunings")
public class TuningController {

    private final TuningService tuningService;

    public TuningController(TuningService tuningService) {
        this.tuningService = tuningService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('PREMIUM')")
    public TuningResponseDto create(@Valid @RequestBody TuningRequestDto request,
                                    Authentication authentication) {
        return tuningService.create(AuthenticatedUser.id(authentication), request);
    }

    @GetMapping
    @PreAuthorize("hasRole('PREMIUM')")
    public List<TuningResponseDto> list(Authentication authentication) {
        return tuningService.listForUser(AuthenticatedUser.id(authentication));
    }
}
