import { beforeEach, describe, expect, it, vi } from 'vitest';
import { playChord } from './playChord';
import { playFrequencies } from './audioEngine';
import { useAudioStore } from '@/stores/audioStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';

vi.mock('./audioEngine', () => ({ playFrequencies: vi.fn(), setVolume: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  useSubscriptionStore.setState({ isPremium: true });
  useAudioStore.setState({ enabled: true, volume: 0.7 });
});

describe('playChord gating', () => {
  it('plays chord frequencies when premium AND sound enabled', () => {
    playChord('Major', 'C');
    expect(playFrequencies).toHaveBeenCalledTimes(1);
    const freqs = (playFrequencies as ReturnType<typeof vi.fn>).mock.calls[0][0] as number[];
    expect(freqs).toHaveLength(3); // C E G
    expect(freqs[0]).toBeCloseTo(130.81, 1);
  });

  it('is silent for non-premium users', () => {
    useSubscriptionStore.setState({ isPremium: false });
    playChord('Major', 'C');
    expect(playFrequencies).not.toHaveBeenCalled();
  });

  it('is silent when sound is disabled', () => {
    useAudioStore.setState({ enabled: false });
    playChord('Major', 'C');
    expect(playFrequencies).not.toHaveBeenCalled();
  });

  it('is silent for an unknown chord type', () => {
    playChord('Nope', 'C');
    expect(playFrequencies).not.toHaveBeenCalled();
  });
});
