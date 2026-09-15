import { useState } from 'react';
import { useFretboardStore } from '@/stores/fretboardStore';
import { diatonicChords, chordDisplayName, type DiatonicChord } from '@/lib/harmony';

export default function ChordsInKey() {
  const rootNote = useFretboardStore((s) => s.rootNote);
  const scaleName = useFretboardStore((s) => s.scaleName);
  const chordName = useFretboardStore((s) => s.chordName);
  const chordRoot = useFretboardStore((s) => s.chordRoot);
  const setChordName = useFretboardStore((s) => s.setChordName);
  const setChordRoot = useFretboardStore((s) => s.setChordRoot);

  const [sevenths, setSevenths] = useState(false);

  const chords = diatonicChords(rootNote, scaleName, { sevenths });

  // Toggling 7ths changes each degree's chordType (e.g. Minor → Minor 7), so a
  // chord highlighted before the toggle would no longer match any degree and the
  // highlight would silently orphan. Clear it on toggle. (setChordName(null) also
  // resets chordRoot in the store.)
  const handleSeventhsToggle = (next: boolean) => {
    setSevenths(next);
    setChordName(null);
  };

  // Non-heptatonic scales can't be harmonized — show a short note, never wrong chords.
  if (chords.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="select-none px-1 py-6 text-center text-sm text-slate-500">
          Harmonization needs a 7-note scale. Pick a major, minor, or modal scale to
          see its chords.
        </p>
      </div>
    );
  }

  // Active degree = the one whose chord type AND root both match the store — robust
  // to key changes while a chord is highlighted (not keyed on degree index).
  const isActive = (c: DiatonicChord) =>
    c.buildable && c.chordType === chordName && c.chordRoot === chordRoot;

  const handleClick = (c: DiatonicChord) => {
    if (!c.buildable) return;
    if (isActive(c)) {
      setChordName(null); // re-click the active degree clears the highlight
      return;
    }
    setChordName(c.chordType); // resets chordRoot to null in the same set()
    setChordRoot(c.chordRoot); // then root the highlight at this degree
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="select-none text-xs uppercase tracking-wide text-slate-500">
          {rootNote} {scaleName}
        </span>
        <label className="flex select-none items-center gap-2 text-xs text-slate-400">
          <input
            type="checkbox"
            checked={sevenths}
            onChange={(e) => handleSeventhsToggle(e.target.checked)}
            className="size-3.5 accent-indigo-500"
          />
          7ths
        </label>
      </div>

      <ul
        role="listbox"
        aria-label="Chords in key"
        className="grid grid-cols-2 gap-1.5 sm:grid-cols-3"
      >
        {chords.map((c) => {
          const active = isActive(c);
          return (
            <li key={c.degree} role="option" aria-selected={active}>
              <button
                type="button"
                onClick={() => handleClick(c)}
                disabled={!c.buildable}
                title={c.buildable ? c.notes.join(' · ') : 'No shape available'}
                className={`flex w-full select-none flex-col items-start gap-0.5 rounded-md border px-3 py-2 text-left transition-colors ${
                  active
                    ? 'border-indigo-400/60 bg-indigo-500/15 text-indigo-200 [box-shadow:var(--glow-primary)]'
                    : c.buildable
                      ? 'border-[var(--glass-border)] text-slate-300 hover:bg-white/5'
                      : 'cursor-not-allowed border-transparent text-slate-600'
                }`}
              >
                <span className="font-mono text-xs text-slate-500">{c.roman}</span>
                <span className="text-sm font-medium">{chordDisplayName(c)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
