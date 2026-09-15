import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FREE_THEMES, PREMIUM_THEMES, isPremiumTheme, isValidTheme, readStoredTheme, useThemeStore } from './themeStore';

const STORAGE_KEY = 'guitar-app-theme';

beforeEach(() => {
  window.localStorage.clear();
  useThemeStore.setState({ theme: 'dark' });
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.classList.remove('dark');
});

describe('themeStore', () => {
  it('exports the 6-theme catalogue split into free and premium', () => {
    expect(FREE_THEMES).toEqual(['dark', 'light']);
    expect(PREMIUM_THEMES).toEqual(['neon', 'mono', 'vibrant', 'minimal']);
  });

  it.each(PREMIUM_THEMES)('isPremiumTheme(%s) is true', (theme) => {
    expect(isPremiumTheme(theme)).toBe(true);
  });

  it.each(FREE_THEMES)('isPremiumTheme(%s) is false', (theme) => {
    expect(isPremiumTheme(theme)).toBe(false);
  });

  describe('dark-class family', () => {
    it.each(['dark', 'neon', 'mono', 'vibrant'] as const)('setTheme(%s) adds the .dark class', (theme) => {
      useThemeStore.getState().setTheme(theme);
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.getAttribute('data-theme')).toBe(theme);
    });

    it.each(['light', 'minimal'] as const)('setTheme(%s) does NOT add the .dark class', (theme) => {
      useThemeStore.getState().setTheme(theme);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(document.documentElement.getAttribute('data-theme')).toBe(theme);
    });

    it('switching from a dark-family theme to a light-family theme removes the .dark class', () => {
      useThemeStore.getState().setTheme('neon');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      useThemeStore.getState().setTheme('minimal');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('persistence', () => {
    it('setTheme persists to localStorage under the existing key', () => {
      useThemeStore.getState().setTheme('vibrant');
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe('vibrant');
    });

    it('readStoredTheme returns the raw premium value, unlike getInitialTheme', () => {
      window.localStorage.setItem(STORAGE_KEY, 'neon');
      expect(readStoredTheme()).toBe('neon');
    });

    it('readStoredTheme returns null when nothing is stored', () => {
      expect(readStoredTheme()).toBeNull();
    });

    it('readStoredTheme returns null for a corrupted/stale stored value (never forwards garbage to setTheme)', () => {
      window.localStorage.setItem(STORAGE_KEY, 'not-a-real-theme');
      expect(readStoredTheme()).toBeNull();
    });

    it('setTheme does not throw when localStorage.setItem throws (private mode / quota)', () => {
      const setItem = vi
        .spyOn(Storage.prototype, 'setItem')
        .mockImplementation(() => {
          throw new DOMException('QuotaExceededError');
        });

      expect(() => useThemeStore.getState().setTheme('vibrant')).not.toThrow();
      // in-memory store still updated even though persistence failed
      expect(useThemeStore.getState().theme).toBe('vibrant');

      setItem.mockRestore();
    });

    it('readStoredTheme returns null (does not throw) when localStorage.getItem throws', () => {
      const getItem = vi
        .spyOn(Storage.prototype, 'getItem')
        .mockImplementation(() => {
          throw new DOMException('SecurityError');
        });

      expect(() => readStoredTheme()).not.toThrow();
      expect(readStoredTheme()).toBeNull();

      getItem.mockRestore();
    });
  });

  describe('isValidTheme (untrusted-input guard)', () => {
    it.each([...FREE_THEMES, ...PREMIUM_THEMES])('accepts the valid theme %s', (theme) => {
      expect(isValidTheme(theme)).toBe(true);
    });

    it.each(['', 'DARK', 'not-a-theme', 'neon ', null, undefined, 42, {}])(
      'rejects the invalid value %o',
      (value) => {
        expect(isValidTheme(value)).toBe(false);
      },
    );
  });

  describe('rapid successive selections (AC2 — no lost update / corrupted state)', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('applies the last theme when several are set back-to-back synchronously', () => {
      const store = useThemeStore.getState();
      store.setTheme('neon');
      store.setTheme('minimal');
      store.setTheme('vibrant');

      expect(useThemeStore.getState().theme).toBe('vibrant');
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe('vibrant');
      // DOM reflects only the final selection — no stale attribute or leftover class
      expect(document.documentElement.getAttribute('data-theme')).toBe('vibrant');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('a rapid dark-family -> light-family -> dark-family sequence ends with the correct .dark class', () => {
      const store = useThemeStore.getState();
      store.setTheme('neon'); // dark-family
      store.setTheme('minimal'); // light-family
      store.setTheme('mono'); // dark-family

      expect(useThemeStore.getState().theme).toBe('mono');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  describe('getInitialTheme narrowing (module-load-time default)', () => {
    it('a stored premium theme name is NOT applied synchronously at load — falls back to dark', async () => {
      window.localStorage.setItem(STORAGE_KEY, 'neon');
      await vi.resetModules();
      const fresh = await import('./themeStore');
      expect(fresh.useThemeStore.getState().theme).toBe('dark');
    });

    it('a stored free theme name IS applied synchronously at load', async () => {
      window.localStorage.setItem(STORAGE_KEY, 'light');
      await vi.resetModules();
      const fresh = await import('./themeStore');
      expect(fresh.useThemeStore.getState().theme).toBe('light');
    });
  });

  describe('toggleTheme stays dark<->light only (AC1 — unchanged free quick-toggle)', () => {
    it('toggles dark -> light', () => {
      useThemeStore.setState({ theme: 'dark' });
      useThemeStore.getState().toggleTheme();
      expect(useThemeStore.getState().theme).toBe('light');
    });

    it('toggles light -> dark', () => {
      useThemeStore.setState({ theme: 'light' });
      useThemeStore.getState().toggleTheme();
      expect(useThemeStore.getState().theme).toBe('dark');
    });

    it('toggling while on a premium theme goes to dark (not back to the premium theme)', () => {
      useThemeStore.setState({ theme: 'neon' });
      useThemeStore.getState().toggleTheme();
      expect(useThemeStore.getState().theme).toBe('dark');
    });
  });
});
