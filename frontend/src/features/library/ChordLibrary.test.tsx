import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChordLibrary, { FREE_TIER_CHORD_COUNT } from './ChordLibrary'
import { useFretboardStore, DEFAULT_FRETBOARD_STATE } from '@/stores/fretboardStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { CHORD_NAMES } from '@/data/chords.js'
import { playChord } from '@/lib/playChord'

vi.mock('@/lib/playChord', () => ({ playChord: vi.fn() }))

const byTitle = (name: string) => (n: string) => n === name || n === name + 'Preview'

beforeEach(() => {
  useFretboardStore.setState({ ...DEFAULT_FRETBOARD_STATE })
  useSubscriptionStore.setState({ isPremium: false })
  vi.mocked(playChord).mockClear()
})

describe('ChordLibrary', () => {
  it('renders all chord names as LibraryItems', () => {
    render(<ChordLibrary onPaywallTrigger={() => {}} />)
    const items = screen.getAllByRole('option')
    expect(items).toHaveLength((CHORD_NAMES as string[]).length)
  })

  it('first 5 chords are preview variant (show "Preview" badge)', () => {
    render(<ChordLibrary onPaywallTrigger={() => {}} />)
    expect(screen.getAllByText('Preview')).toHaveLength(FREE_TIER_CHORD_COUNT)
    ;(CHORD_NAMES as string[]).slice(0, FREE_TIER_CHORD_COUNT).forEach((name) => {
      const btn = screen.getByRole('option', { name: byTitle(name) })
      expect(btn).not.toHaveAttribute('aria-disabled', 'true')
      expect(btn).not.toHaveAttribute('aria-selected', 'true')
    })
  })

  it('6th chord is locked (aria-disabled="true")', () => {
    render(<ChordLibrary onPaywallTrigger={() => {}} />)
    const sixthChord = (CHORD_NAMES as string[])[5]
    const btn = screen.getByRole('option', { name: byTitle(sixthChord) })
    expect(btn).toHaveAttribute('aria-disabled', 'true')
  })

  it('active chord overrides locked status (chord outside free tier)', () => {
    const lockedChord = (CHORD_NAMES as string[])[7]
    useFretboardStore.setState({ chordName: lockedChord })
    render(<ChordLibrary onPaywallTrigger={() => {}} />)
    const btn = screen.getByRole('option', { name: byTitle(lockedChord) })
    expect(btn).toHaveAttribute('aria-selected', 'true')
    expect(btn).not.toHaveAttribute('aria-disabled', 'true')
  })

  it('active chord overrides preview status (chord inside free tier)', () => {
    const previewChord = (CHORD_NAMES as string[])[0]
    useFretboardStore.setState({ chordName: previewChord })
    render(<ChordLibrary onPaywallTrigger={() => {}} />)
    const btn = screen.getByRole('option', { name: byTitle(previewChord) })
    expect(btn).toHaveAttribute('aria-selected', 'true')
    expect(screen.getAllByText('Preview')).toHaveLength(4)
  })

  it('clicking a preview chord updates fretboardStore.chordName', async () => {
    const user = userEvent.setup()
    const previewChord = (CHORD_NAMES as string[])[1]
    render(<ChordLibrary onPaywallTrigger={() => {}} />)
    await user.click(screen.getByRole('option', { name: byTitle(previewChord) }))
    expect(useFretboardStore.getState().chordName).toBe(previewChord)
  })

  it('clicking an active chord sets chordName to null (deselect)', async () => {
    const user = userEvent.setup()
    const previewChord = (CHORD_NAMES as string[])[0]
    useFretboardStore.setState({ chordName: previewChord })
    render(<ChordLibrary onPaywallTrigger={() => {}} />)
    await user.click(screen.getByRole('option', { name: byTitle(previewChord) }))
    expect(useFretboardStore.getState().chordName).toBeNull()
  })

  it('clicking a locked chord calls onPaywallTrigger', async () => {
    const user = userEvent.setup()
    const onPaywallTrigger = vi.fn()
    const lockedChord = (CHORD_NAMES as string[])[5]
    render(<ChordLibrary onPaywallTrigger={onPaywallTrigger} />)
    const lockedBtn = screen.getByRole('option', { name: byTitle(lockedChord) })
    await user.click(lockedBtn)
    expect(onPaywallTrigger).toHaveBeenCalledWith(lockedBtn)
  })

  // Story 6.2: the expanded chords are all appended past index 5, so free users
  // must see them locked (only the first-5 basics stay free).
  it('a new expanded chord (Dominant 13) is locked for free users', () => {
    expect((CHORD_NAMES as string[]).indexOf('Dominant 13')).toBeGreaterThanOrEqual(FREE_TIER_CHORD_COUNT)
    render(<ChordLibrary onPaywallTrigger={() => {}} />)
    const btn = screen.getByRole('option', { name: byTitle('Dominant 13') })
    expect(btn).toHaveAttribute('aria-disabled', 'true')
  })

  describe('when premium', () => {
    beforeEach(() => {
      useSubscriptionStore.setState({ isPremium: true })
    })

    it('renders no locked or preview items — all selectable', () => {
      render(<ChordLibrary onPaywallTrigger={() => {}} />)
      expect(screen.queryAllByText('Preview')).toHaveLength(0)
      screen.getAllByRole('option').forEach((btn) => {
        expect(btn).not.toHaveAttribute('aria-disabled', 'true')
      })
    })

    it('clicking a formerly-locked chord selects it instead of triggering the paywall', async () => {
      const user = userEvent.setup()
      const onPaywallTrigger = vi.fn()
      const formerlyLocked = (CHORD_NAMES as string[])[5]
      render(<ChordLibrary onPaywallTrigger={onPaywallTrigger} />)
      await user.click(screen.getByRole('option', { name: byTitle(formerlyLocked) }))
      expect(useFretboardStore.getState().chordName).toBe(formerlyLocked)
      expect(onPaywallTrigger).not.toHaveBeenCalled()
    })

    it('a new expanded chord (Dominant 13) is selectable for premium users', async () => {
      const user = userEvent.setup()
      render(<ChordLibrary onPaywallTrigger={() => {}} />)
      await user.click(screen.getByRole('option', { name: byTitle('Dominant 13') }))
      expect(useFretboardStore.getState().chordName).toBe('Dominant 13')
    })
  })

  // Story 7.2: browsing/selecting must never play audio — only an explicit Play click does.
  describe('explicit Play controls (Story 7.2)', () => {
    it('selecting and deselecting a chord never calls playChord', async () => {
      const user = userEvent.setup()
      const previewChord = (CHORD_NAMES as string[])[0]
      render(<ChordLibrary onPaywallTrigger={() => {}} />)
      await user.click(screen.getByRole('option', { name: byTitle(previewChord) }))
      await user.click(screen.getByRole('option', { name: byTitle(previewChord) })) // deselect
      expect(playChord).not.toHaveBeenCalled()
    })

    it('renders exactly one Play button per chord', () => {
      render(<ChordLibrary onPaywallTrigger={() => {}} />)
      expect(screen.getAllByRole('button', { name: /^Play / })).toHaveLength((CHORD_NAMES as string[]).length)
    })

    it('free user: clicking Play raises the paywall instead of playing', async () => {
      const user = userEvent.setup()
      const onPaywallTrigger = vi.fn()
      const name = (CHORD_NAMES as string[])[0]
      render(<ChordLibrary onPaywallTrigger={onPaywallTrigger} />)
      await user.click(screen.getByRole('button', { name: `Play ${DEFAULT_FRETBOARD_STATE.rootNote} ${name}` }))
      expect(onPaywallTrigger).toHaveBeenCalled()
      expect(playChord).not.toHaveBeenCalled()
    })

    it('premium user: clicking Play calls playChord with the chord type and current root, without changing selection', async () => {
      const user = userEvent.setup()
      useSubscriptionStore.setState({ isPremium: true })
      const name = (CHORD_NAMES as string[])[0]
      render(<ChordLibrary onPaywallTrigger={() => {}} />)
      await user.click(screen.getByRole('button', { name: `Play ${DEFAULT_FRETBOARD_STATE.rootNote} ${name}` }))
      expect(playChord).toHaveBeenCalledWith(name, DEFAULT_FRETBOARD_STATE.rootNote)
      expect(useFretboardStore.getState().chordName).toBeNull()
    })
  })
})
