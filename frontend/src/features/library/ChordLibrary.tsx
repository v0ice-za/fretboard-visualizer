import { CHORD_NAMES } from '@/data/chords.js'
import { useFretboardStore } from '@/stores/fretboardStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { playChord } from '@/lib/playChord'
import LibraryItem from './LibraryItem'
import PlayButton from './PlayButton'

// Free-preview boundary: the first N chords stay selectable without premium.
// Exported so tests can assert against it instead of a magic number.
export const FREE_TIER_CHORD_COUNT = 5
const FREE_CHORD_NAMES = new Set((CHORD_NAMES as string[]).slice(0, FREE_TIER_CHORD_COUNT))

interface ChordLibraryProps {
  onPaywallTrigger: (el: HTMLElement) => void
}

export default function ChordLibrary({ onPaywallTrigger }: ChordLibraryProps) {
  const { chordName, setChordName, rootNote } = useFretboardStore()
  const isPremium = useSubscriptionStore((s) => s.isPremium)

  const handleSelect = (name: string) => {
    // Selecting/browsing only highlights the fretboard — it never plays audio
    // (Story 7.2). The row's own Play button is the only explicit trigger.
    setChordName(chordName !== name ? name : null)
  }

  const handlePlay = (name: string) => {
    try {
      playChord(name, rootNote)
    } catch (e) {
      console.error('Audio playback failed:', e)
      // Continue normally even if audio fails; chord browsing shouldn't break
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
          <div key={name} className="flex items-center gap-1">
            <div className="min-w-0 flex-1">
              <LibraryItem
                title={name}
                variant={variant}
                onSelect={() => handleSelect(name)}
                onPaywallTrigger={onPaywallTrigger}
              />
            </div>
            <PlayButton
              label={`Play ${rootNote} ${name}`}
              locked={!isPremium}
              onPlay={() => handlePlay(name)}
              onPaywallTrigger={onPaywallTrigger}
            />
          </div>
        )
      })}
    </div>
  )
}
