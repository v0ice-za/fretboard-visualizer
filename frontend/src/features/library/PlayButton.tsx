import { Play, Lock } from 'lucide-react'

interface PlayButtonProps {
  /** Accessible name, e.g. "Play C Major". */
  label: string
  /** True when audio is gated (non-premium) — shows a lock and raises the paywall instead of playing. */
  locked: boolean
  onPlay: () => void
  onPaywallTrigger?: (anchorEl: HTMLElement) => void
}

/**
 * Small explicit play affordance for a chord row (Story 7.2). Always a sibling of the
 * row's own selectable control, never nested inside it — selecting a chord must never
 * play audio, only this dedicated button does, and `stopPropagation` keeps a click here
 * from also bubbling into a enclosing clickable row.
 */
export default function PlayButton({ label, locked, onPlay, onPaywallTrigger }: PlayButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    if (locked) {
      onPaywallTrigger?.(e.currentTarget)
    } else {
      onPlay()
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      aria-disabled={locked}
      className="grid h-7 w-7 shrink-0 place-items-center rounded text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
    >
      {locked ? <Lock size={12} /> : <Play size={12} />}
    </button>
  )
}
