import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Filled/glowing "on" state for toggles (note names, freeform, library, account). */
  active?: boolean;
  /** `destructive` tints hover red (e.g. delete tuning). */
  tone?: 'default' | 'destructive';
}

/**
 * Shared control-bar action button (Story 5.2; Obsidian hardware styling Story 8.2).
 *
 * - 44px min touch target (h-11 / min-w-11) — meets the spec's WCAG AA rule.
 * - 20px glyphs, hover-lift + soft shadow, `--glow-primary` focus ring.
 * - Active toggles fill with a violet tint + glow.
 * - Renderable as a base-ui Tooltip trigger via the `render` prop (forwards ref + props).
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, active = false, tone = 'default', children, type, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      data-active={active || undefined}
      className={cn(
        // Story 8.2: hardware-plate styling — 4px radius, flat hover plate (no lift),
        // active = raised surface-2 plate with an indigo underglow. 44px touch target kept.
        'inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-sm px-2 select-none',
        'text-[13px] font-medium text-muted-foreground outline-none',
        'transition-[box-shadow,color,background-color] duration-150 ease-out',
        'hover:bg-surface-interactive hover:text-foreground',
        'focus-visible:text-foreground focus-visible:[box-shadow:var(--glow-primary)]',
        "[&_svg]:size-[18px] [&_svg]:shrink-0",
        active && tone === 'default' &&
          'bg-surface-2 text-foreground [box-shadow:inset_0_1px_0_var(--glass-highlight),inset_0_-2px_0_rgb(99_102_241),0_8px_16px_-8px_rgb(99_102_241/0.6)] [&_svg]:text-primary',
        tone === 'destructive' && 'hover:bg-destructive/10 hover:text-destructive',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
