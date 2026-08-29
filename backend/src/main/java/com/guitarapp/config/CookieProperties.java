package com.guitarapp.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Binds the {@code app.cookie} block — profile/env-driven refresh-cookie attributes.
 *
 * <p>Dev (default): {@code SameSite=Lax; Secure=false} — works over http localhost, same-origin
 * via the Vite proxy. Prod (Railway env): {@code SameSite=None; Secure=true} — required for the
 * cross-origin Vercel→Railway credentialed request.
 *
 * @param sameSite the cookie SameSite attribute (Lax / None / Strict)
 * @param secure   whether the Secure flag is set (must be true when SameSite=None)
 */
@ConfigurationProperties("app.cookie")
public record CookieProperties(String sameSite, boolean secure) {

    public CookieProperties {
        // Browsers silently reject SameSite=None cookies missing Secure — a misconfigured
        // COOKIE_SAME_SITE without COOKIE_SECURE would break prod auth with no error surfaced
        // anywhere. Fail fast at startup instead.
        if ("None".equalsIgnoreCase(sameSite) && !secure) {
            throw new IllegalStateException(
                    "app.cookie.same-site=None requires app.cookie.secure=true (browsers reject SameSite=None without Secure).");
        }
    }
}
