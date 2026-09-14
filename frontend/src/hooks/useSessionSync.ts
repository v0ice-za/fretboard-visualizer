import { useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { useAuthStore, selectIsAuthenticated } from '@/stores/authStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { useFretboardStore, DEFAULT_FRETBOARD_STATE } from '@/stores/fretboardStore';
import type { SessionResponseDto, SessionStateDto } from '@/types/api';

const AUTOSAVE_DEBOUNCE_MS = 1000;

/**
 * Premium session persistence (Story 4.4): restores the last saved fretboard state once
 * (after auth + premium are both confirmed), then auto-saves on change, debounced, for as
 * long as the user stays authenticated + premium.
 *
 * Restore honours AC7 per-field, not all-or-nothing: `tuning`/`capoPosition`/`freeformMarks`
 * are ALL URL-addressable (`?tuning=`, `?capo=`, `?marks=` — see `useUrlState.ts`; an earlier
 * draft of this hook incorrectly assumed only `tuning` was, caught in code review), so each
 * field only restores if the URL didn't already set it AND it still holds its app default
 * (the latter also protects a user edit that races ahead of the restore fetch from being
 * silently overwritten once the fetch resolves).
 */
export function useSessionSync() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const isPremium = useSubscriptionStore((s) => s.isPremium);
  const { tuning, capoPosition, freeformMarks, setTuning, setCapoPosition, setFreeformMarks } =
    useFretboardStore();

  // `useUrlState` unconditionally writes tuning/key/scale/capo/marks (whichever are non-default)
  // into the URL within one effect-flush of mount, so by the time any EFFECT in this hook runs,
  // the live URL could already reflect state this hook itself just restored — checking it from
  // an effect would be unreliable. A lazy `useState` initializer runs during the render phase,
  // strictly before any effect (including `useUrlState`'s) commits, so this captures the URL
  // the user actually navigated with.
  const [urlHad] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return { tuning: params.has('tuning'), capo: params.has('capo'), marks: params.has('marks') };
  });

  const hasRestoredRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Autosave must not fire until restore has completed (or been skipped) — otherwise applying
  // a restored session would itself trigger an immediate, pointless autosave right back.
  const restoreSettledRef = useRef(false);
  // Snapshot of exactly what restore just wrote (if anything), so the autosave effect's very
  // next run — which restore's own setters trigger, since they change tuning/capoPosition/
  // freeformMarks — can recognise "this change is my own restore, not a user edit" and skip
  // scheduling a pointless save-back of the data just fetched.
  const justRestoredRef = useRef<SessionStateDto | null>(null);

  // Reset on an actual logout TRANSITION (true→false) — not on simply "currently
  // unauthenticated", which is also true on initial mount for anonymous/free-tier users and
  // must NOT wipe their (possibly URL-hydrated) fretboard state. So a DIFFERENT user logging
  // into the same tab gets their own fresh restore, instead of inheriting the previous user's
  // already-restored state. Two parts: reset the tracking refs (so restore fires again) AND
  // reset the actual fretboard fields to their app defaults (so (a) the previous user's
  // premium data isn't left visible on screen to whoever uses the tab next, and (b) the next
  // restore's "does this field still hold its default?" race-protection check below isn't
  // fooled into thinking the previous user's leftover data means "already user-edited, don't
  // overwrite").
  const wasAuthenticatedRef = useRef(isAuthenticated);
  useEffect(() => {
    const wasAuthenticated = wasAuthenticatedRef.current;
    wasAuthenticatedRef.current = isAuthenticated;
    if (wasAuthenticated && !isAuthenticated) {
      hasRestoredRef.current = false;
      restoreSettledRef.current = false;
      justRestoredRef.current = null;
      setTuning(DEFAULT_FRETBOARD_STATE.tuning);
      setCapoPosition(DEFAULT_FRETBOARD_STATE.capoPosition);
      setFreeformMarks(DEFAULT_FRETBOARD_STATE.freeformMarks);
    }
  }, [isAuthenticated, setTuning, setCapoPosition, setFreeformMarks]);

  // Restore — fires once, the first time both isAuthenticated and isPremium are true (per
  // login; see the logout-reset effect above for what makes a second login "once" again).
  useEffect(() => {
    if (hasRestoredRef.current) return;
    if (!isAuthenticated || !isPremium) return;
    hasRestoredRef.current = true;

    apiClient
      .get<SessionResponseDto | undefined>('/sessions')
      .then((session) => {
        if (!session) return; // 204 No Content — no saved session yet.

        const current = useFretboardStore.getState();
        if (!urlHad.tuning && current.tuning === DEFAULT_FRETBOARD_STATE.tuning) {
          setTuning(session.state.tuning);
        }
        if (!urlHad.capo && current.capoPosition === DEFAULT_FRETBOARD_STATE.capoPosition) {
          setCapoPosition(session.state.capoPosition);
        }
        if (!urlHad.marks && current.freeformMarks.length === 0) {
          setFreeformMarks(session.state.freeformMarks);
        }

        // Zustand's set() is synchronous, so getState() here reflects whatever was just
        // applied above (a mix of restored values and untouched current values).
        const after = useFretboardStore.getState();
        justRestoredRef.current = {
          tuning: after.tuning,
          capoPosition: after.capoPosition,
          freeformMarks: after.freeformMarks,
        };
      })
      .catch(() => {
        // Network/auth failure — silently leave defaults in place (matches bootstrapAuth's
        // silent-failure precedent for background session restore).
      })
      .finally(() => {
        restoreSettledRef.current = true;
      });
  }, [isAuthenticated, isPremium, urlHad, setTuning, setCapoPosition, setFreeformMarks]);

  // Auto-save — debounced, only once restore has settled and only while premium.
  useEffect(() => {
    if (!isAuthenticated || !isPremium || !restoreSettledRef.current) return;

    const justRestored = justRestoredRef.current;
    if (
      justRestored &&
      justRestored.tuning === tuning &&
      justRestored.capoPosition === capoPosition &&
      justRestored.freeformMarks === freeformMarks
    ) {
      justRestoredRef.current = null; // consume the skip exactly once
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const state: SessionStateDto = { tuning, capoPosition, freeformMarks };
      apiClient.post('/sessions', state).catch(() => {
        // Silent — autosave failure shouldn't interrupt the user's session.
      });
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [tuning, capoPosition, freeformMarks, isAuthenticated, isPremium]);
}
