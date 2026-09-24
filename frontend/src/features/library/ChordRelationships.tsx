import { useMemo } from 'react';
import { useFretboardStore } from '@/stores/fretboardStore';
import {
  sharedNoteChords,
  jazzifySuggestions,
  type ChordRef,
} from '@/lib/chordRelationships';
import { playChord } from '@/lib/playChord';

/** A single clickable suggestion row: the chord label + a short relationship tag. */
function SuggestionButton({
  label,
  tag,
  onClick,
}: {
  label: string;
  tag: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full select-none items-center justify-between gap-2 rounded-md border border-[var(--glass-border)] px-3 py-2 text-left text-slate-300 transition-colors hover:bg-white/5"
    >
      <span className="text-sm font-medium">{label}</span>
      <span className="shrink-0 text-[10px] uppercase tracking-wide text-slate-500">{tag}</span>
    </button>
  );
}

export default function ChordRelationships() {
  const rootNote = useFretboardStore((s) => s.rootNote);
  const chordName = useFretboardStore((s) => s.chordName);
  const chordRoot = useFretboardStore((s) => s.chordRoot);
  const setChordName = useFretboardStore((s) => s.setChordName);
  const setChordRoot = useFretboardStore((s) => s.setChordRoot);

  // Active chord = whatever is highlighted, from either the standard Chord tab
  // (chordRoot null → falls back to rootNote) or the Diatonic tab (chordRoot set).
  // Same `chordRoot ?? rootNote` convention FretboardCanvas renders with.
  const activeType = chordName;
  const activeRoot = chordRoot ?? rootNote;

  const shares = useMemo(
    () => (activeType ? sharedNoteChords(activeRoot, activeType) : []),
    [activeRoot, activeType]
  );
  const jazzify = useMemo(
    () =>
      activeType
        ? jazzifySuggestions(activeRoot, activeType)
        : { upgrades: [], substitutions: [] },
    [activeRoot, activeType]
  );

  // Selecting a suggestion makes IT the active chord: setChordName resets
  // chordRoot to null in the same set(), then setChordRoot roots the highlight.
  // The panel then recomputes around the new chord (intended explorer flow).
  const select = (ref: ChordRef) => {
    setChordName(ref.type);
    setChordRoot(ref.root);
    playChord(ref.type, ref.root);
  };

  if (!activeType) {
    return (
      <div className="flex flex-col gap-3">
        <p className="select-none px-1 py-6 text-center text-sm text-slate-500">
          Select a chord to see related chords, substitutions, and jazzier voicings.
        </p>
      </div>
    );
  }

  const noJazzify = jazzify.upgrades.length === 0 && jazzify.substitutions.length === 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="select-none text-xs uppercase tracking-wide text-slate-500">
        {activeRoot} {activeType}
      </div>

      <section className="flex flex-col gap-2">
        <h3 className="select-none text-xs font-semibold uppercase tracking-wide text-slate-400">
          Jazzify
        </h3>
        {noJazzify ? (
          <p className="select-none px-1 text-sm text-slate-600">
            No substitutions or upgrades for this chord.
          </p>
        ) : (
          <ul role="list" aria-label="Jazzify suggestions" className="flex flex-col gap-1.5">
            {jazzify.substitutions.map((s) => (
              <li key={`sub-${s.relation}-${s.root}-${s.type}`}>
                <SuggestionButton
                  label={`${s.root} ${s.type}`}
                  tag={s.relation}
                  onClick={() => select(s)}
                />
              </li>
            ))}
            {jazzify.upgrades.map((u) => (
              <li key={`up-${u.root}-${u.type}`}>
                <SuggestionButton
                  label={`${u.root} ${u.type}`}
                  tag="Extension"
                  onClick={() => select(u)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="select-none text-xs font-semibold uppercase tracking-wide text-slate-400">
          Shares notes
        </h3>
        {shares.length === 0 ? (
          <p className="select-none px-1 text-sm text-slate-600">No related chords found.</p>
        ) : (
          <ul
            role="list"
            aria-label="Chords that share notes"
            className="grid grid-cols-2 gap-1.5"
          >
            {shares.map((c) => (
              <li key={`${c.root}-${c.type}`}>
                <SuggestionButton
                  label={`${c.root} ${c.type}`}
                  tag={c.sameNotes ? 'same notes' : `${c.sharedCount} shared`}
                  onClick={() => select(c)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
