package com.guitarapp.service;

import com.guitarapp.dto.SubscriptionResponseDto;
import com.guitarapp.model.Subscription;
import com.guitarapp.repository.SubscriptionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Pure unit test (no Spring context) — mocks the {@link SubscriptionRepository} interface
 * (Java 25 mock-safe). Exercises the effective-status / expiry evaluation that both
 * {@code /subscriptions/me} and the JWT role claim depend on.
 */
class SubscriptionServiceTest {

    private SubscriptionRepository subscriptionRepository;
    private SubscriptionService service;

    private static final OffsetDateTime FUTURE = OffsetDateTime.now(ZoneOffset.UTC).plusDays(30);
    private static final OffsetDateTime PAST = OffsetDateTime.now(ZoneOffset.UTC).minusDays(1);

    @BeforeEach
    void setUp() {
        subscriptionRepository = mock(SubscriptionRepository.class);
        service = new SubscriptionService(subscriptionRepository);
    }

    private void stubRow(long userId, String status, OffsetDateTime periodEnd) {
        Subscription sub = Subscription.builder().status(status).currentPeriodEnd(periodEnd).build();
        when(subscriptionRepository.findByUserId(userId)).thenReturn(Optional.of(sub));
    }

    @Test
    void resolveEffectiveStatus_noRow_isNone() {
        when(subscriptionRepository.findByUserId(1L)).thenReturn(Optional.empty());
        assertThat(service.resolveEffectiveStatus(1L)).isEqualTo("NONE");
        assertThat(service.isPremiumActive(1L)).isFalse();
    }

    @Test
    void resolveEffectiveStatus_activeWithFuturePeriodEnd_isActive() {
        stubRow(2L, "ACTIVE", FUTURE);
        assertThat(service.resolveEffectiveStatus(2L)).isEqualTo("ACTIVE");
        assertThat(service.isPremiumActive(2L)).isTrue();
    }

    @Test
    void resolveEffectiveStatus_activeWithPastPeriodEnd_isExpired() {
        // Time-based lapse: stored ACTIVE but the period ended → treated as EXPIRED (missed webhook defense).
        stubRow(3L, "ACTIVE", PAST);
        assertThat(service.resolveEffectiveStatus(3L)).isEqualTo("EXPIRED");
        assertThat(service.isPremiumActive(3L)).isFalse();
    }

    @Test
    void resolveEffectiveStatus_storedExpired_isExpired() {
        stubRow(4L, "EXPIRED", FUTURE);
        assertThat(service.resolveEffectiveStatus(4L)).isEqualTo("EXPIRED");
        assertThat(service.isPremiumActive(4L)).isFalse();
    }

    @Test
    void resolveEffectiveStatus_activeWithNullPeriodEnd_isActive() {
        // Anomalous but defensive: an ACTIVE row with no period-end is trusted rather than locking out a payer.
        stubRow(5L, "ACTIVE", null);
        assertThat(service.resolveEffectiveStatus(5L)).isEqualTo("ACTIVE");
    }

    @Test
    void getForUser_activeRow_returnsActiveDtoWithPeriodEnd() {
        OffsetDateTime end = OffsetDateTime.of(2027, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC);
        stubRow(6L, "ACTIVE", end);
        SubscriptionResponseDto dto = service.getForUser(6L);
        assertThat(dto.status()).isEqualTo("ACTIVE");
        assertThat(dto.currentPeriodEnd()).isEqualTo("2027-01-01T00:00:00Z");
    }

    @Test
    void getForUser_lapsedActiveRow_returnsExpiredButKeepsPeriodEnd() {
        stubRow(7L, "ACTIVE", PAST);
        SubscriptionResponseDto dto = service.getForUser(7L);
        assertThat(dto.status()).isEqualTo("EXPIRED");
        assertThat(dto.currentPeriodEnd()).isNotNull();
    }

    @Test
    void getForUser_noRow_returnsNone() {
        when(subscriptionRepository.findByUserId(8L)).thenReturn(Optional.empty());
        SubscriptionResponseDto dto = service.getForUser(8L);
        assertThat(dto.status()).isEqualTo("NONE");
        assertThat(dto.currentPeriodEnd()).isNull();
    }
}
