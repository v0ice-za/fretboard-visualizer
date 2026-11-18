import { beforeEach, describe, expect, it, vi } from 'vitest';

const STORAGE_KEY = 'guitar-app-left-handed';

async function freshStore() {
  vi.resetModules();
  return (await import('./preferencesStore')).usePreferencesStore;
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('preferencesStore', () => {
  it('defaults to right-handed', async () => {
    const store = await freshStore();
    expect(store.getState().leftHanded).toBe(false);
  });

  it('setLeftHanded / toggleLeftHanded update state and persist JSON', async () => {
    const store = await freshStore();
    store.getState().setLeftHanded(true);
    expect(store.getState().leftHanded).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({ leftHanded: true });
    store.getState().toggleLeftHanded();
    expect(store.getState().leftHanded).toBe(false);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({ leftHanded: false });
  });

  it('hydrates a persisted preference on load', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ leftHanded: true }));
    const store = await freshStore();
    expect(store.getState().leftHanded).toBe(true);
  });

  it.each([['{not json'], ['"yes"'], [JSON.stringify({ leftHanded: 'yes' })], [JSON.stringify({ leftHanded: 1 })], ['null']])(
    'falls back to right-handed on invalid stored value %s',
    async (raw) => {
      localStorage.setItem(STORAGE_KEY, raw);
      const store = await freshStore();
      expect(store.getState().leftHanded).toBe(false);
    }
  );

  it('survives a THROWING localStorage (Safari private mode)', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const store = await freshStore();
    expect(store.getState().leftHanded).toBe(false);
    store.getState().toggleLeftHanded();
    expect(store.getState().leftHanded).toBe(true);
  });
});
