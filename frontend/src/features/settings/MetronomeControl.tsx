import { Play, Pause, Minus, Plus } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  useMetronomeStore,
  MIN_BPM,
  MAX_BPM,
  MIN_BEATS_PER_MEASURE,
  MAX_BEATS_PER_MEASURE,
} from '@/stores/metronomeStore';

interface MetronomeControlProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** A free practice tool — no premium gating. `useMetronome()` (mounted once in
 *  App) owns the actual click loop; this component only reads/writes the
 *  store. */
export default function MetronomeControl({ open, onOpenChange }: MetronomeControlProps) {
  const bpm = useMetronomeStore((s) => s.bpm);
  const setBpm = useMetronomeStore((s) => s.setBpm);
  const beatsPerMeasure = useMetronomeStore((s) => s.beatsPerMeasure);
  const setBeatsPerMeasure = useMetronomeStore((s) => s.setBeatsPerMeasure);
  const isPlaying = useMetronomeStore((s) => s.isPlaying);
  const togglePlaying = useMetronomeStore((s) => s.togglePlaying);
  const currentBeat = useMetronomeStore((s) => s.currentBeat);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="glass-overlay gap-5 p-6">
        <SheetHeader className="p-0">
          <SheetTitle>Metronome</SheetTitle>
          <SheetDescription>Keep time while you practice.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-5">
          {/* BPM */}
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Tempo</span>
              <span className="text-2xl font-semibold tabular-nums text-foreground">{bpm} BPM</span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Decrease tempo"
                onClick={() => setBpm(bpm - 1)}
                disabled={bpm <= MIN_BPM}
              >
                <Minus />
              </Button>
              <Slider
                min={MIN_BPM}
                max={MAX_BPM}
                step={1}
                value={[bpm]}
                onValueChange={(v) => { const n = Array.isArray(v) ? v[0] : v; if (typeof n === 'number') setBpm(n); }}
                aria-label="Tempo in beats per minute"
                className="flex-1 [&_[data-slot=slider-range]]:[background-image:var(--signature-grad)] [&_[data-slot=slider-thumb]]:size-4 [&_[data-slot=slider-thumb]]:[box-shadow:var(--glow-primary)]"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Increase tempo"
                onClick={() => setBpm(bpm + 1)}
                disabled={bpm >= MAX_BPM}
              >
                <Plus />
              </Button>
            </div>
          </div>

          {/* Beats per measure */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">Beats per measure</span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Fewer beats per measure"
                onClick={() => setBeatsPerMeasure(beatsPerMeasure - 1)}
                disabled={beatsPerMeasure <= MIN_BEATS_PER_MEASURE}
              >
                <Minus />
              </Button>
              <span className="w-6 text-center text-sm font-medium tabular-nums text-foreground">
                {beatsPerMeasure}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="More beats per measure"
                onClick={() => setBeatsPerMeasure(beatsPerMeasure + 1)}
                disabled={beatsPerMeasure >= MAX_BEATS_PER_MEASURE}
              >
                <Plus />
              </Button>
            </div>
          </div>

          {/* Beat pulse */}
          <div className="flex items-center justify-center gap-2" role="status" aria-label="Beat indicator">
            {Array.from({ length: beatsPerMeasure }, (_, i) => (
              <span
                key={i}
                aria-hidden
                className={`size-2.5 rounded-full transition-colors ${
                  isPlaying && currentBeat === i
                    ? i === 0
                      ? 'bg-primary [box-shadow:var(--glow-primary)]'
                      : 'bg-primary/60'
                    : 'bg-[var(--glass-border)]'
                }`}
              />
            ))}
          </div>

          <Button
            type="button"
            onClick={togglePlaying}
            className="w-full text-primary-foreground [background-image:var(--signature-grad)] [box-shadow:var(--glow-primary)]"
          >
            {isPlaying ? <Pause /> : <Play />}
            {isPlaying ? 'Stop' : 'Start'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
