import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useThemeGuard } from './useThemeGuard';
import { useAuthStore, DEFAULT_AUTH } from '@/stores/authStore';
import { useSubscriptionStore, DEFAULT_SUBSCRIPTION } from '@/stores/subscriptionStore';
import { useThemeStore } from '@/stores/themeStore';

const STORAGE_KEY = 'guitar-app-theme';

function setEntitled(entitled: boolean) {
  useAuthStore.setState(entitled ? { accessToken: 't', user: { id: 1, email: 'a', name: null } } : { ...DEFAULT_AUTH });
  useSubscriptionStore.setState({ isPremium: entitled });
}

beforeEach(() => {
  window.localStorage.clear();
  useAuthStore.setState({ ...DEFAULT_AUTH });
  useSubscriptionStore.setState({ ...DEFAULT_SUBSCRIPTION });
  useThemeStore.setState({ theme: 'dark' });
});

describe('useThemeGuard — restore', () => {
  it('restores a stored premium theme once entitlement resolves true', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'neon');
    renderHook(() => useThemeGuard());

    setEntitled(true);

    await waitFor(() => expect(useThemeStore.getState().theme).toBe('neon'));
  });

  it('does nothing when never entitled', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'neon');
    renderHook(() => useThemeGuard());

    // give effects a tick — theme should still be the pre-existing default
    await new Promise((r) => setTimeout(r, 0));
    expect(useThemeStore.getState().theme).toBe('dark');
  });

  it('does not force a restore for a stored free theme name (already handled by getInitialTheme)', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'light');
    renderHook(() => useThemeGuard());

    setEntitled(true);

    await new Promise((r) => setTimeout(r, 0));
    expect(useThemeStore.getState().theme).toBe('dark'); // unchanged — not forced to 'light'
  });

  it('restores again after a downgrade-then-re-entitle transition (e.g. a different user logging into the same tab)', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'mono');
    renderHook(() => useThemeGuard());

    setEntitled(true);
    await waitFor(() => expect(useThemeStore.getState().theme).toBe('mono'));

    setEntitled(false);
    await waitFor(() => expect(useThemeStore.getState().theme).toBe('dark'));

    window.localStorage.setItem(STORAGE_KEY, 'vibrant');
    setEntitled(true);
    await waitFor(() => expect(useThemeStore.getState().theme).toBe('vibrant'));
  });
});

describe('useThemeGuard — downgrade fallback', () => {
  it('falls back to dark on logout while a premium theme is active', async () => {
    setEntitled(true);
    useThemeStore.setState({ theme: 'vibrant' });
    renderHook(() => useThemeGuard());

    setEntitled(false);

    await waitFor(() => expect(useThemeStore.getState().theme).toBe('dark'));
  });

  it('falls back to dark on subscription expiry while staying logged in', async () => {
    setEntitled(true);
    useThemeStore.setState({ theme: 'minimal' });
    renderHook(() => useThemeGuard());

    // stay authenticated, only lose premium
    useSubscriptionStore.setState({ isPremium: false });

    await waitFor(() => expect(useThemeStore.getState().theme).toBe('dark'));
  });

  it('does NOT reset a free theme on logout', async () => {
    setEntitled(true);
    useThemeStore.setState({ theme: 'light' });
    renderHook(() => useThemeGuard());

    setEntitled(false);

    await new Promise((r) => setTimeout(r, 0));
    expect(useThemeStore.getState().theme).toBe('light');
  });

  it('does NOT fire on initial mount for a non-entitled user, even if the theme were somehow already premium', async () => {
    // Defensive edge case: theme is set to a premium name directly (bypassing the
    // normal flow) before the hook ever mounts, and the user is never entitled.
    // The fallback must only fire on a TRUE->FALSE transition, not on "currently
    // false" (which is also true here on mount) — mirrors 4.4's exact guard-ref bug.
    useThemeStore.setState({ theme: 'neon' });
    renderHook(() => useThemeGuard());

    await new Promise((r) => setTimeout(r, 0));
    expect(useThemeStore.getState().theme).toBe('neon'); // untouched — no transition occurred
  });
});
