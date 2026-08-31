import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProgressionBuilder from './ProgressionBuilder'
import { useProgressionStore } from '@/stores/progressionStore'
import { useFretboardStore, DEFAULT_FRETBOARD_STATE } from '@/stores/fretboardStore'

beforeEach(() => {
  useProgressionStore.setState({ chords: [], activeIndex: null })
  useFretboardStore.setState({ ...DEFAULT_FRETBOARD_STATE })
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
    expect(screen.getByRole('button', { name: 'Previous chord' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next chord' })).toBeDisabled()
  })

  it('adds a chord as a labelled row', async () => {
    render(<ProgressionBuilder />)
    await addChord('C', 'Major')
    const list = screen.getByRole('list', { name: 'Chord progression' })
    expect(within(list).getByText('C Major')).toBeInTheDocument()
    expect(useProgressionStore.getState().chords).toHaveLength(1)
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
    await user.click(screen.getByRole('button', { name: 'Next chord' }))
    expect(useFretboardStore.getState().rootNote).toBe('C')
    expect(useFretboardStore.getState().chordName).toBe('Major')
    await user.click(screen.getByRole('button', { name: 'Next chord' }))
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

  it('Clear empties the progression and restores the scale view (chordName → null)', async () => {
    const user = userEvent.setup()
    render(<ProgressionBuilder />)
    await addChord('C', 'Major')
    await user.click(screen.getByRole('button', { name: 'Next chord' }))
    expect(useFretboardStore.getState().chordName).toBe('Major')
    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(useProgressionStore.getState().chords).toHaveLength(0)
    expect(useFretboardStore.getState().chordName).toBeNull()
  })
})
