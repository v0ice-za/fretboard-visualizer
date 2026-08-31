import { useState } from 'react';
import { ChevronUp, ChevronDown, X } from 'lucide-react';
import { CHROMATIC_NOTES } from '@/data/notes.js';
import { CHORD_NAMES } from '@/data/chords.js';
import { useProgressionStore } from '@/stores/progressionStore';
import { useProgressionPlayback } from '@/hooks/useProgressionPlayback';

const ROOT_NOTES = CHROMATIC_NOTES as string[];
const QUALITIES = CHORD_NAMES as string[];

const chordLabel = (rootNote: string, chordName: string) => `${rootNote} ${chordName}`;

// Native <select>: accessible, robust to test, and native OS pickers on mobile (per UX spec).
const selectClass =
  'h-8 rounded-md border border-[var(--border)] bg-transparent px-2 text-sm text-slate-300 outline-none focus-visible:border-indigo-400';

export default function ProgressionBuilder() {
  const { chords, activeIndex, addChord, removeChord, moveChord, setActiveIndex, next, prev, clear } =
    useProgressionStore();
  const [root, setRoot] = useState(ROOT_NOTES[0]);
  const [quality, setQuality] = useState(QUALITIES[0]);

  useProgressionPlayback();

  const isEmpty = chords.length === 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Add row */}
      <div className="flex items-center gap-2">
        <select
          aria-label="Root note"
          value={root}
          onChange={(e) => setRoot(e.target.value)}
          className={selectClass}
        >
          {ROOT_NOTES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <select
          aria-label="Chord quality"
          value={quality}
          onChange={(e) => setQuality(e.target.value)}
          className={`${selectClass} flex-1`}
        >
          {QUALITIES.map((q) => (
            <option key={q} value={q}>
              {q}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => addChord(root, quality)}
          className="h-8 rounded-md bg-indigo-500/90 px-3 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Add
        </button>
      </div>

      {/* Step + clear controls */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={prev}
          disabled={isEmpty}
          aria-label="Previous chord"
          className="h-8 flex-1 rounded-md border border-[var(--border)] text-sm text-slate-300 hover:bg-white/5 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          Prev
        </button>
        <button
          type="button"
          onClick={next}
          disabled={isEmpty}
          aria-label="Next chord"
          className="h-8 flex-1 rounded-md border border-[var(--border)] text-sm text-slate-300 hover:bg-white/5 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          Next
        </button>
        <button
          type="button"
          onClick={clear}
          disabled={isEmpty}
          className="h-8 rounded-md px-3 text-sm text-slate-500 hover:text-slate-300 disabled:opacity-40"
        >
          Clear
        </button>
      </div>

      {/* Sequence */}
      {isEmpty ? (
        <p className="px-1 py-4 text-center text-sm text-slate-500">
          Add chords to build a progression
        </p>
      ) : (
        <ul role="list" className="flex flex-col gap-1" aria-label="Chord progression">
          {chords.map((c, i) => {
            const label = chordLabel(c.rootNote, c.chordName);
            const active = i === activeIndex;
            return (
              <li
                key={c.id}
                role="listitem"
                className={`flex items-center gap-1 rounded-md pr-1 transition-colors ${
                  active ? 'bg-indigo-500/15 text-indigo-300' : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  aria-current={active}
                  aria-label={`Select ${label}`}
                  className="flex-1 px-3 py-2 text-left text-sm"
                >
                  <span className="mr-2 text-xs text-slate-500">{i + 1}</span>
                  {label}
                </button>
                <button
                  type="button"
                  onClick={() => moveChord(c.id, 'up')}
                  disabled={i === 0}
                  aria-label={`Move ${label} up`}
                  className="grid h-7 w-7 place-items-center rounded text-slate-500 hover:text-slate-300 disabled:opacity-30"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => moveChord(c.id, 'down')}
                  disabled={i === chords.length - 1}
                  aria-label={`Move ${label} down`}
                  className="grid h-7 w-7 place-items-center rounded text-slate-500 hover:text-slate-300 disabled:opacity-30"
                >
                  <ChevronDown size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => removeChord(c.id)}
                  aria-label={`Remove ${label}`}
                  className="grid h-7 w-7 place-items-center rounded text-slate-500 hover:text-rose-400"
                >
                  <X size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
