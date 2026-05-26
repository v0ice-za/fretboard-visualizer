import ControlBar from './components/ControlBar';
import FretboardCanvas from './components/FretboardCanvas';
import ModeChipsRow from './components/ModeChipsRow';
import AppShell from './components/shared/AppShell';
import { useFretboardStore } from '@/stores/fretboardStore';
import { useUrlState } from '@/hooks/useUrlState';
import './App.css';

export default function App() {
  const { tuning, rootNote, scaleName, modeIndex, capoPosition } = useFretboardStore();
  useUrlState();

  return (
    <AppShell>
      <ControlBar />
      <ModeChipsRow />
      <main className="app-main">
        <div id="fretboard" style={{ gridArea: 'fretboard' }}>
          <FretboardCanvas tuning={tuning} rootNote={rootNote} scaleName={scaleName} modeIndex={modeIndex} capoPosition={capoPosition} />
        </div>
      </main>
      <footer className="app-footer">
        <span>Guitar Fretboard Explorer</span>
      </footer>
    </AppShell>
  );
}
