import { CHORDS } from '@/data/chords.js';
import { chordFrequencies } from '@/lib/pitch';
import { playFrequencies, setVolume } from '@/lib/audioEngine';
import { useAudioStore } from '@/stores/audioStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';

/**
 * Play a chord aloud — the single gated entry point for chord audio.
 *
 * Enforces the two gates every call site would otherwise repeat: audio is a
 * PREMIUM feature, and only sounds when the user has switched sound on. Reading
 * the stores here (via getState, the same pattern apiClient uses for auth) keeps
 * call sites to a one-liner and the gate impossible to forget. No-op when either
 * gate is closed, the chord type is unknown, or Web Audio is unavailable.
 */
export function playChord(chordType: string, root: string): void {
  if (!useSubscriptionStore.getState().isPremium) return;
  const { enabled, volume } = useAudioStore.getState();
  if (!enabled) return;

  const def = (CHORDS as Record<string, { intervals: number[] }>)[chordType];
  if (!def) return;

  const freqs = chordFrequencies(root, def.intervals);
  if (freqs.length === 0) return;

  setVolume(volume);
  playFrequencies(freqs);
}
