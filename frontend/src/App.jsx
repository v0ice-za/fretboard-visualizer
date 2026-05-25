import { useState } from 'react';
import NavTabs from './components/NavTabs.jsx';
import Controls from './components/Controls.jsx';
import FretboardCanvas from './components/FretboardCanvas';
import ProGate from './components/ProGate.jsx';
import AppShell from './components/shared/AppShell';
import './App.css';

const PAGES = [
  { id: 'fretboard',     label: 'Fretboard',      pro: false },
  { id: 'chords',        label: 'Chord Finder',    pro: true  },
  { id: 'ear-training',  label: 'Ear Training',    pro: true  },
  { id: 'scale-library', label: 'Scale Library',   pro: true  },
];

export default function App() {
  const [page, setPage] = useState('fretboard');
  const [tuningName, setTuningName] = useState('Standard E');
  const [rootNote, setRootNote] = useState('A');
  const [scaleName, setScaleName] = useState('Pentatonic Minor');
  const [showIntervals, setShowIntervals] = useState(false);

  return (
    <AppShell>
      <div className="app-top-bar">
        <header className="app-header">
          <div className="app-header-inner">
            <span className="app-logo">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 19L19 3M3 19c0 0 2-1 4-1s4 1 4 1 2-1 4-1 2 1 2 1" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round"/>
                <circle cx="11" cy="11" r="2" fill="#fbbf24"/>
              </svg>
            </span>
            <h1 className="app-title">Fretboard</h1>
            <span className="app-subtitle">Scale & Tuning Explorer</span>
          </div>
        </header>
        <NavTabs pages={PAGES} active={page} onSelect={setPage} />
      </div>

      <main className="app-main">
        {page !== 'fretboard' ? (
          <ProGate feature={page} />
        ) : (
          <>
            <div className="app-section">
              <Controls
                tuningName={tuningName} setTuningName={setTuningName}
                rootNote={rootNote} setRootNote={setRootNote}
                scaleName={scaleName} setScaleName={setScaleName}
                showIntervals={showIntervals} setShowIntervals={setShowIntervals}
              />
            </div>
            <div id="fretboard" style={{ gridArea: 'fretboard' }}>
              <FretboardCanvas
                tuning={tuningName}
                rootNote={rootNote}
                scaleName={scaleName}
              />
            </div>
          </>
        )}
      </main>

      <footer className="app-footer">
        <span>Guitar Fretboard Explorer</span>
      </footer>
    </AppShell>
  );
}
