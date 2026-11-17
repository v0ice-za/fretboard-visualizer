import { useState } from 'react';
import { ChevronUp, ChevronDown, Lock, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CHROMATIC_NOTES, noteAtSemitone } from '@/data/notes.js';
import { CHORD_NAMES } from '@/data/chords.js';
import { useProgressionStore, MAX_PROGRESSION_CHORDS } from '@/stores/progressionStore';
import { useProgressionPlayback } from '@/hooks/useProgressionPlayback';
import { useFretboardStore } from '@/stores/fretboardStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { playChord } from '@/lib/playChord';
import {
  POPULAR_PROGRESSIONS,
  JAZZY_PROGRESSIONS,
  type ProgressionPreset,
} from '@/data/progressionPresets';

const ROOT_NOTES = CHROMATIC_NOTES as string[];
const QUALITIES = CHORD_NAMES as string[];

const chordLabel = (rootNote: string, chordName: string) => `${rootNote} ${chordName}`;

// Native <select>: accessible, robust to test, and native OS pickers on mobile (per UX spec).
const selectClass =
  'h-8 rounded-md border border-[var(--border)] bg-transparent px-2 text-sm text-slate-300 outline-none focus-visible:border-indigo-400';

/** A single preset row: name + short description, transposes to the active root on click.
 *  Popular progressions are free; Jazzy ones pass `locked` for non-premium users — dimmed,
 *  lock badge, and the click raises the shared PaywallCard instead of loading the preset. */
function PresetButton({
  preset,
  locked,
  onClick,
}: {
  preset: ProgressionPreset;
  locked?: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-disabled={locked}
      className={`flex w-full select-none items-start justify-between gap-2 rounded-md border border-[var(--glass-border)] px-3 py-2 text-left transition-colors ${
        locked ? 'cursor-not-allowed opacity-50' : 'hover:bg-white/5'
      }`}
    >
      <span className="flex flex-col items-start gap-0.5">
        <span className="text-sm font-medium text-slate-300">{preset.name}</span>
        <span className="text-xs text-slate-500">{preset.description}</span>
      </span>
      {locked && (
        <Badge variant="outline" className="shrink-0 gap-1 py-0 px-1 text-xs">
          <Lock size={10} />
        </Badge>
      )}
    </button>
  );
}

interface ProgressionBuilderProps {
  onPaywallTrigger?: (anchorEl: HTMLElement) => void;
}

export default function ProgressionBuilder({ onPaywallTrigger }: ProgressionBuilderProps) {
  const { chords, activeIndex, addChord, removeChord, moveChord, setActiveIndex, next, prev, clear } =
    useProgressionStore();
  const rootNote = useFretboardStore((s) => s.rootNote);
  const isPremium = useSubscriptionStore((s) => s.isPremium);
  const [root, setRoot] = useState(ROOT_NOTES[0]);
  const [quality, setQuality] = useState(QUALITIES[0]);

  useProgressionPlayback();

  const isEmpty = chords.length === 0;
  const atCap = chords.length >= MAX_PROGRESSION_CHORDS;
  const activeChord = activeIndex !== null ? chords[activeIndex] : undefined;

  // Explicit trigger only — stepping/selecting a row never plays audio (Story 7.2).
  // This block only renders for premium users (see the `isPremium` ternary below),
  // so there's no separate lock/paywall state to handle here.
  const handlePlayCurrent = () => {
    if (!activeChord) return;
    try {
      playChord(activeChord.chordName, activeChord.rootNote);
    } catch (e) {
      console.error('Audio playback failed:', e);
    }
  };

  // Presets transpose to the currently-selected key (ControlBar's root note),
  // not a fixed key — loading "I-V-vi-IV" in D gives you D-A-Bm-G. Replaces
  // whatever progression is currently loaded, same as clicking Clear first.
  const loadPreset = (preset: ProgressionPreset) => {
    clear();
    for (const step of preset.steps) {
      const transposedNote = noteAtSemitone(rootNote, step.semitones);
      // Validate noteAtSemitone returned a valid note (guard against undefined).
      if (!transposedNote) {
        console.warn(`Failed to transpose note for preset step at semitone ${step.semitones}`);
        continue;
      }
      addChord(transposedNote, step.quality);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <section className="flex flex-col gap-2">
        <h3 className="select-none text-xs font-semibold uppercase tracking-wide text-slate-400">
          Popular progressions
        </h3>
        <ul role="list" aria-label="Popular progressions" className="flex flex-col gap-1.5">
          {POPULAR_PROGRESSIONS.map((preset) => (
            <li key={preset.name}>
              <PresetButton preset={preset} onClick={() => loadPreset(preset)} />
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="select-none text-xs font-semibold uppercase tracking-wide text-slate-400">
          Jazzy progressions
        </h3>
        <ul role="list" aria-label="Jazzy progressions" className="flex flex-col gap-1.5">
          {JAZZY_PROGRESSIONS.map((preset) => (
            <li key={preset.name}>
              <PresetButton
                preset={preset}
                locked={!isPremium}
                onClick={(e) => (isPremium ? loadPreset(preset) : onPaywallTrigger?.(e.currentTarget))}
              />
            </li>
          ))}
        </ul>
      </section>

      <div className="border-t border-[var(--glass-border)] pt-3">
        <h3 className="mb-2 select-none text-xs font-semibold uppercase tracking-wide text-slate-400">
          Custom
        </h3>
      </div>

      {!isPremium ? (
        <button
          type="button"
          onClick={(e) => onPaywallTrigger?.(e.currentTarget)}
          className="flex w-full select-none items-center justify-between gap-2 rounded-md border border-[var(--glass-border)] px-3 py-3 text-left opacity-80 transition-colors hover:bg-white/5 hover:opacity-100"
        >
          <span className="text-sm text-slate-400">Build your own progression, chord by chord</span>
          <Badge variant="outline" className="shrink-0 gap-1 py-0 px-1 text-xs">
            <Lock size={10} />
          </Badge>
        </button>
      ) : (
        <>
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
          disabled={atCap}
          className="h-8 rounded-md bg-indigo-500/90 px-3 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-500/90"
        >
          Add
        </button>
      </div>

      {atCap && (
        <p role="status" className="px-1 text-xs text-slate-500">
          Maximum {MAX_PROGRESSION_CHORDS} chords reached
        </p>
      )}

      {/* Step + clear controls */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={prev}
          disabled={isEmpty}
          aria-label="Previous chord in progression"
          className="h-8 flex-1 rounded-md border border-[var(--border)] text-sm text-slate-300 hover:bg-white/5 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          Prev
        </button>
        <button
          type="button"
          onClick={next}
          disabled={isEmpty}
          aria-label="Next chord in progression"
          className="h-8 flex-1 rounded-md border border-[var(--border)] text-sm text-slate-300 hover:bg-white/5 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          Next
        </button>
        <button
          type="button"
          onClick={handlePlayCurrent}
          disabled={!activeChord}
          aria-label="Play current chord"
          className="h-8 flex-1 rounded-md border border-[var(--border)] text-sm text-slate-300 hover:bg-white/5 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          Play
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
                  aria-current={active ? 'true' : undefined}
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
        </>
      )}
    </div>
  );
}
