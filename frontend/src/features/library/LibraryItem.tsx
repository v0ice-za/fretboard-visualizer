import { Check, Lock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export type LibraryItemVariant = 'default' | 'active' | 'locked' | 'preview'

interface LibraryItemProps {
  title: string
  variant: LibraryItemVariant
  onSelect?: () => void
  onPaywallTrigger?: (anchorEl: HTMLElement) => void
}

export default function LibraryItem({ title, variant, onSelect, onPaywallTrigger }: LibraryItemProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (variant === 'locked') {
      onPaywallTrigger?.(e.currentTarget)
    } else {
      onSelect?.()
    }
  }

  return (
    <button
      role="option"
      aria-selected={variant === 'active'}
      aria-disabled={variant === 'locked'}
      onClick={handleClick}
      disabled={false}
      // Story 8.4: rack-row styling — 4px radius, flat hover plate, active = raised
      // surface-2 row with an indigo edge + underglow; locked rows carry a gold lock badge.
      // Active text is foreground, not primary: violet on surface-2 was 2.5–3.3:1 (Story 8.5).
      className={`flex w-full select-none items-center justify-between rounded-sm border px-3.5 py-3 text-sm transition-[box-shadow,background-color,color] duration-150 ease-out ${
        variant === 'locked'
          ? 'lock-row cursor-not-allowed border-[var(--glass-border)] text-muted-foreground'
          : variant === 'active'
          ? 'border-transparent bg-surface-2 text-foreground [box-shadow:inset_2px_0_0_rgb(99_102_241),0_6px_16px_-8px_rgb(99_102_241/0.6)]'
          : 'border-transparent text-foreground hover:bg-surface-interactive'
      }`}
    >
      <span className={variant === 'locked' ? 'opacity-60' : undefined}>{title}</span>
      <span className="flex items-center gap-1">
        {variant === 'active' && <Check size={14} />}
        {variant === 'locked' && (
          <span className="lock-badge" aria-hidden>
            <Lock size={10} />
          </span>
        )}
        {variant === 'preview' && (
          <Badge variant="secondary" className="text-xs py-0">Preview</Badge>
        )}
      </span>
    </button>
  )
}
