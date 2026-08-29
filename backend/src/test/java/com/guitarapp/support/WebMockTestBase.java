package com.guitarapp.support;

import com.guitarapp.repository.SubscriptionRepository;
import com.guitarapp.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Base for web-layer tests: loads the full application context (so the real Spring
 * Security chain + JWT/rate-limit filters are exercised) but excludes the database
 * auto-configuration and mocks {@link UserRepository}. DB-backed integration tests
 * with Testcontainers remain deferred to Story 3.7.
 *
 * <p>JPA repositories are excluded with the DB autoconfig, so every repository a web bean
 * depends on must be supplied as a {@code @MockitoBean} here (interfaces mock cleanly on
 * the Java 25 test JVM).
 */
@SpringBootTest(properties = {
    "spring.autoconfigure.exclude=" +
        "org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration," +
        "org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration," +
        "org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration",
    // GOOGLE_CLIENT_ID has no dev fallback in application.yml; supply a dummy so the
    // GoogleProperties binding + real GoogleTokenVerifierImpl bean can be constructed.
    "app.google.client-id=test-google-client-id"
})
@AutoConfigureMockMvc
public abstract class WebMockTestBase {

    @Autowired
    protected MockMvc mockMvc;

    @MockitoBean
    protected UserRepository userRepository;

    @MockitoBean
    protected SubscriptionRepository subscriptionRepository;
}
