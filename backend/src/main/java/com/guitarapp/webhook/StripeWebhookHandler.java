package com.guitarapp.webhook;

import com.guitarapp.security.StripeGateway;
import com.guitarapp.service.StripeWebhookService;
import com.stripe.model.Event;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * {@code permitAll} — Stripe sends no JWT; the {@code Stripe-Signature} header (verified
 * against the raw body) is the only trust boundary. The {@code String payload} parameter
 * is deliberate: Spring's {@code StringHttpMessageConverter} reads the request body
 * untouched ahead of Jackson, which is required for the signature's HMAC to verify —
 * binding to a parsed DTO here would corrupt the bytes being checked.
 */
@RestController
@RequestMapping("/api/v1/webhooks")
public class StripeWebhookHandler {

    private final StripeGateway stripeGateway;
    private final StripeWebhookService stripeWebhookService;

    public StripeWebhookHandler(StripeGateway stripeGateway, StripeWebhookService stripeWebhookService) {
        this.stripeGateway = stripeGateway;
        this.stripeWebhookService = stripeWebhookService;
    }

    @PostMapping("/stripe")
    public void stripe(@RequestBody String payload, @RequestHeader("Stripe-Signature") String sigHeader) {
        Event event = stripeGateway.constructWebhookEvent(payload, sigHeader);
        stripeWebhookService.process(event);
    }
}
