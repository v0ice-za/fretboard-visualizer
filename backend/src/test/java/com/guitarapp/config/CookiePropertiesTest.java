package com.guitarapp.config;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CookiePropertiesTest {

    @Test
    void sameSiteNone_withSecureTrue_isAccepted() {
        CookieProperties props = new CookieProperties("None", true);
        assertThat(props.sameSite()).isEqualTo("None");
        assertThat(props.secure()).isTrue();
    }

    @Test
    void sameSiteLax_withSecureFalse_isAccepted() {
        CookieProperties props = new CookieProperties("Lax", false);
        assertThat(props.sameSite()).isEqualTo("Lax");
    }

    @Test
    void sameSiteNone_withSecureFalse_failsFastAtConstruction() {
        // Browsers silently reject SameSite=None without Secure — this misconfiguration must
        // fail loudly at startup rather than silently break the prod refresh cookie.
        assertThatThrownBy(() -> new CookieProperties("None", false))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("SameSite=None");
    }

    @Test
    void sameSiteNone_caseInsensitive_stillValidated() {
        assertThatThrownBy(() -> new CookieProperties("none", false))
                .isInstanceOf(IllegalStateException.class);
    }
}
