-- Refresh-token invalidation support (Story 3.2).
-- token_version is embedded in each refresh token; incrementing it on
-- rotate/logout invalidates the previously issued refresh token (single
-- active refresh chain per user — see story Dev Notes "Refresh-token rotation").
ALTER TABLE users
    ADD COLUMN token_version INT NOT NULL DEFAULT 0;
