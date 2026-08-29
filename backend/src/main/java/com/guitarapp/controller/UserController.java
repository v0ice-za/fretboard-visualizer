package com.guitarapp.controller;

import com.guitarapp.dto.UserResponseDto;
import com.guitarapp.exception.AuthException;
import com.guitarapp.repository.UserRepository;
import com.guitarapp.security.AuthenticatedUser;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * Returns the authenticated user. The {@code JwtFilter} sets the principal to the
     * user id; we load the row so the response includes the (mutable) name.
     */
    @GetMapping("/me")
    public UserResponseDto me(Authentication authentication) {
        return userRepository.findById(AuthenticatedUser.id(authentication))
                .map(UserResponseDto::from)
                .orElseThrow(AuthException::unauthorized);
    }
}
