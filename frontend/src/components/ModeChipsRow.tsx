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
        className="flex items-center gap-2 px-4 py-2 bg-card border-b border-border overflow-x-auto"
      >
        {MODES.map((mode, index) => {
          const isActive = modeIndex === index;
          return (
            <Tooltip key={mode.name}>
              <TooltipTrigger
                aria-pressed={isActive}
                onClick={() => setModeIndex(isActive ? null : index)}
                onKeyDown={e => handleKeyDown(e, index)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  isActive
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    : 'text-muted-foreground hover:text-foreground border border-transparent hover:border-border'
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
