import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ScaleLibrary from './ScaleLibrary'
import { useFretboardStore, DEFAULT_FRETBOARD_STATE } from '@/stores/fretboardStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { SCALE_NAMES } from '@/data/scales.js'

// accessible name is either exactly the scale name (active/locked) or "<name>Preview" (preview badge appended)
const byTitle = (name: string) => (n: string) => n === name || n === name + 'Preview'

beforeEach(() => {
  useFretboardStore.setState({ scaleName: DEFAULT_FRETBOARD_STATE.scaleName })
  useSubscriptionStore.setState({ isPremium: false })
})

describe('ScaleLibrary', () => {
  it('renders all scale names as LibraryItems', () => {
    render(<ScaleLibrary onPaywallTrigger={() => {}} />)
    const items = screen.getAllByRole('option')
    expect(items).toHaveLength((SCALE_NAMES as string[]).length)
  })

  it('first 5 scales are preview variant (show "Preview" badge)', () => {
    render(<ScaleLibrary onPaywallTrigger={() => {}} />)
    const previewBadges = screen.getAllByText('Preview')
    expect(previewBadges).toHaveLength(5)
    ;(SCALE_NAMES as string[]).slice(0, 5).forEach((name) => {
      const btn = screen.getByRole('option', { name: byTitle(name) })
      expect(btn).not.toHaveAttribute('aria-disabled', 'true')
      expect(btn).not.toHaveAttribute('aria-selected', 'true')
    })
  })

  it('6th scale is locked (aria-disabled="true")', () => {
    render(<ScaleLibrary onPaywallTrigger={() => {}} />)
    const sixthScale = (SCALE_NAMES as string[])[5]
    const btn = screen.getByRole('option', { name: byTitle(sixthScale) })
    expect(btn).toHaveAttribute('aria-disabled', 'true')
  })

  it('active scale overrides locked status (scale outside free tier)', () => {
    const lockedScale = (SCALE_NAMES as string[])[10]
    useFretboardStore.setState({ scaleName: lockedScale })
    render(<ScaleLibrary onPaywallTrigger={() => {}} />)
    const btn = screen.getByRole('option', { name: byTitle(lockedScale) })
    expect(btn).toHaveAttribute('aria-selected', 'true')
    expect(btn).not.toHaveAttribute('aria-disabled', 'true')
  })

  it('active scale overrides preview status (scale inside free tier)', () => {
    const previewScale = (SCALE_NAMES as string[])[0]
    useFretboardStore.setState({ scaleName: previewScale })
    render(<ScaleLibrary onPaywallTrigger={() => {}} />)
    const btn = screen.getByRole('option', { name: byTitle(previewScale) })
    expect(btn).toHaveAttribute('aria-selected', 'true')
    expect(btn).not.toHaveAttribute('aria-disabled', 'true')
    // Active renders checkmark (no "Preview" badge) — only 4 remaining preview badges
    expect(screen.getAllByText('Preview')).toHaveLength(4)
  })

  it('clicking a preview scale updates fretboardStore.scaleName', async () => {
    const user = userEvent.setup()
    const previewScale = (SCALE_NAMES as string[])[1] // 'Dorian'
    render(<ScaleLibrary onPaywallTrigger={() => {}} />)
    await user.click(screen.getByRole('option', { name: byTitle(previewScale) }))
    expect(useFretboardStore.getState().scaleName).toBe(previewScale)
  })

  it('clicking a locked scale calls onPaywallTrigger', async () => {
    const user = userEvent.setup()
    const onPaywallTrigger = vi.fn()
    const lockedScale = (SCALE_NAMES as string[])[5] // 'Natural Minor (Aeolian)'
    render(<ScaleLibrary onPaywallTrigger={onPaywallTrigger} />)
    const lockedBtn = screen.getByRole('option', { name: byTitle(lockedScale) })
    await user.click(lockedBtn)
    expect(onPaywallTrigger).toHaveBeenCalledWith(lockedBtn)
  })

  describe('when premium', () => {
    beforeEach(() => {
      useSubscriptionStore.setState({ isPremium: true })
    })

    it('renders no locked or preview items — all selectable', () => {
      render(<ScaleLibrary onPaywallTrigger={() => {}} />)
      expect(screen.queryAllByText('Preview')).toHaveLength(0)
      screen.getAllByRole('option').forEach((btn) => {
        expect(btn).not.toHaveAttribute('aria-disabled', 'true')
      })
    })

    it('clicking a formerly-locked scale selects it instead of triggering the paywall', async () => {
      const user = userEvent.setup()
      const onPaywallTrigger = vi.fn()
      const formerlyLocked = (SCALE_NAMES as string[])[5]
      render(<ScaleLibrary onPaywallTrigger={onPaywallTrigger} />)
      await user.click(screen.getByRole('option', { name: byTitle(formerlyLocked) }))
      expect(useFretboardStore.getState().scaleName).toBe(formerlyLocked)
      expect(onPaywallTrigger).not.toHaveBeenCalled()
    })
  })
})
