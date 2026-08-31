package com.guitarapp.security;

import com.guitarapp.exception.ErrorResponseWriter;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.lang.NonNull;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Per-IP token-bucket rate limiter for {@code /api/v1/auth/*}. Login/register/Google share a
 * tight bucket (brute-force protection); {@code /auth/refresh} gets its own, more generous
 * bucket so routine session-restore traffic (e.g. the silent bootstrap refresh on page load)
 * doesn't compete with that budget. In-memory only (a {@link ConcurrentHashMap} of buckets,
 * opportunistically swept of idle entries) — no Redis, per architecture.
 *
 * <p>Resolves the client IP as the entry {@code trustedProxyCount} positions from the right of
 * {@code X-Forwarded-For} — the hops appended by the deploy's own trusted proxies (e.g. the
 * Railway edge), which a client cannot spoof — falling back to the socket address. The exact
 * trusted-hop count is {@code app.ratelimit.trusted-proxy-count} (verify against Railway).
 */
public class RateLimitFilter extends OncePerRequestFilter {

    private static final String AUTH_PATH_PREFIX = "/api/v1/auth";
    private static final String REFRESH_PATH = "/api/v1/auth/refresh";

    private static final int AUTH_CAPACITY = 10;
    private static final int REFRESH_CAPACITY = 30;
    private static final Duration WINDOW = Duration.ofMinutes(1);

    /** Buckets idle longer than this are evicted so the map doesn't grow unbounded. */
    private static final Duration IDLE_EVICTION = Duration.ofMinutes(10);
    /** Sweep opportunistically rather than on every request or via a background thread. */
    private static final long SWEEP_EVERY_N_REQUESTS = 500;

    private final ErrorResponseWriter errorResponseWriter;
    private final int trustedProxyCount;
    private final Map<String, BucketEntry> buckets = new ConcurrentHashMap<>();
    private final AtomicLong requestCounter = new AtomicLong();

    public RateLimitFilter(ErrorResponseWriter errorResponseWriter, int trustedProxyCount) {
        this.errorResponseWriter = errorResponseWriter;
        this.trustedProxyCount = trustedProxyCount;
    }

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        return !request.getRequestURI().startsWith(AUTH_PATH_PREFIX);
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {
        sweepIfDue();
        String uri = request.getRequestURI();
        BucketEntry entry = buckets.compute(bucketKey(request, uri), (key, existing) -> {
            if (existing != null) {
                existing.touch();
                return existing;
            }
            return new BucketEntry(newBucket(uri));
        });
        if (entry.bucket.tryConsume(1)) {
            filterChain.doFilter(request, response);
        } else {
            errorResponseWriter.write(response, "RATE_LIMITED",
                    "Too many requests. Please try again later.", HttpStatus.TOO_MANY_REQUESTS);
        }
    }

    /** `/auth/refresh` is keyed separately so it draws from its own, more generous bucket. */
    private String bucketKey(HttpServletRequest request, String uri) {
        String group = REFRESH_PATH.equals(uri) ? "refresh" : "auth";
        return clientIp(request) + ':' + group;
    }

    private Bucket newBucket(String uri) {
        int capacity = REFRESH_PATH.equals(uri) ? REFRESH_CAPACITY : AUTH_CAPACITY;
        Bandwidth limit = Bandwidth.builder()
                .capacity(capacity)
                .refillGreedy(capacity, WINDOW)
                .build();
        return Bucket.builder().addLimit(limit).build();
    }

    private String clientIp(HttpServletRequest request) {
        return resolveClientIp(request.getHeader("X-Forwarded-For"), request.getRemoteAddr(), trustedProxyCount);
    }

    /**
     * Client IP taken {@code trustedProxyCount} entries from the right of {@code X-Forwarded-For}
     * — the hop the outermost trusted proxy actually observed, which the client cannot forge by
     * pre-seeding the (leftmost) header. Falls back to {@code remoteAddr} when XFF is absent, has
     * fewer entries than expected proxies, or trust is disabled ({@code trustedProxyCount <= 0}).
     */
    static String resolveClientIp(String xffHeader, String remoteAddr, int trustedProxyCount) {
        if (trustedProxyCount > 0 && StringUtils.hasText(xffHeader)) {
            String[] hops = xffHeader.split(",");
            int idx = hops.length - trustedProxyCount;
            if (idx >= 0 && idx < hops.length) {
                String ip = hops[idx].trim();
                if (StringUtils.hasText(ip)) {
                    return ip;
                }
            }
        }
        return remoteAddr;
    }

    /**
     * Opportunistically (not on every request, no background thread) evicts buckets idle
     * longer than {@link #IDLE_EVICTION} — bounds map growth without a new dependency.
     */
    private void sweepIfDue() {
        if (requestCounter.incrementAndGet() % SWEEP_EVERY_N_REQUESTS != 0) {
            return;
        }
        long cutoff = System.currentTimeMillis() - IDLE_EVICTION.toMillis();
        buckets.entrySet().removeIf(e -> e.getValue().lastAccessMillis < cutoff);
    }

    private static final class BucketEntry {
        private final Bucket bucket;
        private volatile long lastAccessMillis;

        BucketEntry(Bucket bucket) {
            this.bucket = bucket;
            this.lastAccessMillis = System.currentTimeMillis();
        }

        void touch() {
            lastAccessMillis = System.currentTimeMillis();
        }
    }
}
