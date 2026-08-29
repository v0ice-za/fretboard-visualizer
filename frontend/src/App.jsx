import { useEffect } from 'react';
import ControlBar from './components/ControlBar';
import FretboardCanvas from './components/FretboardCanvas';
import ModeChipsRow from './components/ModeChipsRow';
import AppShell from './components/shared/AppShell';
import { useFretboardStore } from '@/stores/fretboardStore';
import { useUrlState } from '@/hooks/useUrlState';
import { useSubscription } from '@/hooks/useSubscription';
import { bootstrapAuth } from '@/lib/apiClient';
import './App.css';

export default function App() {
  const { tuning, rootNote, scaleName, modeIndex, capoPosition, freeformMarks, noteNamesVisible, freeformModeActive, toggleFreeformMark, chordName } = useFretboardStore();
  useUrlState();
  useSubscription();
  // Silent session restore: the access token is memory-only, so on load attempt a refresh
  // to reauthenticate from the httpOnly cookie without a visible signed-out flash.
  useEffect(() => {
    bootstrapAuth();
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
