import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { EmailAuthForm } from './EmailAuthForm';
import { GoogleAuthButton } from './GoogleAuthButton';
import { useAuthStore } from '@/stores/authStore';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Auth overlay (Sheet, per UX spec): email/password form + divider + Google sign-in.
 * Escape / click-outside / close button dismiss it via the Sheet primitive.
 */
export function LoginModal({ open, onOpenChange }: Props) {
  const setAuth = useAuthStore((s) => s.setAuth);
  const [googleFailed, setGoogleFailed] = useState(false);

  // The Sheet stays mounted across close/reopen, so clear a stale error as part of the close
  // event itself (not a useEffect — this is a direct response to the user's action, not a
  // sync-with-external-system concern).
  const handleOpenChange = (next: boolean) => {
    if (!next) setGoogleFailed(false);
    onOpenChange(next);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full gap-4 p-4 sm:max-w-sm">
        <SheetHeader className="p-0">
          <SheetTitle>Sign in</SheetTitle>
          <SheetDescription>Log in or create an account to save your work.</SheetDescription>
        </SheetHeader>

        <EmailAuthForm onAuthenticated={() => handleOpenChange(false)} />

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        {googleFailed && (
          <p role="alert" className="text-xs text-destructive">
            Google sign-in failed. Please try again.
          </p>
        )}

        <GoogleAuthButton
          onSuccess={(res) => {
            setAuth(res);
            handleOpenChange(false);
          }}
          onError={() => setGoogleFailed(true)}
        />
      </SheetContent>
    </Sheet>
  );
}
