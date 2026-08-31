package com.guitarapp;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Boots the FULL application context against a real Postgres 16 (Testcontainers) so Flyway
 * applies V1–V5 and Hibernate {@code ddl-auto: validate} checks every entity
 * ({@code User}/{@code Subscription}/{@code ProcessedStripeEvent}) against the migrated
 * schema. Any migration/mapping drift fails context startup → this test fails. This is the
 * one test that exercises the real persistence stack (unlike the DB-excluded
 * {@code WebMockTestBase}), and it is what proves the "migrations run on startup" AC is
 * deploy-safe before Railway ever runs them.
 *
 * <p>Skips gracefully when Docker is unavailable (local dev without Docker Desktop) via
 * {@code disabledWithoutDocker}; always runs in CI, where the runner provides Docker.
 * Secret dummies mirror {@code WebMockTestBase} so the Google/Stripe beans can construct.
 */
@SpringBootTest(properties = {
    "app.google.client-id=test-google-client-id",
    "app.stripe.secret-key=sk_test_dummy",
    "app.stripe.webhook-secret=whsec_dummy",
    "app.stripe.price-id=price_dummy"
})
@Testcontainers(disabledWithoutDocker = true)
class SchemaMigrationIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void migrationsApplyAndSchemaValidates() {
        // Reaching here means the context loaded — i.e. Flyway ran and ddl-auto:validate passed.
        Integer applied = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM flyway_schema_history WHERE success = true", Integer.class);
        assertThat(applied).isEqualTo(5); // V1–V5
    }
}
