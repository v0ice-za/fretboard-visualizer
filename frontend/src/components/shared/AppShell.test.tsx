import { render, screen } from '@testing-library/react'
import AppShell from './AppShell'

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
})
