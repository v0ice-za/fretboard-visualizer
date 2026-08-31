package com.guitarapp;

import com.guitarapp.repository.CustomTuningRepository;
import com.guitarapp.repository.ProcessedStripeEventRepository;
import com.guitarapp.repository.SubscriptionRepository;
import com.guitarapp.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest(properties = {
    "spring.autoconfigure.exclude=" +
        "org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration," +
        "org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration," +
        "org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration",
    // GOOGLE_CLIENT_ID has no dev fallback; supply a dummy so the context loads.
    "app.google.client-id=test-google-client-id",
    // STRIPE_* have no dev fallback either; supply dummies so the context loads.
    "app.stripe.secret-key=sk_test_dummy",
    "app.stripe.webhook-secret=whsec_dummy",
    "app.stripe.price-id=price_dummy"
})
class GuitarAppApplicationTests {

    // DB auto-config is excluded, so the JPA repositories aren't created — mock them
    // (interfaces, so they work on the Java 25 test JVM) to satisfy injection.
    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private SubscriptionRepository subscriptionRepository;

    @MockitoBean
    private ProcessedStripeEventRepository processedStripeEventRepository;

    @MockitoBean
    private CustomTuningRepository customTuningRepository;

    @Test
    void contextLoads() {
    }

}
