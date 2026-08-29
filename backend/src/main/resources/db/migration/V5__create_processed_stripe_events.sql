-- Idempotency ledger for Stripe webhook deliveries: a duplicate event ID is detected
-- and skipped so retried/duplicate webhook deliveries have no side effect.
CREATE TABLE processed_stripe_events (
    stripe_event_id VARCHAR(255) PRIMARY KEY,
    event_type      VARCHAR(100) NOT NULL,
    processed_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
