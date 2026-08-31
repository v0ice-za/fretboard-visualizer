import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { TUNINGS } from '@/data/tunings.js';
import { toPitchClass } from '@/utils/fretboardUtils';
import type { CustomTuning } from '@/types/api';

/** Exported so the creator can invalidate after a successful save. */
export const customTuningsQueryKey = ['tunings', 'custom'] as const;

/**
 * The caller's saved custom tunings (premium only — the endpoint is `ROLE_PREMIUM`).
 * Gated on `isPremium` so free users never fire the request.
 */
export function useCustomTunings() {
  const isPremium = useSubscriptionStore((s) => s.isPremium);
  return useQuery({
    queryKey: customTuningsQueryKey,
    queryFn: () => apiClient.get<CustomTuning[]>('/tunings'),
    enabled: isPremium,
  });
}

/**
 * Resolves the pitch-class open strings for the active tuning name — from `TUNINGS` for a
 * predefined tuning, or from the user's custom tunings (octave-stripped) for a custom one.
 * Returns `undefined` for a predefined tuning so `FretboardCanvas` uses its own by-name lookup
 * (byte-identical to prior behavior); returns the string array only for a custom tuning.
 */
export function resolveCustomTuningStrings(
  tuningName: string,
  customs: CustomTuning[] | undefined,
): string[] | undefined {
  if ((TUNINGS as Record<string, string[]>)[tuningName]) return undefined;
  const match = customs?.find((t) => t.name === tuningName);
  return match ? match.strings.map(toPitchClass) : undefined;
}
