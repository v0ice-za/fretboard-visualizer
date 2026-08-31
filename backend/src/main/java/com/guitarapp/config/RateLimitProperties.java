package com.guitarapp.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Binds the {@code app.ratelimit} block.
 *
 * @param trustedProxyCount number of trusted reverse-proxy hops in front of the app that append
 *                          to {@code X-Forwarded-For}. The rate limiter takes the client IP that
 *                          many entries from the right of the header (the entries a client cannot
 *                          spoof), falling back to the socket address. On Railway this is the edge
 *                          proxy count — default {@code 1}; verify against the real topology and
 *                          tune via {@code RATELIMIT_TRUSTED_PROXY_COUNT} if needed. {@code 0}
 *                          disables XFF trust entirely (use the socket address).
 */
@ConfigurationProperties("app.ratelimit")
public record RateLimitProperties(int trustedProxyCount) {
}
