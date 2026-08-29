import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuthStore } from '@/stores/authStore';
import type { AuthResponseDto } from '@/types/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type Mode = 'login' | 'register';

/** Map the backend error `code` (carried in error.message) to inline copy. */
function messageFor(code: string, mode: Mode): string {
  switch (code) {
    case 'INVALID_CREDENTIALS':
      return 'Email or password is incorrect.';
    case 'EMAIL_ALREADY_EXISTS':
      return 'That email is already registered.';
    case 'VALIDATION_ERROR':
      return mode === 'register'
        ? 'Enter a valid email and a password of at least 8 characters.'
        : 'Enter a valid email and password.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

interface Props {
  /** Called after the store is populated so the parent can dismiss the overlay. */
  onAuthenticated: () => void;
}

export function EmailAuthForm({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const setAuth = useAuthStore((s) => s.setAuth);

  const mutation = useMutation({
    mutationFn: (vars: { email: string; password: string; mode: Mode }) =>
      apiClient.post<AuthResponseDto>(
        vars.mode === 'register' ? '/auth/register' : '/auth/login',
        { email: vars.email, password: vars.password },
      ),
    onSuccess: (res) => {
      setAuth(res);
      onAuthenticated();
    },
  });

  const errorCode = mutation.error instanceof Error ? mutation.error.message : null;

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate({ email, password, mode });
      }}
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="auth-email" className="text-xs text-muted-foreground">Email</label>
        <Input
          id="auth-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="auth-password" className="text-xs text-muted-foreground">Password</label>
        <Input
          id="auth-password"
          type="password"
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {errorCode && (
        <p role="alert" className="text-xs text-destructive">
          {messageFor(errorCode, mode)}
        </p>
      )}

      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending
          ? 'Please wait…'
          : mode === 'login'
            ? 'Log in'
            : 'Create account'}
      </Button>

      <button
        type="button"
        className="text-xs text-muted-foreground hover:text-foreground"
        onClick={() => {
          setMode(mode === 'login' ? 'register' : 'login');
          mutation.reset();
        }}
      >
        {mode === 'login'
          ? "Don't have an account? Register"
          : 'Already have an account? Log in'}
      </button>
    </form>
  );
}
