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
      className={`flex w-full select-none items-center justify-between rounded-lg border px-3.5 py-3 text-sm transition-[transform,box-shadow,background-color,color] duration-150 ease-out ${
        variant === 'locked'
          ? 'cursor-not-allowed border-[var(--glass-border)] text-muted-foreground opacity-50'
          : variant === 'active'
          ? 'border-transparent bg-primary/15 text-primary [box-shadow:var(--glow-primary)]'
          : 'border-transparent text-foreground hover:-translate-y-px hover:bg-[var(--glass-border)] hover:[box-shadow:var(--shadow-sm)]'
      }`}
    >
      <span>{title}</span>
      <span className="flex items-center gap-1">
        {variant === 'active' && <Check size={14} />}
        {variant === 'locked' && (
          <Badge variant="outline" className="gap-1 py-0 px-1 text-xs">
            <Lock size={10} />
          </Badge>
        )}
        {variant === 'preview' && (
          <Badge variant="secondary" className="text-xs py-0">Preview</Badge>
        )}
      </span>
    </button>
  )
}
