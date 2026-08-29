import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiClient, __resetApiClientState } from '@/lib/apiClient';
import { useAuthStore, DEFAULT_AUTH } from '@/stores/authStore';

const USER = { id: 1, email: 'a@b.c', name: null };

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

beforeEach(() => {
  __resetApiClientState();
  useAuthStore.setState({ ...DEFAULT_AUTH });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiClient — request basics', () => {
  it('injects the Bearer token and includes credentials', async () => {
    useAuthStore.getState().setAuth({ accessToken: 'tok', user: USER });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await apiClient.get('/subscriptions/me');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/v1/subscriptions/me');
    expect(init.credentials).toBe('include');
    expect((init.headers as Headers).get('Authorization')).toBe('Bearer tok');
  });

  it('throws an Error carrying the envelope code on non-2xx', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      jsonResponse(409, { error: { code: 'EMAIL_ALREADY_EXISTS' } }),
    ));
    await expect(apiClient.post('/auth/register', {})).rejects.toThrow('EMAIL_ALREADY_EXISTS');
  });
});

describe('apiClient — 401 refresh + single retry', () => {
  it('refreshes once and replays the original request with the new token', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(401, { error: { code: 'UNAUTHORIZED' } }))
      .mockResolvedValueOnce(jsonResponse(200, { accessToken: 'new-token', user: USER }))
      .mockResolvedValueOnce(jsonResponse(200, { status: 'NONE', currentPeriodEnd: null }));
    vi.stubGlobal('fetch', fetchMock);

    const data = await apiClient.get('/subscriptions/me');

    expect(data).toEqual({ status: 'NONE', currentPeriodEnd: null });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(useAuthStore.getState().accessToken).toBe('new-token');
    const replayInit = fetchMock.mock.calls[2][1];
    expect((replayInit.headers as Headers).get('Authorization')).toBe('Bearer new-token');
  });

  it('shares a single refresh across concurrent 401s (no stampede)', async () => {
    let refreshCount = 0;
    const fetchMock = vi.fn((url: string) => {
      if (url.endsWith('/auth/refresh')) {
        refreshCount++;
        return Promise.resolve(jsonResponse(200, { accessToken: 't', user: USER }));
      }
      return Promise.resolve(
        useAuthStore.getState().accessToken === 't'
          ? jsonResponse(200, { ok: true })
          : jsonResponse(401, { error: { code: 'UNAUTHORIZED' } }),
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    await Promise.all([apiClient.get('/a'), apiClient.get('/b')]);

    expect(refreshCount).toBe(1);
  });

  it('does not loop when the replay still returns 401', async () => {
    const fetchMock = vi.fn((url: string) =>
      url.endsWith('/auth/refresh')
        ? Promise.resolve(jsonResponse(200, { accessToken: 't', user: USER }))
        : Promise.resolve(jsonResponse(401, { error: { code: 'UNAUTHORIZED' } })),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiClient.get('/x')).rejects.toThrow('UNAUTHORIZED');
    // original 401 + one refresh + one replay 401 = 3, no further refresh
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('clears auth and surfaces the original 401 when refresh fails', async () => {
    useAuthStore.getState().setAuth({ accessToken: 'stale', user: USER });
    const fetchMock = vi.fn((url: string) =>
      url.endsWith('/auth/refresh')
        ? Promise.resolve(jsonResponse(401, { error: { code: 'INVALID_REFRESH_TOKEN' } }))
        : Promise.resolve(jsonResponse(401, { error: { code: 'UNAUTHORIZED' } })),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiClient.get('/x')).rejects.toThrow('UNAUTHORIZED');
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().accessToken).toBeNull();
  });
});
