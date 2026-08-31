import { useState } from 'react'
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
  scale: 'Scale Library',
  chord: 'Chord Library',
  progression: 'Progression',
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

  const tabs = (
    <div className="flex border-b border-[var(--border)]" role="tablist">
      {(['scale', 'chord', 'progression'] as Tab[]).map((tab) => (
        <button
          key={tab}
          onClick={(e) => handleTabClick(tab, e)}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === tab
              ? 'text-indigo-400 border-b-2 border-indigo-400'
              : 'text-slate-500 hover:text-slate-300'
          }`}
          aria-selected={activeTab === tab}
          role="tab"
        >
          {TAB_LABELS[tab]}
        </button>
      ))}
    </div>
  )

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
          className="hidden md:flex flex-col border-l border-[var(--border)] bg-card"
          aria-label="Library panel"
        >
          <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)]">
            <span className="text-sm font-semibold text-slate-300">Library</span>
            <button
              onClick={close}
              className="p-1 rounded text-slate-500 hover:text-slate-300"
              aria-label="Close library panel"
            >
              <X size={14} />
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
          <SheetContent side="bottom" className="h-[60vh] flex flex-col" showCloseButton={false}>
            <SheetHeader className="border-b border-[var(--border)] pb-2">
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
