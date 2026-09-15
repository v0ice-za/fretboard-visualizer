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

  it('rejects fret -1 (below 0) — freeformMarks stays empty', () => {
    useFretboardStore.getState().toggleFreeformMark({ fret: -1, string: 0 });
    expect(useFretboardStore.getState().freeformMarks).toHaveLength(0);
  });

  it('rejects fret 25 (above 24) — freeformMarks stays empty', () => {
    useFretboardStore.getState().toggleFreeformMark({ fret: 25, string: 0 });
    expect(useFretboardStore.getState().freeformMarks).toHaveLength(0);
  });

  it('rejects string -1 (below 0) — freeformMarks stays empty', () => {
    useFretboardStore.getState().toggleFreeformMark({ fret: 0, string: -1 });
    expect(useFretboardStore.getState().freeformMarks).toHaveLength(0);
  });

  it('rejects string 6 (above 5) — freeformMarks stays empty', () => {
    useFretboardStore.getState().toggleFreeformMark({ fret: 0, string: 6 });
    expect(useFretboardStore.getState().freeformMarks).toHaveLength(0);
  });

  it('caps at 150 marks — 151st mark is rejected', () => {
    // Seed 150 marks directly (all {fret:1,string:1}) so {fret:2,string:2} is not in the list
    useFretboardStore.setState({
      freeformMarks: Array.from({ length: 150 }, () => ({ fret: 1, string: 1 })),
    });
    expect(useFretboardStore.getState().freeformMarks).toHaveLength(150);
    // {fret:2,string:2} is valid, not in the list → cap check fires → rejected
    useFretboardStore.getState().toggleFreeformMark({ fret: 2, string: 2 });
    expect(useFretboardStore.getState().freeformMarks).toHaveLength(150);
  });

  it('toggles off an existing mark even when at the 150-mark cap', () => {
    // Fill all 150 valid combinations (25 frets × 6 strings = 150 exactly)
    for (let fret = 0; fret <= 24; fret++) {
      for (let string = 0; string <= 5; string++) {
        useFretboardStore.getState().toggleFreeformMark({ fret, string });
      }
    }
    expect(useFretboardStore.getState().freeformMarks).toHaveLength(150);
    // Toggle off {fret:0,string:0} — exists=true so remove fires even at cap
    useFretboardStore.getState().toggleFreeformMark({ fret: 0, string: 0 });
    expect(useFretboardStore.getState().freeformMarks).toHaveLength(149);
  });
});

describe('chordRoot (diatonic chord root)', () => {
  it('defaults to null', () => {
    expect(useFretboardStore.getState().chordRoot).toBeNull();
  });

  it('setChordRoot updates chordRoot', () => {
    useFretboardStore.getState().setChordRoot('D');
    expect(useFretboardStore.getState().chordRoot).toBe('D');
  });

  it('setChordName(null) clears a previously-set chordRoot', () => {
    useFretboardStore.getState().setChordName('Minor');
    useFretboardStore.getState().setChordRoot('D');
    useFretboardStore.getState().setChordName(null);
    expect(useFretboardStore.getState().chordName).toBeNull();
    expect(useFretboardStore.getState().chordRoot).toBeNull();
  });

  it('setChordName(name) resets a stale chordRoot (cross-feature leak guard)', () => {
    // Simulate a diatonic chord left rooted at D, then picking a chord from the
    // standard Chord tab — it must not inherit the leftover D root.
    useFretboardStore.getState().setChordName('Minor');
    useFretboardStore.getState().setChordRoot('D');
    useFretboardStore.getState().setChordName('Major');
    expect(useFretboardStore.getState().chordName).toBe('Major');
    expect(useFretboardStore.getState().chordRoot).toBeNull();
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
