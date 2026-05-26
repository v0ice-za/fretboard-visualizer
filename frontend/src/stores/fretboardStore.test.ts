import { useFretboardStore, DEFAULT_FRETBOARD_STATE } from './fretboardStore';

beforeEach(() => {
  useFretboardStore.setState({ ...DEFAULT_FRETBOARD_STATE, freeformMarks: [], freeformModeActive: false });
});

describe('fretboardStore initial state', () => {
  it('has correct defaults', () => {
    const state = useFretboardStore.getState();
    expect(state.tuning).toBe('Standard E');
    expect(state.rootNote).toBe('A');
    expect(state.scaleName).toBe('Pentatonic Minor');
    expect(state.modeIndex).toBeNull();
    expect(state.capoPosition).toBe(0);
    expect(state.freeformMarks).toEqual([]);
    expect(state.noteNamesVisible).toBe(false);
  });
});

describe('setTuning', () => {
  it('updates tuning', () => {
    useFretboardStore.getState().setTuning('Drop D');
    expect(useFretboardStore.getState().tuning).toBe('Drop D');
  });
});

describe('setRootNote', () => {
  it('updates rootNote', () => {
    useFretboardStore.getState().setRootNote('C#');
    expect(useFretboardStore.getState().rootNote).toBe('C#');
  });
});

describe('setScaleName', () => {
  it('updates scaleName', () => {
    useFretboardStore.getState().setScaleName('Major (Ionian)');
    expect(useFretboardStore.getState().scaleName).toBe('Major (Ionian)');
  });
});

describe('setModeIndex', () => {
  it('sets a numeric mode index', () => {
    useFretboardStore.getState().setModeIndex(2);
    expect(useFretboardStore.getState().modeIndex).toBe(2);
  });

  it('resets mode index to null', () => {
    useFretboardStore.getState().setModeIndex(2);
    useFretboardStore.getState().setModeIndex(null);
    expect(useFretboardStore.getState().modeIndex).toBeNull();
  });
});

describe('setCapoPosition', () => {
  it('updates capoPosition', () => {
    useFretboardStore.getState().setCapoPosition(3);
    expect(useFretboardStore.getState().capoPosition).toBe(3);
  });

  it('stores 5 without clamping when in range', () => {
    useFretboardStore.getState().setCapoPosition(5);
    expect(useFretboardStore.getState().capoPosition).toBe(5);
  });

  it('clamps to 12 when value exceeds max', () => {
    useFretboardStore.getState().setCapoPosition(15);
    expect(useFretboardStore.getState().capoPosition).toBe(12);
  });

  it('clamps to 0 when value is negative', () => {
    useFretboardStore.getState().setCapoPosition(-1);
    expect(useFretboardStore.getState().capoPosition).toBe(0);
  });
});

describe('setNoteNamesVisible', () => {
  it('sets noteNamesVisible to true', () => {
    useFretboardStore.getState().setNoteNamesVisible(true);
    expect(useFretboardStore.getState().noteNamesVisible).toBe(true);
  });

  it('sets noteNamesVisible back to false', () => {
    useFretboardStore.getState().setNoteNamesVisible(true);
    useFretboardStore.getState().setNoteNamesVisible(false);
    expect(useFretboardStore.getState().noteNamesVisible).toBe(false);
  });
});

describe('toggleFreeformMark', () => {
  it('adds a mark when not present', () => {
    useFretboardStore.getState().toggleFreeformMark({ fret: 5, string: 2 });
    expect(useFretboardStore.getState().freeformMarks).toEqual([{ fret: 5, string: 2 }]);
  });

  it('removes a mark when already present', () => {
    useFretboardStore.getState().toggleFreeformMark({ fret: 5, string: 2 });
    useFretboardStore.getState().toggleFreeformMark({ fret: 5, string: 2 });
    expect(useFretboardStore.getState().freeformMarks).toEqual([]);
  });

  it('accumulates multiple distinct marks', () => {
    useFretboardStore.getState().toggleFreeformMark({ fret: 1, string: 0 });
    useFretboardStore.getState().toggleFreeformMark({ fret: 2, string: 3 });
    expect(useFretboardStore.getState().freeformMarks).toHaveLength(2);
  });

  it('removes only the matching mark, leaving others intact', () => {
    useFretboardStore.getState().toggleFreeformMark({ fret: 1, string: 0 });
    useFretboardStore.getState().toggleFreeformMark({ fret: 2, string: 3 });
    useFretboardStore.getState().toggleFreeformMark({ fret: 1, string: 0 });
    expect(useFretboardStore.getState().freeformMarks).toEqual([{ fret: 2, string: 3 }]);
  });
});

describe('setFreeformModeActive', () => {
  it('sets freeformModeActive to true', () => {
    useFretboardStore.getState().setFreeformModeActive(true);
    expect(useFretboardStore.getState().freeformModeActive).toBe(true);
  });

  it('resets freeformModeActive to false', () => {
    useFretboardStore.getState().setFreeformModeActive(true);
    useFretboardStore.getState().setFreeformModeActive(false);
    expect(useFretboardStore.getState().freeformModeActive).toBe(false);
  });
});

describe('state isolation', () => {
  it('resets between tests', () => {
    useFretboardStore.getState().setTuning('Open G');
    // beforeEach resets; this test verifies state starts fresh next time
    expect(useFretboardStore.getState().tuning).toBe('Open G');
  });

  it('does not inherit mutations from previous test', () => {
    expect(useFretboardStore.getState().tuning).toBe('Standard E');
  });
});
