package com.guitarapp.dto.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.nio.charset.StandardCharsets;

public class BcryptLengthValidator implements ConstraintValidator<ValidBcryptLength, String> {

    private static final int MAX_BYTES = 72;

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null) {
            return true; // presence is @NotBlank's job
        }
        return value.getBytes(StandardCharsets.UTF_8).length <= MAX_BYTES;
    }
}
