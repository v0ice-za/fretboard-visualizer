import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { CHROMATIC_NOTES } from '@/data/notes.js';
import { apiClient } from '@/lib/apiClient';
import { queryClient } from '@/lib/queryClient';
import { useFretboardStore } from '@/stores/fretboardStore';
import { customTuningsQueryKey } from '@/hooks/useCustomTunings';
import FretboardCanvas from '@/components/FretboardCanvas';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const NOTES = CHROMATIC_NOTES as string[];
const OCTAVES = [1, 2, 3, 4, 5, 6];

interface StringRow {
  note: string;
  octave: number;
}

// Standard tuning seed, low → high (index 0 = thickest/lowest), matching tunings.js ordering.
const DEFAULT_ROWS: StringRow[] = [
  { note: 'E', octave: 2 },
  { note: 'A', octave: 2 },
  { note: 'D', octave: 3 },
  { note: 'G', octave: 3 },
  { note: 'B', octave: 3 },
  { note: 'E', octave: 4 },
];

// Native <select>: accessible + robust to test (see 4.3 rationale); native OS pickers on mobile.
const selectClass =
  'h-8 rounded-md border border-[var(--border)] bg-transparent px-2 text-sm text-slate-300 outline-none focus-visible:border-indigo-400';

interface CustomTuningCreatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CustomTuningCreator({ open, onOpenChange }: CustomTuningCreatorProps) {
  const [rows, setRows] = useState<StringRow[]>(DEFAULT_ROWS);
  const [name, setName] = useState('');
  const rootNote = useFretboardStore((s) => s.rootNote);
  const scaleName = useFretboardStore((s) => s.scaleName);

  const reset = () => {
    setRows(DEFAULT_ROWS);
    setName('');
  };

  const close = () => {
    reset();
    onOpenChange(false);
  };

  const save = useMutation({
    mutationFn: () =>
      apiClient.post('/tunings', {
        name: name.trim(),
        strings: rows.map((r) => `${r.note}${r.octave}`),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customTuningsQueryKey });
      close();
    },
  });

  const setRow = (i: number, patch: Partial<StringRow>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  // Pitch-class strings for the live preview (octave stripped — the renderer is pitch-class based).
  const previewStrings = rows.map((r) => r.note);

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <SheetContent side="right" className="w-full gap-4 overflow-y-auto p-4 sm:max-w-md">
        <SheetHeader className="p-0">
          <SheetTitle>Create Custom Tuning</SheetTitle>
          <SheetDescription>Define each string&apos;s pitch, low to high.</SheetDescription>
        </SheetHeader>

        {/* Live preview */}
        <div className="rounded-md border border-[var(--border)] p-2" data-testid="tuning-preview">
          <FretboardCanvas
            tuning="(custom)"
            strings={previewStrings}
            rootNote={rootNote}
            scaleName={scaleName}
          />
        </div>

        {/* Name */}
        <label className="flex flex-col gap-1 text-sm text-slate-300">
          Name
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My tuning"
            aria-label="Tuning name"
          />
        </label>

        {/* String rows */}
        <div className="flex flex-col gap-2">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-16 text-sm text-slate-400">String {i + 1}</span>
              <select
                aria-label={`String ${i + 1} note`}
                value={r.note}
                onChange={(e) => setRow(i, { note: e.target.value })}
                className={selectClass}
              >
                {NOTES.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <select
                aria-label={`String ${i + 1} octave`}
                value={r.octave}
                onChange={(e) => setRow(i, { octave: Number(e.target.value) })}
                className={selectClass}
              >
                {OCTAVES.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {save.isError && (
          <p role="alert" className="text-xs text-rose-400">
            Could not save tuning. Please try again.
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button onClick={() => save.mutate()} disabled={!name.trim() || save.isPending}>
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
          <Button variant="outline" onClick={close}>
            Discard
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
