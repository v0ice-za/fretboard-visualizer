import { render, act, fireEvent, screen } from '@testing-library/react'
import { useProgressionPlayback } from './useProgressionPlayback'
import { useProgressionStore } from '@/stores/progressionStore'
import { useFretboardStore, DEFAULT_FRETBOARD_STATE } from '@/stores/fretboardStore'
import { playChord } from '@/lib/playChord'

vi.mock('@/lib/playChord', () => ({ playChord: vi.fn() }))

function Harness() {
  useProgressionPlayback()
  return <input aria-label="typing" />
}

beforeEach(() => {
  useProgressionStore.setState({ chords: [], activeIndex: null })
  useFretboardStore.setState({ ...DEFAULT_FRETBOARD_STATE })
  vi.mocked(playChord).mockClear()
})

describe('useProgressionPlayback', () => {
  it('ignores arrow keys while focus is in a form control', () => {
    act(() => {
      useProgressionStore.getState().addChord('C', 'Major')
      useProgressionStore.getState().addChord('A', 'Minor')
    })
    render(<Harness />)
    const input = screen.getByLabelText('typing')
    input.focus()
    fireEvent.keyDown(input, { key: 'ArrowRight' })
    expect(useProgressionStore.getState().activeIndex).toBeNull()
  })

  it('shows the active chord at its own root without touching the key, and restores on unmount', () => {
    useFretboardStore.setState({ rootNote: 'E', chordName: null, chordRoot: null })
    act(() => {
      useProgressionStore.getState().addChord('C', 'Major')
    })
    const { unmount } = render(<Harness />)

    act(() => {
      useProgressionStore.getState().setActiveIndex(0)
    })
    expect(useFretboardStore.getState().rootNote).toBe('E')
    expect(useFretboardStore.getState().chordName).toBe('Major')
    expect(useFretboardStore.getState().chordRoot).toBe('C')

    unmount()
    expect(useFretboardStore.getState().rootNote).toBe('E')
    expect(useFretboardStore.getState().chordName).toBeNull()
    expect(useFretboardStore.getState().chordRoot).toBeNull()
  })

  it('restores a pre-playback diatonic chord (name AND root) when playback stops', () => {
    useFretboardStore.setState({ rootNote: 'C', chordName: 'Minor', chordRoot: 'D' })
    act(() => {
      useProgressionStore.getState().addChord('G', 'Major')
    })
    render(<Harness />)
    act(() => {
      useProgressionStore.getState().setActiveIndex(0)
    })
    expect(useFretboardStore.getState().chordRoot).toBe('G')
    act(() => {
      useProgressionStore.getState().clear()
    })
    expect(useFretboardStore.getState().rootNote).toBe('C')
    expect(useFretboardStore.getState().chordName).toBe('Minor')
    expect(useFretboardStore.getState().chordRoot).toBe('D')
  })

  it('leaves the fretboard untouched on unmount if playback never started', () => {
    useFretboardStore.setState({ rootNote: 'E', chordName: 'Major' })
    const { unmount } = render(<Harness />)
    unmount()
    expect(useFretboardStore.getState().rootNote).toBe('E')
    expect(useFretboardStore.getState().chordName).toBe('Major')
  })

  // Story 7.2: stepping drives the fretboard display only — it never plays audio.
  it('never calls playChord while stepping (activeIndex changes, arrow keys)', () => {
    act(() => {
      useProgressionStore.getState().addChord('C', 'Major')
      useProgressionStore.getState().addChord('A', 'Minor')
    })
    render(<Harness />)
    act(() => {
      useProgressionStore.getState().setActiveIndex(0)
    })
    fireEvent.keyDown(document.body, { key: 'ArrowRight' })
    fireEvent.keyDown(document.body, { key: 'ArrowLeft' })
    expect(playChord).not.toHaveBeenCalled()
  })
})
