package com.guitarapp.exception;

import org.springframework.http.HttpStatus;

/**
 * Stripe checkout/webhook failures. Static factories keep the stable error codes in
 * one place (mirrors {@link AuthException}).
 */
public class PaymentException extends GuitarAppException {

    public PaymentException(String code, String message, HttpStatus status) {
        super(code, message, status);
    }

    public static PaymentException checkoutFailed() {
        return new PaymentException("CHECKOUT_SESSION_FAILED", "Unable to start checkout. Please try again.", HttpStatus.BAD_GATEWAY);
    }

    public static PaymentException invalidSignature() {
        return new PaymentException("INVALID_STRIPE_SIGNATURE", "Stripe webhook signature is missing or invalid.", HttpStatus.BAD_REQUEST);
    }
}
