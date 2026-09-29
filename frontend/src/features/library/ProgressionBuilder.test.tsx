import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProgressionBuilder from './ProgressionBuilder'
import { useProgressionStore, MAX_PROGRESSION_CHORDS } from '@/stores/progressionStore'
import { useFretboardStore, DEFAULT_FRETBOARD_STATE } from '@/stores/fretboardStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'

// Popular presets are free; Jazzy presets + the custom builder are premium. Most of
// this suite exercises the custom builder / Jazzy presets, so default to premium here
// and test the free-tier locking explicitly in its own describe block below.
beforeEach(() => {
  useProgressionStore.setState({ chords: [], activeIndex: null })
  useFretboardStore.setState({ ...DEFAULT_FRETBOARD_STATE })
  useSubscriptionStore.setState({ isPremium: true })
})

const addChord = async (root: string, quality: string) => {
  const user = userEvent.setup()
  await user.selectOptions(screen.getByLabelText('Root note'), root)
  await user.selectOptions(screen.getByLabelText('Chord quality'), quality)
  await user.click(screen.getByRole('button', { name: 'Add' }))
}

describe('ProgressionBuilder', () => {
  it('shows an empty state and disabled step controls with no chords', () => {
    render(<ProgressionBuilder />)
    expect(screen.getByText('Add chords to build a progression')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous chord in progression' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next chord in progression' })).toBeDisabled()
  })

  it('adds a chord as a labelled row', async () => {
    render(<ProgressionBuilder />)
    await addChord('C', 'Major')
    const list = screen.getByRole('list', { name: 'Chord progression' })
    expect(within(list).getByText('C Major')).toBeInTheDocument()
    expect(useProgressionStore.getState().chords).toHaveLength(1)
  })

  // Story 6.2: the quality dropdown reads CHORD_NAMES, so the expanded vocabulary
  // must list and select cleanly (the Progression tab is already premium-gated).
  it('lists and adds a new expanded quality (Major 13)', async () => {
    render(<ProgressionBuilder />)
    expect(
      within(screen.getByLabelText('Chord quality')).getByRole('option', { name: 'Major 13' }),
    ).toBeInTheDocument()
    await addChord('C', 'Major 13')
    expect(useProgressionStore.getState().chords).toEqual([
      expect.objectContaining({ rootNote: 'C', chordName: 'Major 13' }),
    ])
    expect(within(screen.getByRole('list', { name: 'Chord progression' })).getByText('C Major 13')).toBeInTheDocument()
  })

  it('reorders with up/down controls', async () => {
    const user = userEvent.setup()
    render(<ProgressionBuilder />)
    await addChord('C', 'Major')
    await addChord('A', 'Minor')
    await user.click(screen.getByRole('button', { name: 'Move A Minor up' }))
    const labels = useProgressionStore.getState().chords.map((c) => `${c.rootNote} ${c.chordName}`)
    expect(labels).toEqual(['A Minor', 'C Major'])
  })

  it('removes a chord', async () => {
    const user = userEvent.setup()
    render(<ProgressionBuilder />)
    await addChord('C', 'Major')
    await user.click(screen.getByRole('button', { name: 'Remove C Major' }))
    expect(useProgressionStore.getState().chords).toHaveLength(0)
    expect(screen.getByText('Add chords to build a progression')).toBeInTheDocument()
  })

  it('clicking a row makes it active and applies its shape to the fretboard', async () => {
    const user = userEvent.setup()
    render(<ProgressionBuilder />)
    await addChord('C', 'Major')
    await addChord('A', 'Minor')
    await user.click(screen.getByRole('button', { name: 'Select A Minor' }))
    expect(useProgressionStore.getState().activeIndex).toBe(1)
    expect(useFretboardStore.getState().rootNote).toBe('A')
    expect(useFretboardStore.getState().chordName).toBe('Minor')
  })

  it('Next / Prev step through and drive the fretboard', async () => {
    const user = userEvent.setup()
    render(<ProgressionBuilder />)
    await addChord('C', 'Major')
    await addChord('A', 'Minor')
    await user.click(screen.getByRole('button', { name: 'Next chord in progression' }))
    expect(useFretboardStore.getState().rootNote).toBe('C')
    expect(useFretboardStore.getState().chordName).toBe('Major')
    await user.click(screen.getByRole('button', { name: 'Next chord in progression' }))
    expect(useFretboardStore.getState().rootNote).toBe('A')
    expect(useFretboardStore.getState().chordName).toBe('Minor')
  })

  it('ArrowRight / ArrowLeft step through the progression', async () => {
    render(<ProgressionBuilder />)
    await addChord('C', 'Major')
    await addChord('A', 'Minor')
    fireEvent.keyDown(document.body, { key: 'ArrowRight' })
    expect(useProgressionStore.getState().activeIndex).toBe(0)
    fireEvent.keyDown(document.body, { key: 'ArrowRight' })
    expect(useProgressionStore.getState().activeIndex).toBe(1)
    expect(useFretboardStore.getState().chordName).toBe('Minor')
    fireEvent.keyDown(document.body, { key: 'ArrowLeft' })
    expect(useProgressionStore.getState().activeIndex).toBe(0)
  })

  it('disables Add and shows a message when the chord cap is reached', () => {
    const chords = Array.from({ length: MAX_PROGRESSION_CHORDS }, (_, i) => ({
      id: `c${i}`,
      rootNote: 'C',
      chordName: 'Major',
    }))
    useProgressionStore.setState({ chords, activeIndex: null })
    render(<ProgressionBuilder />)
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled()
    expect(
      screen.getByText(`Maximum ${MAX_PROGRESSION_CHORDS} chords reached`),
    ).toBeInTheDocument()
  })

  it('Clear empties the progression and restores the scale view (chordName → null)', async () => {
    const user = userEvent.setup()
    render(<ProgressionBuilder />)
    await addChord('C', 'Major')
    await user.click(screen.getByRole('button', { name: 'Next chord in progression' }))
    expect(useFretboardStore.getState().chordName).toBe('Major')
    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(useProgressionStore.getState().chords).toHaveLength(0)
    expect(useFretboardStore.getState().chordName).toBeNull()
  })

  describe('presets', () => {
    it('loads a popular preset transposed to the active root note', async () => {
      const user = userEvent.setup()
      useFretboardStore.setState({ rootNote: 'D' })
      render(<ProgressionBuilder />)
      const list = screen.getByRole('list', { name: 'Popular progressions' })
      await user.click(within(list).getByText('I – V – vi – IV'))
      const labels = useProgressionStore.getState().chords.map((c) => `${c.rootNote} ${c.chordName}`)
      // D major key: I=D, V=A, vi=Bm, IV=G
      expect(labels).toEqual(['D Major', 'A Major', 'B Minor', 'G Major'])
    })

    it('loads a jazzy preset with 7th-chord qualities', async () => {
      const user = userEvent.setup()
      useFretboardStore.setState({ rootNote: 'C' })
      render(<ProgressionBuilder />)
      const list = screen.getByRole('list', { name: 'Jazzy progressions' })
      await user.click(within(list).getByText('ii7 – V7 – Imaj7'))
      const labels = useProgressionStore.getState().chords.map((c) => `${c.rootNote} ${c.chordName}`)
      expect(labels).toEqual(['D Minor 7', 'G Dominant 7', 'C Major 7'])
    })

    it('loads the 12-bar blues preset as 12 dominant-7 chords', async () => {
      const user = userEvent.setup()
      useFretboardStore.setState({ rootNote: 'C' })
      render(<ProgressionBuilder />)
      const list = screen.getByRole('list', { name: 'Popular progressions' })
      await user.click(within(list).getByText('12-Bar Blues'))
      const chords = useProgressionStore.getState().chords
      expect(chords).toHaveLength(12)
      expect(chords.every((c) => c.chordName === 'Dominant 7')).toBe(true)
    })

    it('loading a preset replaces an existing progression instead of appending', async () => {
      const user = userEvent.setup()
      useFretboardStore.setState({ rootNote: 'C' })
      render(<ProgressionBuilder />)
      await addChord('E', 'Diminished')
      const list = screen.getByRole('list', { name: 'Popular progressions' })
      await user.click(within(list).getByText('I – IV – V'))
      const labels = useProgressionStore.getState().chords.map((c) => `${c.rootNote} ${c.chordName}`)
      expect(labels).toEqual(['C Major', 'F Major', 'G Major'])
    })
  })

  describe('free tier gating', () => {
    beforeEach(() => {
      useSubscriptionStore.setState({ isPremium: false })
    })

    it('Popular presets are usable for free', async () => {
      const user = userEvent.setup()
      useFretboardStore.setState({ rootNote: 'C' })
      render(<ProgressionBuilder />)
      const list = screen.getByRole('list', { name: 'Popular progressions' })
      await user.click(within(list).getByText('I – IV – V'))
      const labels = useProgressionStore.getState().chords.map((c) => `${c.rootNote} ${c.chordName}`)
      expect(labels).toEqual(['C Major', 'F Major', 'G Major'])
    })

    it('Jazzy presets are locked and raise the paywall instead of loading', async () => {
      const user = userEvent.setup()
      const onPaywallTrigger = vi.fn()
      render(<ProgressionBuilder onPaywallTrigger={onPaywallTrigger} />)
      const list = screen.getByRole('list', { name: 'Jazzy progressions' })
      const lockedBtn = within(list).getByText('ii7 – V7 – Imaj7').closest('button')!
      expect(lockedBtn).toHaveAttribute('aria-disabled', 'true')
      await user.click(lockedBtn)
      expect(onPaywallTrigger).toHaveBeenCalledWith(lockedBtn)
      expect(useProgressionStore.getState().chords).toHaveLength(0)
    })

    it('the custom builder is locked and raises the paywall instead of rendering the Add row', async () => {
      const user = userEvent.setup()
      const onPaywallTrigger = vi.fn()
      render(<ProgressionBuilder onPaywallTrigger={onPaywallTrigger} />)
      expect(screen.queryByLabelText('Root note')).not.toBeInTheDocument()
      const lockPrompt = screen.getByText('Build your own progression, chord by chord')
      await user.click(lockPrompt)
      expect(onPaywallTrigger).toHaveBeenCalled()
    })
  })
})
