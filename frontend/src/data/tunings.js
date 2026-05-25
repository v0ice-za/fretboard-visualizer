// Each tuning: strings ordered low → high (index 0 = thickest/lowest)
export const TUNINGS = {
  'Standard E': ['E', 'A', 'D', 'G', 'B', 'E'],
  'Drop D': ['D', 'A', 'D', 'G', 'B', 'E'],
  'Open G': ['D', 'G', 'D', 'G', 'B', 'D'],
  'Open D': ['D', 'A', 'D', 'F#', 'A', 'D'],
  'Open E': ['E', 'B', 'E', 'G#', 'B', 'E'],
  'Open A': ['E', 'A', 'E', 'A', 'C#', 'E'],
  'DADGAD': ['D', 'A', 'D', 'G', 'A', 'D'],
  'Half Step Down': ['Eb', 'Ab', 'Db', 'Gb', 'Bb', 'Eb'],
  'Full Step Down': ['D', 'G', 'C', 'F', 'A', 'D'],
  'Drop C': ['C', 'G', 'C', 'F', 'A', 'D'],
  'Drop B': ['B', 'F#', 'B', 'E', 'G#', 'C#'],
  'Open C': ['C', 'G', 'C', 'G', 'C', 'E'],
  'Celtic': ['D', 'A', 'D', 'G', 'A', 'D'],
  'NST (New Standard)': ['C', 'G', 'D', 'A', 'E', 'G'],
};

export const TUNING_NAMES = Object.keys(TUNINGS);
