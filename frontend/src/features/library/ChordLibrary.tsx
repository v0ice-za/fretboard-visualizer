import { CHORD_NAMES } from '@/data/chords.js'
import { useFretboardStore } from '@/stores/fretboardStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { playChord } from '@/lib/playChord'
import LibraryItem from './LibraryItem'

const FREE_CHORD_NAMES = new Set((CHORD_NAMES as string[]).slice(0, 5))

interface ChordLibraryProps {
  onPaywallTrigger: (el: HTMLElement) => void
}

export default function ChordLibrary({ onPaywallTrigger }: ChordLibraryProps) {
  const { chordName, setChordName, rootNote } = useFretboardStore()
  const isPremium = useSubscriptionStore((s) => s.isPremium)

  const handleSelect = (name: string) => {
    const selecting = chordName !== name
    setChordName(selecting ? name : null)
    // Standard-tab chords root at the scale root; play only on select, not deselect.
    // Audio is gated internally by playChord (checks audioStore.enabled + isPremium).
    if (selecting) {
      try {
        playChord(name, rootNote)
      } catch (e) {
        console.error('Audio playback failed:', e)
        // Continue normally even if audio fails; chord selection shouldn't break
      }
    }
  }

  return (
    <div className="flex flex-col gap-1" role="listbox" aria-label="Chord Library">
      {(CHORD_NAMES as string[]).map((name) => {
        // Premium unlocks everything: no locked/preview split, every item selectable.
        const variant = name === chordName
          ? 'active'
          : isPremium
          ? 'default'
          : FREE_CHORD_NAMES.has(name)
          ? 'preview'
          : 'locked'

        return (
          <LibraryItem
            key={name}
            title={name}
            variant={variant}
            onSelect={() => handleSelect(name)}
            onPaywallTrigger={onPaywallTrigger}
          />
        )
      })}
    </div>
  )
}
