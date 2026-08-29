import { SCALE_NAMES } from '@/data/scales.js'
import { useFretboardStore } from '@/stores/fretboardStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import LibraryItem from './LibraryItem'

const FREE_SCALE_NAMES = new Set((SCALE_NAMES as string[]).slice(0, 5))

interface ScaleLibraryProps {
  onPaywallTrigger: (el: HTMLElement) => void
}

export default function ScaleLibrary({ onPaywallTrigger }: ScaleLibraryProps) {
  const { scaleName, setScaleName } = useFretboardStore()
  const isPremium = useSubscriptionStore((s) => s.isPremium)

  return (
    <div className="flex flex-col gap-1" role="listbox" aria-label="Scale Library">
      {(SCALE_NAMES as string[]).map((name) => {
        // Premium unlocks everything: no locked/preview split, every item selectable.
        const variant = name === scaleName
          ? 'active'
          : isPremium
          ? 'default'
          : FREE_SCALE_NAMES.has(name)
          ? 'preview'
          : 'locked'

        return (
          <LibraryItem
            key={name}
            title={name}
            variant={variant}
            onSelect={() => setScaleName(name)}
            onPaywallTrigger={onPaywallTrigger}
          />
        )
      })}
    </div>
  )
}
