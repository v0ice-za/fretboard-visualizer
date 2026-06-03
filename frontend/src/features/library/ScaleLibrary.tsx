import { SCALE_NAMES } from '@/data/scales.js'
import { useFretboardStore } from '@/stores/fretboardStore'
import LibraryItem from './LibraryItem'

const FREE_SCALE_NAMES = new Set((SCALE_NAMES as string[]).slice(0, 5))

interface ScaleLibraryProps {
  onPaywallTrigger: (el: HTMLElement) => void
}

export default function ScaleLibrary({ onPaywallTrigger }: ScaleLibraryProps) {
  const { scaleName, setScaleName } = useFretboardStore()

  return (
    <div className="flex flex-col gap-1" role="listbox" aria-label="Scale Library">
      {(SCALE_NAMES as string[]).map((name) => {
        const variant = name === scaleName
          ? 'active'
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
