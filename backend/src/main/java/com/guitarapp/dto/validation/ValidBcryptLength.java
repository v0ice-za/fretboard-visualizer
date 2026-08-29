package com.guitarapp.dto.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Validates that a password is at most 72 <b>bytes</b> when UTF-8-encoded — BCrypt's true
 * truncation limit. {@code @Size(max = 72)} alone counts UTF-16 characters, which can pass
 * while still exceeding 72 bytes for any password containing multi-byte characters (accents,
 * CJK, emoji), silently reproducing the truncation-collision this annotation exists to prevent.
 */
@Target({ElementType.FIELD, ElementType.METHOD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Constraint(validatedBy = BcryptLengthValidator.class)
public @interface ValidBcryptLength {
    String message() default "must be at most 72 bytes (UTF-8 encoded)";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
