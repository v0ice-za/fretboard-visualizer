import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PlayButton from './PlayButton'

describe('PlayButton', () => {
  it('unlocked: clicking calls onPlay, not onPaywallTrigger', async () => {
    const user = userEvent.setup()
    const onPlay = vi.fn()
    const onPaywallTrigger = vi.fn()
    render(<PlayButton label="Play C Major" locked={false} onPlay={onPlay} onPaywallTrigger={onPaywallTrigger} />)
    await user.click(screen.getByRole('button', { name: 'Play C Major' }))
    expect(onPlay).toHaveBeenCalledTimes(1)
    expect(onPaywallTrigger).not.toHaveBeenCalled()
  })

  it('locked: clicking calls onPaywallTrigger, not onPlay, and shows a lock icon', async () => {
    const user = userEvent.setup()
    const onPlay = vi.fn()
    const onPaywallTrigger = vi.fn()
    render(<PlayButton label="Play C Major" locked={true} onPlay={onPlay} onPaywallTrigger={onPaywallTrigger} />)
    const btn = screen.getByRole('button', { name: 'Play C Major' })
    expect(btn).toHaveAttribute('aria-disabled', 'true')
    await user.click(btn)
    expect(onPaywallTrigger).toHaveBeenCalledWith(btn)
    expect(onPlay).not.toHaveBeenCalled()
  })

  it('click does not propagate to an enclosing clickable row', async () => {
    const user = userEvent.setup()
    const onPlay = vi.fn()
    const onRowClick = vi.fn()
    render(
      <div onClick={onRowClick}>
        <PlayButton label="Play C Major" locked={false} onPlay={onPlay} />
      </div>,
    )
    await user.click(screen.getByRole('button', { name: 'Play C Major' }))
    expect(onPlay).toHaveBeenCalledTimes(1)
    expect(onRowClick).not.toHaveBeenCalled()
  })

  it('is keyboard activatable (Enter / Space)', async () => {
    const user = userEvent.setup()
    const onPlay = vi.fn()
    render(<PlayButton label="Play C Major" locked={false} onPlay={onPlay} />)
    const btn = screen.getByRole('button', { name: 'Play C Major' })
    btn.focus()
    await user.keyboard('{Enter}')
    expect(onPlay).toHaveBeenCalledTimes(1)
    await user.keyboard(' ')
    expect(onPlay).toHaveBeenCalledTimes(2)
  })
})
