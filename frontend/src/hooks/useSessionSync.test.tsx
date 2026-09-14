import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSessionSync } from './useSessionSync';
import { useAuthStore, DEFAULT_AUTH } from '@/stores/authStore';
import { useSubscriptionStore, DEFAULT_SUBSCRIPTION } from '@/stores/subscriptionStore';
import { useFretboardStore, DEFAULT_FRETBOARD_STATE } from '@/stores/fretboardStore';
import { apiClient } from '@/lib/apiClient';

vi.mock('@/lib/apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), del: vi.fn(), patch: vi.fn() },
}));

const get = apiClient.get as unknown as ReturnType<typeof vi.fn>;
const post = apiClient.post as unknown as ReturnType<typeof vi.fn>;

const SAVED_SESSION = {
  id: 1,
  state: { tuning: 'Drop D', capoPosition: 3, freeformMarks: [{ fret: 5, string: 2 }] },
  updatedAt: '2026-09-14T00:00:00Z',
};

function authenticateAsPremium(userId = 1) {
  useAuthStore.setState({ accessToken: 't', user: { id: userId, email: 'a', name: null } });
  useSubscriptionStore.setState({ isPremium: true });
}

function setUrl(search: string) {
  window.history.pushState({}, '', `/${search}`);
}

beforeEach(() => {
  useAuthStore.setState({ ...DEFAULT_AUTH });
  useSubscriptionStore.setState({ ...DEFAULT_SUBSCRIPTION });
  useFretboardStore.setState({ ...DEFAULT_FRETBOARD_STATE });
  vi.clearAllMocks();
  get.mockResolvedValue(undefined);
  post.mockResolvedValue(undefined);
  setUrl('');
});

afterEach(() => {
  vi.useRealTimers();
  setUrl('');
});

describe('useSessionSync — restore', () => {
  it('restores tuning/capoPosition/freeformMarks when the URL has no session-relevant params', async () => {
    get.mockResolvedValue(SAVED_SESSION);
    authenticateAsPremium();

    renderHook(() => useSessionSync());

    await waitFor(() => expect(useFretboardStore.getState().tuning).toBe('Drop D'));
    expect(useFretboardStore.getState().capoPosition).toBe(3);
    expect(useFretboardStore.getState().freeformMarks).toEqual([{ fret: 5, string: 2 }]);
    expect(get).toHaveBeenCalledWith('/sessions');
  });

  it('does not restore tuning when the URL already specifies ?tuning= (AC7)', async () => {
    setUrl('?tuning=Standard+E');
    get.mockResolvedValue(SAVED_SESSION);
    authenticateAsPremium();
    useFretboardStore.setState({ tuning: 'Standard E' });

    renderHook(() => useSessionSync());

    await waitFor(() => expect(useFretboardStore.getState().capoPosition).toBe(3));
    expect(useFretboardStore.getState().tuning).toBe('Standard E');
  });

  it('does not restore capoPosition when the URL already specifies ?capo= (AC7 — capo IS URL-addressable)', async () => {
    setUrl('?capo=5');
    get.mockResolvedValue(SAVED_SESSION);
    authenticateAsPremium();
    useFretboardStore.setState({ capoPosition: 5 });

    renderHook(() => useSessionSync());

    // tuning still restores — only capo was URL-specified here.
    await waitFor(() => expect(useFretboardStore.getState().tuning).toBe('Drop D'));
    expect(useFretboardStore.getState().capoPosition).toBe(5);
  });

  it('does not restore freeformMarks when the URL already specifies ?marks= (AC7 — marks ARE URL-addressable)', async () => {
    setUrl('?marks=1-1');
    get.mockResolvedValue(SAVED_SESSION);
    authenticateAsPremium();
    useFretboardStore.setState({ freeformMarks: [{ fret: 1, string: 1 }] });

    renderHook(() => useSessionSync());

    await waitFor(() => expect(useFretboardStore.getState().tuning).toBe('Drop D'));
    expect(useFretboardStore.getState().freeformMarks).toEqual([{ fret: 1, string: 1 }]);
  });

  it('does not clobber a field the user already edited before the restore fetch resolved', async () => {
    let resolveGet!: (v: typeof SAVED_SESSION) => void;
    get.mockReturnValue(new Promise((resolve) => { resolveGet = resolve; }));
    authenticateAsPremium();

    renderHook(() => useSessionSync());
    await waitFor(() => expect(get).toHaveBeenCalled());

    // User edits capoPosition while the GET is still in flight.
    act(() => {
      useFretboardStore.getState().setCapoPosition(7);
    });

    // The session resolves with a DIFFERENT capoPosition — the user's in-flight edit must win.
    await act(async () => {
      resolveGet(SAVED_SESSION);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(useFretboardStore.getState().capoPosition).toBe(7);
    // tuning was untouched by the user, so it still restores normally.
    expect(useFretboardStore.getState().tuning).toBe('Drop D');
  });

  it('does nothing when no session has ever been saved (204)', async () => {
    get.mockResolvedValue(undefined);
    authenticateAsPremium();
    const before = useFretboardStore.getState();

    renderHook(() => useSessionSync());

    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(useFretboardStore.getState().tuning).toBe(before.tuning);
    expect(useFretboardStore.getState().capoPosition).toBe(before.capoPosition);
  });

  it('does not restore while unauthenticated or non-premium', async () => {
    renderHook(() => useSessionSync());

    await new Promise((r) => setTimeout(r, 10));
    expect(get).not.toHaveBeenCalled();
  });

  it('does not reset fretboard state on initial mount for an anonymous/free user (not a logout transition)', async () => {
    // Simulates a free/anonymous user who arrived via a shared URL — no auth, but tuning is
    // already set (as useUrlState would have done). The hook starting "unauthenticated" on
    // mount must not be mistaken for a logout and wipe this.
    useFretboardStore.setState({ tuning: 'Drop D', capoPosition: 4 });

    renderHook(() => useSessionSync());
    await new Promise((r) => setTimeout(r, 10));

    expect(useFretboardStore.getState().tuning).toBe('Drop D');
    expect(useFretboardStore.getState().capoPosition).toBe(4);
  });

  it('resets and restores fresh for a different user who logs in on the same tab', async () => {
    get.mockResolvedValue(SAVED_SESSION);
    authenticateAsPremium(1);

    const { rerender } = renderHook(() => useSessionSync());
    await waitFor(() => expect(useFretboardStore.getState().tuning).toBe('Drop D'));
    expect(get).toHaveBeenCalledTimes(1);

    // User 1 logs out.
    act(() => {
      useAuthStore.setState({ ...DEFAULT_AUTH });
      useSubscriptionStore.setState({ ...DEFAULT_SUBSCRIPTION });
    });
    rerender();

    // User 2 logs in with their own saved session.
    const USER_2_SESSION = {
      id: 2,
      state: { tuning: 'Open G', capoPosition: 1, freeformMarks: [] },
      updatedAt: '2026-09-14T00:00:00Z',
    };
    get.mockResolvedValue(USER_2_SESSION);
    act(() => {
      authenticateAsPremium(2);
    });
    rerender();

    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(useFretboardStore.getState().tuning).toBe('Open G'));
    expect(useFretboardStore.getState().capoPosition).toBe(1);
  });
});

describe('useSessionSync — auto-save', () => {
  it('debounces rapid changes into a single POST', async () => {
    authenticateAsPremium();

    const { rerender } = renderHook(() => useSessionSync());
    // Let the restore effect's promise chain settle (204 → restoreSettledRef becomes true)
    // on the real microtask queue before switching to fake timers for the debounce itself.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(get).toHaveBeenCalled();

    vi.useFakeTimers();
    act(() => {
      useFretboardStore.getState().setCapoPosition(1);
    });
    rerender();
    act(() => {
      useFretboardStore.getState().setCapoPosition(2);
    });
    rerender();
    act(() => {
      useFretboardStore.getState().setCapoPosition(3);
    });
    rerender();

    expect(post).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith('/sessions', expect.objectContaining({ capoPosition: 3 }));
  });

  it('does not fire a redundant autosave immediately after a successful restore', async () => {
    get.mockResolvedValue(SAVED_SESSION); // differs from DEFAULT_FRETBOARD_STATE
    authenticateAsPremium();

    renderHook(() => useSessionSync());
    await waitFor(() => expect(useFretboardStore.getState().tuning).toBe('Drop D'));

    vi.useFakeTimers();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(post).not.toHaveBeenCalled();
  });

  it('does not auto-save when not premium', async () => {
    useAuthStore.setState({ accessToken: 't', user: { id: 1, email: 'a', name: null } });
    useSubscriptionStore.setState({ isPremium: false });

    const { rerender } = renderHook(() => useSessionSync());
    await act(async () => {
      await Promise.resolve();
    });

    vi.useFakeTimers();
    act(() => {
      useFretboardStore.getState().setCapoPosition(5);
    });
    rerender();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(post).not.toHaveBeenCalled();
  });
});
