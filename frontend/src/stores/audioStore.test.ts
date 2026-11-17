import { beforeEach, describe, expect, it, vi } from 'vitest';

// The store calls the engine's setVolume on volume change — stub it (no Web Audio in jsdom).
vi.mock('@/lib/audioEngine', () => ({ setVolume: vi.fn() }));

const STORAGE_KEY = 'guitar-app-audio';

async function freshStore() {
  vi.resetModules();
  return (await import('./audioStore')).useAudioStore;
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('audioStore', () => {
  it('defaults to volume 0.7', async () => {
    const store = await freshStore();
    expect(store.getState().volume).toBe(0.7);
  });

  it('setVolume clamps to [0,1], persists, and drives the engine', async () => {
    const { setVolume } = await import('@/lib/audioEngine');
    const store = await freshStore();
    store.getState().setVolume(2);
    expect(store.getState().volume).toBe(1);
    store.getState().setVolume(-1);
    expect(store.getState().volume).toBe(0);
    expect(setVolume).toHaveBeenCalledWith(0);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).volume).toBe(0);
  });

  it('hydrates persisted volume on load', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ volume: 0.3 }));
    const store = await freshStore();
    expect(store.getState().volume).toBe(0.3);
  });

  it('ignores a pre-7.2 persisted `enabled` field and still hydrates volume', async () => {
    // Older versions also stored the now-retired Sound toggle alongside volume.
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: true, volume: 0.42 }));
    const store = await freshStore();
    expect(store.getState().volume).toBe(0.42);
    expect('enabled' in store.getState()).toBe(false);
  });

  it('falls back to defaults on corrupted storage', async () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    const store = await freshStore();
    expect(store.getState().volume).toBe(0.7);
  });

  it('survives a THROWING localStorage (Safari private mode)', async () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const store = await freshStore();
    expect(store.getState().volume).toBe(0.7);
    spy.mockRestore();
  });
});
