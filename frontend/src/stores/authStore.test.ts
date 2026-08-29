import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore, DEFAULT_AUTH } from '@/stores/authStore';

beforeEach(() => {
  useAuthStore.setState({ ...DEFAULT_AUTH });
});

describe('authStore', () => {
  it('defaults to unauthenticated', () => {
    const s = useAuthStore.getState();
    expect(s.accessToken).toBeNull();
    expect(s.user).toBeNull();
    expect(s.isAuthenticated).toBe(false);
  });

  it('setAuth stores token + user and derives isAuthenticated true', () => {
    useAuthStore.getState().setAuth({ accessToken: 't', user: { id: 1, email: 'a@b.c', name: 'A' } });
    const s = useAuthStore.getState();
    expect(s.accessToken).toBe('t');
    expect(s.user?.email).toBe('a@b.c');
    expect(s.isAuthenticated).toBe(true);
  });

  it('clearAuth resets everything to unauthenticated', () => {
    useAuthStore.getState().setAuth({ accessToken: 't', user: { id: 1, email: 'a@b.c', name: null } });
    useAuthStore.getState().clearAuth();
    const s = useAuthStore.getState();
    expect(s.accessToken).toBeNull();
    expect(s.user).toBeNull();
    expect(s.isAuthenticated).toBe(false);
  });
});
