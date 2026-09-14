import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Filled/glowing "on" state for toggles (note names, freeform, library, account). */
  active?: boolean;
  /** `destructive` tints hover red (e.g. delete tuning). */
  tone?: 'default' | 'destructive';
}

/**
 * Shared control-bar action button for the Aurora glass overhaul (Story 5.2).
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
        'inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-2.5 select-none',
        'text-sm font-medium text-muted-foreground outline-none',
        'transition-[transform,box-shadow,color,background-color] duration-150 ease-out',
        'hover:-translate-y-px hover:text-foreground hover:[background:var(--glass-bar-bg)] hover:[box-shadow:var(--shadow-sm)]',
        'focus-visible:text-foreground focus-visible:[box-shadow:var(--glow-primary)]',
        'active:translate-y-0',
        "[&_svg]:size-5 [&_svg]:shrink-0",
        active && tone === 'default' && 'bg-primary/15 text-primary [box-shadow:var(--glow-primary)]',
        tone === 'destructive' && 'hover:bg-destructive/10 hover:text-destructive',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
