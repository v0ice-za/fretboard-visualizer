import { useLayoutEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useLayoutStore } from '@/stores/layoutStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import PaywallCard from '@/components/shared/PaywallCard'
import ScaleLibrary from './ScaleLibrary'
import ChordLibrary from './ChordLibrary'
import ProgressionBuilder from './ProgressionBuilder'

type Tab = 'scale' | 'chord' | 'progression'

const TAB_LABELS: Record<Tab, string> = {
  scale: 'Scales',
  chord: 'Chords',
  progression: 'Progression',
}

const TAB_ORDER: Tab[] = ['scale', 'chord', 'progression']

/** Tab row with a sliding active indicator (Story 5.3 AC1) — measures the active
 * tab's own position/width so the highlight animates to it, instead of a static
 * per-tab border. Rendered independently on desktop and mobile so each instance
 * tracks its own layout. */
function TabsRow({
  activeTab,
  onTabClick,
}: {
  activeTab: Tab
  onTabClick: (tab: Tab, e: React.MouseEvent<HTMLButtonElement>) => void
}) {
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({})
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null)

  useLayoutEffect(() => {
    const measure = () => {
      const el = tabRefs.current[activeTab]
      if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [activeTab])

  return (
    <div className="relative flex gap-1 px-3 border-b border-[var(--glass-border)]" role="tablist">
      {TAB_ORDER.map((tab) => (
        <button
          key={tab}
          ref={(el) => { tabRefs.current[tab] = el }}
          onClick={(e) => onTabClick(tab, e)}
          className={`select-none rounded-t-md px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === tab
              ? 'text-primary'
              : 'text-muted-foreground hover:bg-[var(--glass-border)] hover:text-foreground'
          }`}
          aria-selected={activeTab === tab}
          role="tab"
        >
          {TAB_LABELS[tab]}
        </button>
      ))}
      <span
        aria-hidden
        className="absolute bottom-0 h-0.5 rounded-full bg-primary transition-[left,width] duration-200 ease-out [box-shadow:var(--glow-primary)]"
        style={indicator ? { left: indicator.left, width: indicator.width } : { display: 'none' }}
      />
    </div>
  )
}

export default function LibraryPanel() {
  const { activeLayout, setLayout } = useLayoutStore()
  const { sidePanel } = activeLayout
  const isPremium = useSubscriptionStore((s) => s.isPremium)
  const [activeTab, setActiveTab] = useState<Tab>('scale')
  const [paywallAnchor, setPaywallAnchor] = useState<HTMLElement | null>(null)
  const [isMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches)
  const close = () => setLayout({ sidePanel: false })

  const handleTabClick = (tab: Tab, e: React.MouseEvent<HTMLButtonElement>) => {
    // The progression builder is premium-only: gate it like a locked library item.
    if (tab === 'progression' && !isPremium) {
      setPaywallAnchor(e.currentTarget)
      return
    }
    setActiveTab(tab)
    setPaywallAnchor(null)
  }

  const tabs = <TabsRow activeTab={activeTab} onTabClick={handleTabClick} />

  const tabContent = (
    <div className="flex-1 overflow-y-auto p-4">
      {activeTab === 'scale' && <ScaleLibrary onPaywallTrigger={(el) => setPaywallAnchor(el)} />}
      {activeTab === 'chord' && <ChordLibrary onPaywallTrigger={(el) => setPaywallAnchor(el)} />}
      {activeTab === 'progression' && isPremium && <ProgressionBuilder />}
    </div>
  )

  return (
    <>
      {/* Desktop aside — only rendered when panel is open */}
      {sidePanel && (
        <aside
          style={{ gridArea: 'library-panel' }}
          className="glass-surface hidden flex-col md:flex"
          aria-label="Library panel"
        >
          <div className="flex select-none items-center justify-between border-b border-[var(--glass-border)] px-4 py-3.5">
            <span className="text-[15px] font-semibold tracking-tight text-foreground">Library</span>
            <button
              onClick={close}
              className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-[var(--glass-border)] hover:text-foreground"
              aria-label="Close library panel"
            >
              <X size={16} />
            </button>
          </div>
          {tabs}
          {tabContent}
          <PaywallCard
            open={!!paywallAnchor}
            anchorEl={paywallAnchor}
            onClose={() => setPaywallAnchor(null)}
          />
        </aside>
      )}

      {/* Mobile bottom Sheet */}
      <div className="md:hidden">
        <Sheet open={isMobile && sidePanel} onOpenChange={(open) => { if (!open) close() }}>
          <SheetContent side="bottom" className="glass-overlay flex h-[60vh] flex-col" showCloseButton={false}>
            <SheetHeader className="select-none border-b border-[var(--glass-border)] px-4 py-3.5">
              <SheetTitle>Library</SheetTitle>
            </SheetHeader>
            {tabs}
            {tabContent}
            <PaywallCard
              open={!!paywallAnchor}
              anchorEl={null}
              inline
              onClose={() => setPaywallAnchor(null)}
            />
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
