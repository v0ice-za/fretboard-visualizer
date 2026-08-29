import { CHORD_NAMES } from '@/data/chords.js'
import { useFretboardStore } from '@/stores/fretboardStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import LibraryItem from './LibraryItem'

const FREE_CHORD_NAMES = new Set((CHORD_NAMES as string[]).slice(0, 5))

interface ChordLibraryProps {
  onPaywallTrigger: (el: HTMLElement) => void
}

export default function ChordLibrary({ onPaywallTrigger }: ChordLibraryProps) {
  const { chordName, setChordName } = useFretboardStore()
  const isPremium = useSubscriptionStore((s) => s.isPremium)

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
            onSelect={() => setChordName(chordName === name ? null : name)}
            onPaywallTrigger={onPaywallTrigger}
          />
        )
      })}
    </div>
  )
}
