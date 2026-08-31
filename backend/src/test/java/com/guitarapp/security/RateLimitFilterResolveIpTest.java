package com.guitarapp.security;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pure unit test of the trusted-proxy X-Forwarded-For resolution — the anti-spoofing core of
 * the rate-limit key. No Spring context needed.
 */
class RateLimitFilterResolveIpTest {

    private static final String SOCKET = "10.0.0.9";

    @Test
    void noXff_fallsBackToSocketAddress() {
        assertThat(RateLimitFilter.resolveClientIp(null, SOCKET, 1)).isEqualTo(SOCKET);
        assertThat(RateLimitFilter.resolveClientIp("  ", SOCKET, 1)).isEqualTo(SOCKET);
    }

    @Test
    void singleHop_returnsThatEntry() {
        // One trusted proxy, one XFF entry (its observed client IP).
        assertThat(RateLimitFilter.resolveClientIp("203.0.113.5", SOCKET, 1)).isEqualTo("203.0.113.5");
    }

    @Test
    void spoofedLeftmostEntry_isIgnored_trustedHopWins() {
        // Client pre-seeds a fake leftmost entry; the trusted edge proxy appended the real IP on the right.
        assertThat(RateLimitFilter.resolveClientIp("1.2.3.4, 203.0.113.5", SOCKET, 1)).isEqualTo("203.0.113.5");
    }

    @Test
    void twoTrustedHops_takesSecondFromRight() {
        // [spoof, realClient, edge] with 2 trusted hops → the real client IP.
        assertThat(RateLimitFilter.resolveClientIp("9.9.9.9, 203.0.113.5, 172.16.0.1", SOCKET, 2))
                .isEqualTo("203.0.113.5");
    }

    @Test
    void fewerEntriesThanTrustedHops_fallsBackToSocket() {
        // Misconfigured / direct hit: header shorter than the expected proxy chain.
        assertThat(RateLimitFilter.resolveClientIp("203.0.113.5", SOCKET, 3)).isEqualTo(SOCKET);
    }

    @Test
    void trustDisabled_usesSocketEvenWithXff() {
        assertThat(RateLimitFilter.resolveClientIp("203.0.113.5", SOCKET, 0)).isEqualTo(SOCKET);
    }

    @Test
    void trimsWhitespaceAroundSelectedHop() {
        assertThat(RateLimitFilter.resolveClientIp("1.2.3.4,   203.0.113.5", SOCKET, 1)).isEqualTo("203.0.113.5");
    }
}
