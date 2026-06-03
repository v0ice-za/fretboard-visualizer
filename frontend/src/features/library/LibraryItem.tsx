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
      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
        variant === 'locked'
          ? 'opacity-50 cursor-not-allowed text-slate-500'
          : variant === 'active'
          ? 'bg-indigo-500/15 text-indigo-300'
          : 'text-slate-300 hover:bg-white/5'
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
