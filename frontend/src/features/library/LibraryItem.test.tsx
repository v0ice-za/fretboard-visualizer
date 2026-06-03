import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LibraryItem from './LibraryItem'

describe('LibraryItem', () => {
  it('default variant renders title, no badge, is clickable, calls onSelect', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<LibraryItem title="A Minor" variant="default" onSelect={onSelect} />)
    expect(screen.getByText('A Minor')).toBeInTheDocument()
    expect(screen.queryByText('Preview')).not.toBeInTheDocument()
    await user.click(screen.getByRole('option'))
    expect(onSelect).toHaveBeenCalled()
  })

  it('active variant renders checkmark icon, aria-selected=true, indigo styling', () => {
    render(<LibraryItem title="D Dorian" variant="active" />)
    const btn = screen.getByRole('option')
    expect(btn).toHaveAttribute('aria-selected', 'true')
    expect(btn.className).toContain('indigo')
  })

  it('locked variant renders lock Badge, aria-disabled=true, click calls onPaywallTrigger', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const onPaywallTrigger = vi.fn()
    render(
      <LibraryItem
        title="G Harmonic Minor"
        variant="locked"
        onSelect={onSelect}
        onPaywallTrigger={onPaywallTrigger}
      />
    )
    const btn = screen.getByRole('option')
    expect(btn).toHaveAttribute('aria-disabled', 'true')
    await user.click(btn)
    expect(onPaywallTrigger).toHaveBeenCalledWith(btn)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('preview variant renders "Preview" badge, is clickable, calls onSelect', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<LibraryItem title="E Phrygian" variant="preview" onSelect={onSelect} />)
    expect(screen.getByText('Preview')).toBeInTheDocument()
    await user.click(screen.getByRole('option'))
    expect(onSelect).toHaveBeenCalled()
  })

  it('clicking locked does NOT call onSelect', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<LibraryItem title="G Harmonic Minor" variant="locked" onSelect={onSelect} />)
    await user.click(screen.getByRole('option'))
    expect(onSelect).not.toHaveBeenCalled()
  })
})
