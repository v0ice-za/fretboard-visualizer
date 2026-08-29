import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuthStore } from '@/stores/authStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';

export interface SubscriptionResponse {
  status: string;
  currentPeriodEnd: string | null;
}

/** Exported so logout can `queryClient.removeQueries({ queryKey: subscriptionQueryKey })`. */
export const subscriptionQueryKey = ['subscription', 'me'] as const;

/**
 * Fetches the server-authoritative subscription status (only when authenticated) and
 * mirrors `isPremium = status === 'ACTIVE'` into the subscription store. Mounted once
 * high in the tree so login triggers the fetch and logout resets premium to false.
 */
export function useSubscription() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setIsPremium = useSubscriptionStore((s) => s.setIsPremium);

  const query = useQuery({
    queryKey: subscriptionQueryKey,
    queryFn: () => apiClient.get<SubscriptionResponse>('/subscriptions/me'),
    enabled: isAuthenticated,
    retry: false,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      setIsPremium(false);
    } else if (query.data) {
      setIsPremium(query.data.status === 'ACTIVE');
    }
  }, [isAuthenticated, query.data, setIsPremium]);

  return query;
}
