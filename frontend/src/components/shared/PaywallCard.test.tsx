import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PaywallCard from './PaywallCard'

describe('PaywallCard', () => {
  it('renders when open=true (inline)', () => {
    render(<PaywallCard open anchorEl={null} onClose={() => {}} inline />)
    expect(document.querySelector('[data-testid="paywall-card"]')).toBeInTheDocument()
  })

  it('does not render when open=false', () => {
    render(<PaywallCard open={false} anchorEl={null} onClose={() => {}} inline />)
    expect(document.querySelector('[data-testid="paywall-card"]')).not.toBeInTheDocument()
  })

  it('shows headline, benefit bullets, price, Upgrade CTA, dismiss button', () => {
    render(<PaywallCard open anchorEl={null} onClose={() => {}} inline />)
    expect(screen.getByText('Unlock Premium')).toBeInTheDocument()
    expect(screen.getByText(/Access all 14 tunings/)).toBeInTheDocument()
    expect(screen.getByText(/Full chord library/)).toBeInTheDocument()
    expect(screen.getByText(/Session persistence/)).toBeInTheDocument()
    expect(screen.getByText('$12/yr')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Upgrade/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Dismiss paywall/i })).toBeInTheDocument()
  })

  it('has max-w-[280px] class', () => {
    render(<PaywallCard open anchorEl={null} onClose={() => {}} inline />)
    const card = document.querySelector('[data-testid="paywall-card"]')!
    expect(card.className).toContain('max-w-[280px]')
  })

  it('dismiss button calls onClose', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<PaywallCard open anchorEl={null} onClose={onClose} inline />)
    await user.click(screen.getByRole('button', { name: /Dismiss paywall/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('Escape key calls onClose (inline mode)', () => {
    const onClose = vi.fn()
    render(<PaywallCard open anchorEl={null} onClose={onClose} inline />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('click outside closes inline PaywallCard', () => {
    const onClose = vi.fn()
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <PaywallCard open anchorEl={null} onClose={onClose} inline />
      </div>
    )
    fireEvent.mouseDown(screen.getByTestId('outside'))
    expect(onClose).toHaveBeenCalled()
  })

  it('click inside inline PaywallCard does NOT call onClose', () => {
    const onClose = vi.fn()
    render(<PaywallCard open anchorEl={null} onClose={onClose} inline />)
    fireEvent.mouseDown(document.querySelector('[data-testid="paywall-card"]')!)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('inline mode: renders as div block, no dialog role', () => {
    render(<PaywallCard open anchorEl={null} onClose={() => {}} inline />)
    const card = document.querySelector('[data-testid="paywall-card"]')!
    expect(card.tagName).toBe('DIV')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders in desktop (floating) mode with role="dialog"', () => {
    render(<PaywallCard open anchorEl={null} onClose={() => {}} />)
    const card = document.querySelector('[data-testid="paywall-card"]')!
    expect(card).toBeInTheDocument()
    expect(card).toHaveAttribute('role', 'dialog')
    expect(card).toHaveAttribute('aria-label', 'Upgrade to Premium')
  })
})
