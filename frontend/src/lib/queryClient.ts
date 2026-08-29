import { QueryClient } from '@tanstack/react-query';

/**
 * App-wide TanStack Query client. `retry: false` because auth-sensitive queries
 * (e.g. `/subscriptions/me`) should surface a 401 immediately — the apiClient already
 * owns the one-shot refresh+replay, so a query-level retry would be redundant.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});
