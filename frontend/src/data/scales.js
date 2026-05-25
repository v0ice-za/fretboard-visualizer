// Intervals as semitones from root (0 = root)
export const SCALES = {
  // Major modes
  'Major (Ionian)': { intervals: [0, 2, 4, 5, 7, 9, 11], category: 'Diatonic' },
  'Dorian': { intervals: [0, 2, 3, 5, 7, 9, 10], category: 'Diatonic' },
  'Phrygian': { intervals: [0, 1, 3, 5, 7, 8, 10], category: 'Diatonic' },
  'Lydian': { intervals: [0, 2, 4, 6, 7, 9, 11], category: 'Diatonic' },
  'Mixolydian': { intervals: [0, 2, 4, 5, 7, 9, 10], category: 'Diatonic' },
  'Natural Minor (Aeolian)': { intervals: [0, 2, 3, 5, 7, 8, 10], category: 'Diatonic' },
  'Locrian': { intervals: [0, 1, 3, 5, 6, 8, 10], category: 'Diatonic' },

  // Pentatonic
  'Pentatonic Major': { intervals: [0, 2, 4, 7, 9], category: 'Pentatonic' },
  'Pentatonic Minor': { intervals: [0, 3, 5, 7, 10], category: 'Pentatonic' },
  'Blues Major': { intervals: [0, 2, 3, 4, 7, 9], category: 'Pentatonic' },
  'Blues Minor': { intervals: [0, 3, 5, 6, 7, 10], category: 'Pentatonic' },

  // Harmonic / Melodic
  'Harmonic Minor': { intervals: [0, 2, 3, 5, 7, 8, 11], category: 'Minor Variants' },
  'Harmonic Major': { intervals: [0, 2, 4, 5, 7, 8, 11], category: 'Minor Variants' },
  'Melodic Minor': { intervals: [0, 2, 3, 5, 7, 9, 11], category: 'Minor Variants' },
  'Phrygian Dominant': { intervals: [0, 1, 4, 5, 7, 8, 10], category: 'Minor Variants' },

  // Symmetric
  'Whole Tone': { intervals: [0, 2, 4, 6, 8, 10], category: 'Symmetric' },
  'Diminished (H-W)': { intervals: [0, 1, 3, 4, 6, 7, 9, 10], category: 'Symmetric' },
  'Diminished (W-H)': { intervals: [0, 2, 3, 5, 6, 8, 9, 11], category: 'Symmetric' },
  'Chromatic': { intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], category: 'Symmetric' },

  // Exotic
  'Hungarian Minor': { intervals: [0, 2, 3, 6, 7, 8, 11], category: 'Exotic' },
  'Double Harmonic (Byzantine)': { intervals: [0, 1, 4, 5, 7, 8, 11], category: 'Exotic' },
  'Persian': { intervals: [0, 1, 4, 5, 6, 8, 11], category: 'Exotic' },
  'Arabic': { intervals: [0, 2, 4, 5, 6, 8, 10], category: 'Exotic' },
  'Japanese (In)': { intervals: [0, 1, 5, 7, 8], category: 'Exotic' },
  'Hirajoshi': { intervals: [0, 2, 3, 7, 8], category: 'Exotic' },
  'Enigmatic': { intervals: [0, 1, 4, 6, 8, 10, 11], category: 'Exotic' },

  // Jazz
  'Lydian Dominant': { intervals: [0, 2, 4, 6, 7, 9, 10], category: 'Jazz' },
  'Super Locrian (Altered)': { intervals: [0, 1, 3, 4, 6, 8, 10], category: 'Jazz' },
  'Bebop Major': { intervals: [0, 2, 4, 5, 7, 8, 9, 11], category: 'Jazz' },
  'Bebop Dominant': { intervals: [0, 2, 4, 5, 7, 9, 10, 11], category: 'Jazz' },
  'Bebop Minor': { intervals: [0, 2, 3, 4, 5, 7, 9, 10], category: 'Jazz' },
};

export const SCALE_NAMES = Object.keys(SCALES);

export const SCALE_CATEGORIES = [...new Set(Object.values(SCALES).map(s => s.category))];
