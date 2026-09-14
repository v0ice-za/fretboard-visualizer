import { MODES } from '@/utils/fretboardUtils';
import { useFretboardStore } from '@/stores/fretboardStore';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function ModeChipsRow() {
  const { modeIndex, setModeIndex } = useFretboardStore();

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const toolbar = (e.currentTarget as HTMLElement).closest('[role="toolbar"]');
    const chips = toolbar?.querySelectorAll<HTMLElement>('button');
    if (!chips) return;
    const len = chips.length;
    const nextIdx = e.key === 'ArrowRight'
      ? (index + 1) % len
      : (index - 1 + len) % len;
    chips[nextIdx]?.focus();
  };

  return (
    <TooltipProvider delay={300}>
      <div
        role="toolbar"
        aria-label="Mode overlay"
        className="flex items-center gap-2 overflow-x-auto border-b border-[var(--glass-border)] bg-[var(--glass-bar-bg)] px-4 py-2.5 backdrop-blur-[var(--glass-blur)]"
      >
        {MODES.map((mode, index) => {
          const isActive = modeIndex === index;
          return (
            <Tooltip key={mode.name}>
              <TooltipTrigger
                aria-pressed={isActive}
                onClick={() => setModeIndex(isActive ? null : index)}
                onKeyDown={e => handleKeyDown(e, index)}
                className={`inline-flex min-h-11 flex-shrink-0 select-none items-center justify-center rounded-full px-3.5 text-xs font-medium transition-[transform,box-shadow,background-color,color,border-color] duration-150 focus-visible:outline-none focus-visible:[box-shadow:var(--glow-primary)] ${
                  isActive
                    ? 'border border-rose-500/40 bg-rose-500/20 text-rose-300 [box-shadow:0_0_16px_oklch(0.7_0.16_15/0.25)]'
                    : 'border border-transparent text-muted-foreground hover:-translate-y-px hover:border-[var(--glass-border)] hover:text-foreground'
                }`}
              >
                {mode.name}
              </TooltipTrigger>
              <TooltipContent>{mode.description}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
