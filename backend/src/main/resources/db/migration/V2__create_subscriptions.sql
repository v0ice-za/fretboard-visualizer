CREATE TABLE subscriptions (
    id                     BIGSERIAL    PRIMARY KEY,
    user_id                BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_customer_id     VARCHAR(255),
    stripe_subscription_id VARCHAR(255) UNIQUE,
    status                 VARCHAR(50)  NOT NULL DEFAULT 'FREE',
    current_period_end     TIMESTAMPTZ,
    created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
