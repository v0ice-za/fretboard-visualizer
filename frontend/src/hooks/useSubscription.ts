import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuthStore, selectIsAuthenticated } from '@/stores/authStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';

export interface SubscriptionResponse {
  status: string;
  currentPeriodEnd: string | null;
}

/** Exported so logout can `queryClient.removeQueries({ queryKey: subscriptionQueryKey })`. */
export const subscriptionQueryKey = ['subscription', 'me'] as const;

/**
 * Local-only premium override for the app owner to test gated features without a real
 * Stripe subscription. Gated on `MODE === 'development'` rather than `DEV` — Vitest's
 * test environment also sets `DEV: true`, which would otherwise let a local
 * VITE_DEV_UNLOCK_PREMIUM leak into test runs (`.env.local` applies across modes).
 * `MODE` is always 'production' in a `vite build`, so this can never ship. Never used
 * for backend authorization — the server still verifies its own JWT claims independently.
 */
const DEV_UNLOCK_PREMIUM =
  import.meta.env.MODE === 'development' && import.meta.env.VITE_DEV_UNLOCK_PREMIUM === 'true';

/**
 * Fetches the server-authoritative subscription status (only when authenticated) and
 * mirrors `isPremium = status === 'ACTIVE'` into the subscription store. Mounted once
 * high in the tree so login triggers the fetch and logout resets premium to false.
 */
export function useSubscription() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const setIsPremium = useSubscriptionStore((s) => s.setIsPremium);

  const query = useQuery({
    queryKey: subscriptionQueryKey,
    queryFn: () => apiClient.get<SubscriptionResponse>('/subscriptions/me'),
    enabled: isAuthenticated && !DEV_UNLOCK_PREMIUM,
    retry: false,
  });

  useEffect(() => {
    if (DEV_UNLOCK_PREMIUM) {
      setIsPremium(true);
      return;
    }
    if (!isAuthenticated || query.isError) {
      setIsPremium(false);
    } else if (query.data) {
      setIsPremium(query.data.status === 'ACTIVE');
    }
  }, [isAuthenticated, query.data, query.isError, setIsPremium]);

  return query;
}
