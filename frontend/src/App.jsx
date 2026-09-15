import { useEffect } from 'react';
import ControlBar from './components/ControlBar';
import FretboardCanvas from './components/FretboardCanvas';
import ModeChipsRow from './components/ModeChipsRow';
import AppShell from './components/shared/AppShell';
import { useFretboardStore } from '@/stores/fretboardStore';
import { useUrlState } from '@/hooks/useUrlState';
import { useSubscription, subscriptionQueryKey } from '@/hooks/useSubscription';
import { useSessionSync } from '@/hooks/useSessionSync';
import { useThemeGuard } from '@/hooks/useThemeGuard';
import { useCustomTunings, resolveCustomTuningStrings } from '@/hooks/useCustomTunings';
import { bootstrapAuth } from '@/lib/apiClient';
import { queryClient } from '@/lib/queryClient';
import './App.css';

export default function App() {
  const { tuning, rootNote, scaleName, modeIndex, capoPosition, freeformMarks, noteNamesVisible, freeformModeActive, toggleFreeformMark, chordName, chordRoot } = useFretboardStore();
  useUrlState();
  useSubscription();
  useSessionSync();
  useThemeGuard();
  const { data: customTunings } = useCustomTunings();
  // undefined for predefined tunings (FretboardCanvas falls back to its own by-name lookup),
  // pitch-class strings for a selected custom tuning.
  const resolvedStrings = resolveCustomTuningStrings(tuning, customTunings);
  // Silent session restore: the access token is memory-only, so on load attempt a refresh
  // to reauthenticate from the httpOnly cookie without a visible signed-out flash.
  useEffect(() => {
    bootstrapAuth();
  }, []);
  // Returning from Stripe Checkout: the webhook updates the subscription row
  // server-side, so refetch rather than trust any client-side assumption.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') {
      queryClient.invalidateQueries({ queryKey: subscriptionQueryKey });
      params.delete('checkout');
      const query = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (query ? `?${query}` : ''));
    }
  }, []);

  return (
    <AppShell>
      <ControlBar />
      <ModeChipsRow />
      <main className="app-main">
        <div id="fretboard" style={{ gridArea: 'fretboard' }}>
          <FretboardCanvas
            tuning={tuning}
            rootNote={rootNote}
            scaleName={scaleName}
            modeIndex={modeIndex}
            capoPosition={capoPosition}
            freeformMarks={freeformMarks}
            freeformModeActive={freeformModeActive}
            noteNamesVisible={noteNamesVisible}
            chordName={chordName}
            chordRoot={chordRoot}
            strings={resolvedStrings}
            onFretClick={(mark) => toggleFreeformMark(mark)}
          />
        </div>
      </main>
      <footer className="app-footer">
        <span>Guitar Fretboard Explorer</span>
      </footer>
    </AppShell>
  );
}
