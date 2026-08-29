import { create } from 'zustand';
import type { AuthResponseDto, UserResponseDto } from '@/types/api';

interface AuthStore {
  accessToken: string | null;
  user: UserResponseDto | null;
  isAuthenticated: boolean;
  setAuth: (res: AuthResponseDto) => void;
  clearAuth: () => void;
}

/**
 * `isAuthenticated` is stored alongside the token (kept in sync by setAuth/clearAuth)
 * so React selectors and the apiClient agree without deriving it per-render. The access
 * token is memory-only by design — the httpOnly refresh cookie is the durable credential.
 */
export const DEFAULT_AUTH = {
  accessToken: null,
  user: null,
  isAuthenticated: false,
} as const;

export const useAuthStore = create<AuthStore>((set) => ({
  ...DEFAULT_AUTH,
  setAuth: (res) => set({ accessToken: res.accessToken, user: res.user, isAuthenticated: true }),
  clearAuth: () => set({ ...DEFAULT_AUTH }),
}));
