import { useState } from 'react'
import { X } from 'lucide-react'
import { useLayoutStore } from '@/stores/layoutStore'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import PaywallCard from '@/components/shared/PaywallCard'
import ScaleLibrary from './ScaleLibrary'
import ChordLibrary from './ChordLibrary'

type Tab = 'scale' | 'chord'

export default function LibraryPanel() {
  const { activeLayout, setLayout } = useLayoutStore()
  const { sidePanel } = activeLayout
  const [activeTab, setActiveTab] = useState<Tab>('scale')
  const [paywallAnchor, setPaywallAnchor] = useState<HTMLElement | null>(null)
  const [isMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches)
  const close = () => setLayout({ sidePanel: false })

  const handleTabClick = (tab: Tab) => {
    setActiveTab(tab)
    setPaywallAnchor(null)
  }

  const tabs = (
    <div className="flex border-b border-[var(--border)]" role="tablist">
      {(['scale', 'chord'] as Tab[]).map((tab) => (
        <button
          key={tab}
          onClick={() => handleTabClick(tab)}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === tab
              ? 'text-indigo-400 border-b-2 border-indigo-400'
              : 'text-slate-500 hover:text-slate-300'
          }`}
          aria-selected={activeTab === tab}
          role="tab"
        >
          {tab === 'scale' ? 'Scale Library' : 'Chord Library'}
        </button>
      ))}
    </div>
  )

  const tabContent = (
    <div className="flex-1 overflow-y-auto p-4">
      {activeTab === 'scale'
        ? <ScaleLibrary onPaywallTrigger={(el) => setPaywallAnchor(el)} />
        : <ChordLibrary onPaywallTrigger={(el) => setPaywallAnchor(el)} />
      }
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
