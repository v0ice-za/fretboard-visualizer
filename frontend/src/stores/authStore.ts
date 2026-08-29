import { create } from 'zustand';
import type { AuthResponseDto, UserResponseDto } from '@/types/api';

interface AuthStore {
  accessToken: string | null;
  user: UserResponseDto | null;
  setAuth: (res: AuthResponseDto) => void;
  clearAuth: () => void;
}

/**
 * The access token is memory-only by design — the httpOnly refresh cookie is the durable
 * credential. `isAuthenticated` is intentionally NOT stored here: it's derived from
 * `accessToken` via {@link selectIsAuthenticated} so it can never drift out of sync with the
 * token (a stored, separately-set boolean could only be kept correct by convention).
 */
export const DEFAULT_AUTH = {
  accessToken: null,
  user: null,
} as const;

export const useAuthStore = create<AuthStore>((set) => ({
  ...DEFAULT_AUTH,
  setAuth: (res) => set({ accessToken: res.accessToken, user: res.user }),
  clearAuth: () => set({ ...DEFAULT_AUTH }),
}));

/** Selector: `useAuthStore(selectIsAuthenticated)` or `selectIsAuthenticated(useAuthStore.getState())`. */
export const selectIsAuthenticated = (s: Pick<AuthStore, 'accessToken'>): boolean => s.accessToken !== null;
