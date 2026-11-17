import { CHORDS } from '@/data/chords.js';
import { chordFrequencies } from '@/lib/pitch';
import { playFrequencies, setVolume } from '@/lib/audioEngine';
import { useAudioStore } from '@/stores/audioStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';

/**
 * Play a chord aloud — the single gated entry point for chord audio.
 *
 * Enforces the one gate every call site would otherwise repeat: audio is a
 * PREMIUM feature. Reading the store here (via getState, the same pattern
 * apiClient uses for auth) keeps call sites to a one-liner and the gate
 * impossible to forget. Callers must only invoke this from an explicit, dedicated
 * Play action (never on select/browse/step — Story 7.2); that explicit click is
 * the user's consent, so there is no separate on/off "sound" switch to check.
 * No-op when not premium, the chord type is unknown, or Web Audio is unavailable.
 */
export function playChord(chordType: string, root: string): void {
  if (!useSubscriptionStore.getState().isPremium) return;
  const { volume } = useAudioStore.getState();

  const def = (CHORDS as Record<string, { intervals: number[] }>)[chordType];
  if (!def) return;

  const freqs = chordFrequencies(root, def.intervals);
  if (freqs.length === 0) return;

  setVolume(volume);
  playFrequencies(freqs);
}
