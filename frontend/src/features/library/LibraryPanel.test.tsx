import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LibraryPanel from './LibraryPanel'
import { useLayoutStore } from '@/stores/layoutStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { useFretboardStore, DEFAULT_FRETBOARD_STATE } from '@/stores/fretboardStore'

// base-ui uses ResizeObserver internally — polyfill for jsdom
;(globalThis as Record<string, unknown>).ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const DEFAULT_LAYOUT = {
  topBar: true,
  modeRow: false,
  sidePanel: false,
  bottomBar: false,
  libraryMode: 'drawer' as const,
}

beforeEach(() => {
  useLayoutStore.setState({ activeLayout: DEFAULT_LAYOUT })
  useSubscriptionStore.setState({ isPremium: false })
  useFretboardStore.setState({ ...DEFAULT_FRETBOARD_STATE })
})

describe('LibraryPanel — desktop aside', () => {
  it('renders <aside> when sidePanel is true', () => {
    useLayoutStore.setState({ activeLayout: { ...DEFAULT_LAYOUT, sidePanel: true } })
    const { container } = render(<LibraryPanel />)
    expect(container.querySelector('aside[aria-label="Library panel"]')).toBeInTheDocument()
  })

  it('does not render <aside> when sidePanel is false', () => {
    const { container } = render(<LibraryPanel />)
    expect(container.querySelector('aside[aria-label="Library panel"]')).not.toBeInTheDocument()
  })

  it('close button calls setLayout({ sidePanel: false })', async () => {
    const user = userEvent.setup()
    useLayoutStore.setState({ activeLayout: { ...DEFAULT_LAYOUT, sidePanel: true } })
    const { container } = render(<LibraryPanel />)
    const closeBtn = container.querySelector('button[aria-label="Close library panel"]') as HTMLElement
    await user.click(closeBtn)
    expect(useLayoutStore.getState().activeLayout.sidePanel).toBe(false)
  })

  it('"Scale Library" tab is active by default', () => {
    useLayoutStore.setState({ activeLayout: { ...DEFAULT_LAYOUT, sidePanel: true } })
    const { container } = render(<LibraryPanel />)
    const aside = container.querySelector('aside')!
    const scaleTab = aside.querySelector('button[role="tab"][aria-selected="true"]')
    expect(scaleTab).toHaveTextContent('Scale Library')
  })

  it('clicking "Chord Library" tab switches active tab', async () => {
    const user = userEvent.setup()
    useLayoutStore.setState({ activeLayout: { ...DEFAULT_LAYOUT, sidePanel: true } })
    const { container } = render(<LibraryPanel />)
    const aside = container.querySelector('aside')!
    const chordTab = Array.from(aside.querySelectorAll('button[role="tab"]')).find(
      (el) => el.textContent === 'Chord Library'
    ) as HTMLElement
    await user.click(chordTab)
    expect(chordTab).toHaveAttribute('aria-selected', 'true')
  })

  it('clicking locked LibraryItem shows PaywallCard', async () => {
    const user = userEvent.setup()
    useLayoutStore.setState({ activeLayout: { ...DEFAULT_LAYOUT, sidePanel: true } })
    const { container } = render(<LibraryPanel />)
    const aside = container.querySelector('aside')!
    const lockedBtn = aside.querySelector('button[aria-disabled="true"]') as HTMLElement
    await user.click(lockedBtn)
    expect(document.querySelector('[data-testid="paywall-card"]')).toBeInTheDocument()
  })

  it('switching tabs closes PaywallCard', async () => {
    const user = userEvent.setup()
    useLayoutStore.setState({ activeLayout: { ...DEFAULT_LAYOUT, sidePanel: true } })
    const { container } = render(<LibraryPanel />)
    const aside = container.querySelector('aside')!
    const lockedBtn = aside.querySelector('button[aria-disabled="true"]') as HTMLElement
    await user.click(lockedBtn)
    expect(document.querySelector('[data-testid="paywall-card"]')).toBeInTheDocument()
    const chordTab = Array.from(aside.querySelectorAll('button[role="tab"]')).find(
      (el) => el.textContent === 'Chord Library'
    ) as HTMLElement
    await user.click(chordTab)
    expect(document.querySelector('[data-testid="paywall-card"]')).not.toBeInTheDocument()
  })
})

describe('LibraryPanel — mobile Sheet', () => {
  beforeEach(() => {
    window.matchMedia = (query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
  })

  it('Sheet open prop is true when sidePanel is true', () => {
    useLayoutStore.setState({ activeLayout: { ...DEFAULT_LAYOUT, sidePanel: true } })
    render(<LibraryPanel />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('Sheet is not rendered when sidePanel is false', () => {
    render(<LibraryPanel />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
