import { resolveCustomTuningStrings } from './useCustomTunings'
import type { CustomTuning } from '@/types/api'

const custom: CustomTuning = {
  id: 1,
  name: 'My Drop C',
  strings: ['C2', 'G2', 'C3', 'F3', 'A3', 'D4'],
  createdAt: null,
}

describe('resolveCustomTuningStrings', () => {
  it('returns undefined for a predefined tuning (FretboardCanvas uses its own lookup)', () => {
    expect(resolveCustomTuningStrings('Standard E', [custom])).toBeUndefined()
  })

  it('returns octave-stripped pitch-class strings for a custom tuning', () => {
    expect(resolveCustomTuningStrings('My Drop C', [custom])).toEqual([
      'C', 'G', 'C', 'F', 'A', 'D',
    ])
  })

  it('returns undefined when the custom list is undefined', () => {
    expect(resolveCustomTuningStrings('My Drop C', undefined)).toBeUndefined()
  })

  it('returns undefined for an unknown tuning name', () => {
    expect(resolveCustomTuningStrings('Nonexistent', [custom])).toBeUndefined()
  })
})
