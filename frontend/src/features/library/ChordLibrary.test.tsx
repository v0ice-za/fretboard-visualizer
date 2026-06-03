import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChordLibrary from './ChordLibrary'
import { useFretboardStore, DEFAULT_FRETBOARD_STATE } from '@/stores/fretboardStore'
import { CHORD_NAMES } from '@/data/chords.js'

const byTitle = (name: string) => (n: string) => n === name || n === name + 'Preview'

beforeEach(() => {
  useFretboardStore.setState({ ...DEFAULT_FRETBOARD_STATE })
})

describe('ChordLibrary', () => {
  it('renders all chord names as LibraryItems', () => {
    render(<ChordLibrary onPaywallTrigger={() => {}} />)
    const items = screen.getAllByRole('option')
    expect(items).toHaveLength((CHORD_NAMES as string[]).length)
  })

  it('first 5 chords are preview variant (show "Preview" badge)', () => {
    render(<ChordLibrary onPaywallTrigger={() => {}} />)
    expect(screen.getAllByText('Preview')).toHaveLength(5)
    ;(CHORD_NAMES as string[]).slice(0, 5).forEach((name) => {
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
})
