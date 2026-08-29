import { GoogleLogin } from '@react-oauth/google';
import { apiClient } from '@/lib/apiClient';
import type { AuthResponseDto } from '@/types/api';

interface Props {
  onSuccess: (result: AuthResponseDto) => void;
  onError?: (err: Error) => void;
}

/**
 * Renders Google's One Tap / Identity Services sign-in button. On consent it POSTs the
 * returned ID token to the backend (via {@link apiClient}, which sends the credentialed
 * cookie and injects/refreshes tokens) and surfaces the {@link AuthResponseDto} via onSuccess.
 */
export function GoogleAuthButton({ onSuccess, onError }: Props) {
  return (
    <GoogleLogin
      onSuccess={async (credentialResponse) => {
        try {
          const idToken = credentialResponse.credential;
          if (!idToken) {
            throw new Error('GOOGLE_AUTH_FAILED');
          }
          const res = await apiClient.post<AuthResponseDto>('/auth/google', { idToken });
          onSuccess(res);
        } catch (err) {
          onError?.(err instanceof Error ? err : new Error(String(err)));
        }
      }}
      onError={() => onError?.(new Error('GOOGLE_AUTH_CANCELLED'))}
    />
  );
}
