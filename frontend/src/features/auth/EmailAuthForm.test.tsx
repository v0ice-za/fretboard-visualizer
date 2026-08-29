import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EmailAuthForm } from './EmailAuthForm';
import { useAuthStore, DEFAULT_AUTH } from '@/stores/authStore';
import { apiClient } from '@/lib/apiClient';

vi.mock('@/lib/apiClient', () => ({
  apiClient: { post: vi.fn(), get: vi.fn(), del: vi.fn() },
}));

const post = apiClient.post as unknown as ReturnType<typeof vi.fn>;

function renderForm() {
  const onAuthenticated = vi.fn();
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={qc}>
      <EmailAuthForm onAuthenticated={onAuthenticated} />
    </QueryClientProvider>,
  );
  return { onAuthenticated };
}

beforeEach(() => {
  useAuthStore.setState({ ...DEFAULT_AUTH });
  vi.clearAllMocks();
});

describe('EmailAuthForm', () => {
  it('login success populates the store and calls onAuthenticated', async () => {
    post.mockResolvedValue({ accessToken: 'tok', user: { id: 1, email: 'a@b.c', name: 'A' } });
    const user = userEvent.setup();
    const { onAuthenticated } = renderForm();

    await user.type(screen.getByLabelText('Email'), 'a@b.c');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() => expect(useAuthStore.getState().accessToken).toBe('tok'));
    expect(post).toHaveBeenCalledWith('/auth/login', { email: 'a@b.c', password: 'password123' });
    expect(onAuthenticated).toHaveBeenCalled();
  });

  it('renders an inline error for INVALID_CREDENTIALS', async () => {
    post.mockRejectedValue(new Error('INVALID_CREDENTIALS'));
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText('Email'), 'a@b.c');
    await user.type(screen.getByLabelText('Password'), 'wrongpass');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect.');
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('register mode posts to /auth/register', async () => {
    post.mockResolvedValue({ accessToken: 't', user: { id: 2, email: 'new@b.c', name: null } });
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: /Register/ }));
    await user.type(screen.getByLabelText('Email'), 'new@b.c');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/auth/register', { email: 'new@b.c', password: 'password123' }),
    );
  });
});
