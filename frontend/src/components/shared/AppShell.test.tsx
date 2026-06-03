import { render, screen } from '@testing-library/react'
import AppShell from './AppShell'
import { useLayoutStore } from '@/stores/layoutStore'

const DEFAULT_LAYOUT = {
  topBar: true,
  modeRow: false,
  sidePanel: false,
  bottomBar: false,
  libraryMode: 'drawer' as const,
}

beforeEach(() => {
  useLayoutStore.setState({ activeLayout: DEFAULT_LAYOUT })
})

describe('AppShell', () => {
  it('renders skip link as first focusable element with correct classes', () => {
    render(<AppShell><div id="fretboard">content</div></AppShell>)
    const skipLink = screen.getByText('Skip to fretboard')
    expect(skipLink).toBeInTheDocument()
    expect(skipLink).toHaveAttribute('href', '#fretboard')
    expect(skipLink).toHaveClass('sr-only', 'focus:not-sr-only')
  })

  it('renders children', () => {
    render(<AppShell><div data-testid="child">hello</div></AppShell>)
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('app-shell div has side-panel-open class when sidePanel is true', () => {
    useLayoutStore.setState({ activeLayout: { ...DEFAULT_LAYOUT, sidePanel: true } })
    const { container } = render(<AppShell><div /></AppShell>)
    expect(container.querySelector('.app-shell')).toHaveClass('side-panel-open')
  })

  it('app-shell div does NOT have side-panel-open class when sidePanel is false', () => {
    const { container } = render(<AppShell><div /></AppShell>)
    expect(container.querySelector('.app-shell')).not.toHaveClass('side-panel-open')
  })
})
