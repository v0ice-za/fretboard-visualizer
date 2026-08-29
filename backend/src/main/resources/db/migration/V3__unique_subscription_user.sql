-- Enforce one subscription (tier) per user.
-- Replaces the non-unique idx_subscriptions_user_id with a UNIQUE constraint;
-- the constraint's backing index also serves user_id lookups.
DROP INDEX IF EXISTS idx_subscriptions_user_id;

ALTER TABLE subscriptions
    ADD CONSTRAINT uq_subscriptions_user_id UNIQUE (user_id);
