package com.guitarapp.dto;

import com.guitarapp.model.User;

public record UserResponseDto(Long id, String email, String name) {

    public static UserResponseDto from(User user) {
        return new UserResponseDto(user.getId(), user.getEmail(), user.getName());
    }
}
