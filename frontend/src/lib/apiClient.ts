import { useAuthStore } from '@/stores/authStore';
import type { AuthResponseDto } from '@/types/api';

/**
 * Sole HTTP boundary for the app. Every request rides the httpOnly refresh cookie
 * (`credentials: 'include'`), injects the in-memory access token as a Bearer header,
 * and transparently refreshes + replays once on a 401. Components/hooks branch on
 * `error.message` (the backend envelope's `code`), never on HTTP status.
 */

const BASE = import.meta.env.VITE_API_URL ?? '';

export interface ApiError extends Error {
  /** Backend error envelope code (SCREAMING_SNAKE_CASE); also mirrored in `message`. */
  code: string;
  /** HTTP status, attached for debugging only — never branch on it. */
  status?: number;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
}

/** Shared in-flight refresh so concurrent 401s spend the rotating cookie exactly once. */
let refreshInFlight: Promise<void> | null = null;
/** Guards the one-shot silent bootstrap so StrictMode double-mount can't double-refresh. */
let bootstrapped = false;

function buildHeaders(hasBody: boolean): Headers {
  const headers = new Headers();
  if (hasBody) headers.set('Content-Type', 'application/json');
  const token = useAuthStore.getState().accessToken;
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return headers;
}

async function toApiError(res: Response): Promise<ApiError> {
  let code = 'REQUEST_FAILED';
  try {
    const body = await res.json();
    code = body?.error?.code ?? code;
  } catch {
    // Absent or non-JSON body — keep the fallback code.
  }
  const err = new Error(code) as ApiError;
  err.code = code;
  err.status = res.status;
  return err;
}

/**
 * Single-flight refresh. The first 401 fires `POST /auth/refresh`; concurrent 401s
 * await the same promise (no stampede — the refresh endpoint rotates the cookie on
 * every call). Success updates the auth store; failure clears the session and rejects.
 * Never routed back through the 401 handler.
 */
function ensureRefreshed(): Promise<void> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const res = await fetch(`${BASE}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        useAuthStore.getState().clearAuth();
        throw await toApiError(res);
      }
      const data = (await res.json()) as AuthResponseDto;
      useAuthStore.getState().setAuth(data);
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function request<T>(path: string, options: RequestOptions = {}, retried = false): Promise<T> {
  const { method = 'GET', body } = options;
  const hasBody = body !== undefined;

  const res = await fetch(`${BASE}/api/v1${path}`, {
    method,
    credentials: 'include',
    headers: buildHeaders(hasBody),
    body: hasBody ? JSON.stringify(body) : undefined,
  });

  // Transparent refresh + single replay. `/auth/refresh` is special-cased to avoid a loop.
  if (res.status === 401 && path !== '/auth/refresh' && !retried) {
    try {
      await ensureRefreshed();
    } catch {
      // Refresh failed — session already cleared; surface the original 401.
      throw await toApiError(res);
    }
    return request<T>(path, options, true);
  }

  if (!res.ok) {
    throw await toApiError(res);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

/**
 * One-shot silent session restore on app load. The access token is memory-only, so a
 * hard reload lands unauthenticated; a valid refresh cookie restores the session with
 * no visible sign-out flash. Failure (no/expired cookie) leaves the app signed out.
 */
export async function bootstrapAuth(): Promise<void> {
  if (bootstrapped) return;
  bootstrapped = true;
  try {
    await ensureRefreshed();
  } catch {
    // No valid refresh cookie — remain signed out.
  }
}

/** Test-only: reset module-level singletons between cases. */
export function __resetApiClientState(): void {
  refreshInFlight = null;
  bootstrapped = false;
}

export default apiClient;
