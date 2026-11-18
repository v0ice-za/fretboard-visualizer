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
        className="flex items-center overflow-x-auto border-b border-[var(--glass-border)] bg-[var(--glass-bar-bg)] px-4 py-1.5"
      >
        {/* Story 8.2: segmented pill selector — recessed slate track, active
            segment pops on surface-2 with an indigo underglow. */}
        <div className="inline-flex flex-shrink-0 items-center gap-0.5 rounded-full border border-[var(--glass-border)] bg-[var(--input)] p-0.5 [box-shadow:var(--board-well-shadow)]">
        {MODES.map((mode, index) => {
          const isActive = modeIndex === index;
          return (
            <Tooltip key={mode.name}>
              <TooltipTrigger
                aria-pressed={isActive}
                onClick={() => setModeIndex(isActive ? null : index)}
                onKeyDown={e => handleKeyDown(e, index)}
                className={`inline-flex min-h-11 flex-shrink-0 select-none items-center justify-center rounded-full px-3.5 text-xs font-medium transition-[box-shadow,background-color,color] duration-150 focus-visible:outline-none focus-visible:[box-shadow:var(--glow-primary)] ${
                  isActive
                    ? 'bg-surface-2 text-foreground [box-shadow:inset_0_1px_0_var(--glass-highlight),0_6px_14px_-6px_rgb(99_102_241/0.7)]'
                    : 'text-muted-foreground hover:bg-surface-interactive hover:text-foreground'
                }`}
              >
                {mode.name}
              </TooltipTrigger>
              <TooltipContent>{mode.description}</TooltipContent>
            </Tooltip>
          );
        })}
        </div>
      </div>
    </TooltipProvider>
  );
}
