import { Mic, MicOff } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useTunerStore } from '@/stores/tunerStore';
import type { TunerErrorCode } from '@/lib/tunerEngine';

interface TunerControlProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ERROR_MESSAGES: Record<TunerErrorCode, string> = {
  'permission-denied': 'Microphone access was denied. Allow microphone access in your browser settings to use the tuner.',
  'no-device': 'No microphone was found. Connect a microphone and try again.',
  unsupported: 'This browser doesn\'t support microphone-based tuning.',
  unknown: 'Something went wrong accessing the microphone. Please try again.',
};

const IN_TUNE_CENTS = 5;
const CLOSE_CENTS = 15;

/** In-tune within ±5 cents, close within ±15, off beyond that. */
function tuningZone(cents: number): 'in-tune' | 'close' | 'off' {
  const abs = Math.abs(cents);
  if (abs <= IN_TUNE_CENTS) return 'in-tune';
  if (abs <= CLOSE_CENTS) return 'close';
  return 'off';
}

const ZONE_COLOR: Record<ReturnType<typeof tuningZone>, string> = {
  'in-tune': 'bg-emerald-400',
  close: 'bg-amber-400',
  off: 'bg-rose-400',
};

/** A free practice tool — no premium gating. `useTuner()` (mounted once in
 *  App) owns the microphone + detection loop; this component only
 *  reads/writes the store and toggles `isListening`. */
export default function TunerControl({ open, onOpenChange }: TunerControlProps) {
  const isListening = useTunerStore((s) => s.isListening);
  const setListening = useTunerStore((s) => s.setListening);
  const detectedNote = useTunerStore((s) => s.detectedNote);
  const error = useTunerStore((s) => s.error);

  const zone = detectedNote ? tuningZone(detectedNote.cents) : null;
  // Clamp to the ±50 cent gauge range and convert to a 0-100% needle position.
  const needlePercent = detectedNote
    ? 50 + (Math.max(-50, Math.min(50, detectedNote.cents)) / 50) * 50
    : 50;

  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) setListening(false); onOpenChange(next); }}>
      <SheetContent side="bottom" className="glass-overlay gap-5 p-6">
        <SheetHeader className="p-0">
          <SheetTitle>Tuner</SheetTitle>
          <SheetDescription>Play a string and watch the needle.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col items-center gap-5">
          {error && (
            <p role="alert" className="w-full rounded-md border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-center text-sm text-rose-300">
              {ERROR_MESSAGES[error]}
            </p>
          )}

          {isListening && !error && (
            <>
              <div className="flex min-h-24 flex-col items-center justify-center gap-1">
                {detectedNote ? (
                  <>
                    <span className="text-5xl font-semibold tabular-nums text-foreground">
                      {detectedNote.note}
                      <span className="text-2xl text-muted-foreground">{detectedNote.octave}</span>
                    </span>
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {detectedNote.cents === 0
                        ? 'in tune'
                        : `${detectedNote.cents > 0 ? '+' : ''}${detectedNote.cents} cents`}
                    </span>
                  </>
                ) : (
                  <span className="select-none text-sm text-muted-foreground">Play a note…</span>
                )}
              </div>

              {/* Cents gauge */}
              <div className="relative h-2 w-full rounded-full bg-[var(--glass-border)]" role="meter" aria-label="Tuning accuracy" aria-valuemin={-50} aria-valuemax={50} aria-valuenow={detectedNote?.cents ?? 0}>
                <span aria-hidden className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-muted-foreground/40" />
                <span
                  aria-hidden
                  className={`absolute top-1/2 size-4 -translate-y-1/2 -translate-x-1/2 rounded-full transition-[left] duration-150 ${
                    zone ? ZONE_COLOR[zone] : 'bg-muted-foreground/50'
                  }`}
                  style={{ left: `${needlePercent}%` }}
                />
              </div>
            </>
          )}

          <Button
            type="button"
            onClick={() => setListening(!isListening)}
            className="w-full text-primary-foreground [background-image:var(--signature-grad)] [box-shadow:var(--glow-primary)]"
          >
            {isListening ? <MicOff /> : <Mic />}
            {isListening ? 'Stop' : 'Start Tuning'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
