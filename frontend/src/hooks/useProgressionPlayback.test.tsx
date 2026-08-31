import { render, act, fireEvent, screen } from '@testing-library/react'
import { useProgressionPlayback } from './useProgressionPlayback'
import { useProgressionStore } from '@/stores/progressionStore'
import { useFretboardStore, DEFAULT_FRETBOARD_STATE } from '@/stores/fretboardStore'

function Harness() {
  useProgressionPlayback()
  return <input aria-label="typing" />
}

beforeEach(() => {
  useProgressionStore.setState({ chords: [], activeIndex: null })
  useFretboardStore.setState({ ...DEFAULT_FRETBOARD_STATE })
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

  it('restores the pre-playback fretboard state on unmount', () => {
    useFretboardStore.setState({ rootNote: 'E', chordName: null })
    act(() => {
      useProgressionStore.getState().addChord('C', 'Major')
    })
    const { unmount } = render(<Harness />)

    act(() => {
      useProgressionStore.getState().setActiveIndex(0)
    })
    expect(useFretboardStore.getState().rootNote).toBe('C')
    expect(useFretboardStore.getState().chordName).toBe('Major')

    unmount()
    expect(useFretboardStore.getState().rootNote).toBe('E')
    expect(useFretboardStore.getState().chordName).toBeNull()
  })

  it('leaves the fretboard untouched on unmount if playback never started', () => {
    useFretboardStore.setState({ rootNote: 'E', chordName: 'Major' })
    const { unmount } = render(<Harness />)
    unmount()
    expect(useFretboardStore.getState().rootNote).toBe('E')
    expect(useFretboardStore.getState().chordName).toBe('Major')
  })
})
