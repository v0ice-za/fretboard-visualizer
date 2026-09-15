import { useEffect, useRef } from 'react';
import { useAuthStore, selectIsAuthenticated } from '@/stores/authStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { useThemeStore, isPremiumTheme, readStoredTheme } from '@/stores/themeStore';

/**
 * Premium theme entitlement guard (Story 4.5): restores a previously-chosen premium
 * theme once (after auth + premium are both confirmed), and falls back to `dark` if
 * the active theme is premium and the user loses entitlement (logout OR subscription
 * expiry) — mirrors 4.4's `useSessionSync` auth/premium async-sequencing pattern.
 *
 * Two separate effects, not one "isPremium changed" effect: restore only ever runs on
 * the entitlement GAIN direction (false->true, once), fallback only ever runs on the
 * LOSS direction (true->false). Conflating them risks re-firing restore on every
 * dependency change, or fallback firing on mount for every non-premium/anonymous user
 * (the exact bug class 4.4's code review caught for its own auth-transition guard).
 */
export function useThemeGuard() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const isPremium = useSubscriptionStore((s) => s.isPremium);

  const hasRestoredRef = useRef(false);
  // `isAuthenticated` and `isPremium` resolve independently and asynchronously
  // (cookie refresh + a query fetch); "entitled" is their AND, and a downgrade is
  // either one flipping false while both were previously true — losing the login
  // and losing just the subscription are the same event for this guard's purposes.
  const wasEntitledRef = useRef(isAuthenticated && isPremium);

  // Restore — fires once, the first time both isAuthenticated and isPremium are true.
  // Reads the RAW stored theme (bypassing getInitialTheme's free-only narrowing) so a
  // premium theme chosen on a previous visit is re-applied now that entitlement is
  // actually confirmed — never synchronously at module load, where entitlement is
  // still unknown (see themeStore.ts's getInitialTheme for why that matters).
  useEffect(() => {
    if (hasRestoredRef.current) return;
    if (!isAuthenticated || !isPremium) return;
    hasRestoredRef.current = true;

    const stored = readStoredTheme();
    if (stored && isPremiumTheme(stored)) {
      useThemeStore.getState().setTheme(stored);
    }
  }, [isAuthenticated, isPremium]);

  // Fallback — only on a genuine entitlement-loss TRANSITION (true->false), not on
  // "currently not entitled" (also true on every anonymous/free user's initial mount,
  // which must NOT reset a free user's own dark/light choice).
  useEffect(() => {
    const wasEntitled = wasEntitledRef.current;
    const isEntitled = isAuthenticated && isPremium;
    wasEntitledRef.current = isEntitled;

    if (wasEntitled && !isEntitled) {
      if (isPremiumTheme(useThemeStore.getState().theme)) {
        useThemeStore.getState().setTheme('dark');
      }
      // Allow a future restore — e.g. a different premium user logging into the same
      // tab, or this user regaining entitlement later in the session.
      hasRestoredRef.current = false;
    }
  }, [isAuthenticated, isPremium]);
}
