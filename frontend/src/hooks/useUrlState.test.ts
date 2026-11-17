import { renderHook, act } from '@testing-library/react';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import { createElement } from 'react';
import { useUrlState } from './useUrlState';
import { useFretboardStore, DEFAULT_FRETBOARD_STATE } from '@/stores/fretboardStore';
import { useAuthStore, DEFAULT_AUTH } from '@/stores/authStore';
import { useSubscriptionStore, DEFAULT_SUBSCRIPTION } from '@/stores/subscriptionStore';
import { MODES } from '@/utils/fretboardUtils';

function wrapper(initialEntries: string[] = ['/']) {
  return ({ children }: { children: React.ReactNode }) =>
    createElement(MemoryRouter, { initialEntries }, children);
}

function setEntitled(entitled: boolean) {
  useAuthStore.setState(
    entitled ? { accessToken: 't', user: { id: 1, email: 'a', name: null } } : { ...DEFAULT_AUTH }
  );
  useSubscriptionStore.setState({ isPremium: entitled });
}

beforeEach(() => {
  useFretboardStore.setState({ ...DEFAULT_FRETBOARD_STATE, freeformMarks: [] });
  useAuthStore.setState({ ...DEFAULT_AUTH });
  useSubscriptionStore.setState({ ...DEFAULT_SUBSCRIPTION });
});

describe('useUrlState — mount hydration', () => {
  it('hydrates tuning from a valid ?tuning= param', () => {
    renderHook(() => useUrlState(), {
      wrapper: wrapper(['/?tuning=Drop+D&key=A&scale=Pentatonic+Minor']),
    });
    expect(useFretboardStore.getState().tuning).toBe('Drop D');
  });

  it('hydrates rootNote from a valid ?key= param', () => {
    renderHook(() => useUrlState(), {
      wrapper: wrapper(['/?tuning=Standard+E&key=C%23&scale=Pentatonic+Minor']),
    });
    expect(useFretboardStore.getState().rootNote).toBe('C#');
  });

  it('hydrates scaleName from a valid ?scale= param', () => {
    renderHook(() => useUrlState(), {
      wrapper: wrapper(['/?tuning=Standard+E&key=A&scale=Major+%28Ionian%29']),
    });
    expect(useFretboardStore.getState().scaleName).toBe('Major (Ionian)');
  });

  it('ignores an unrecognised tuning and keeps the store default', () => {
    renderHook(() => useUrlState(), {
      wrapper: wrapper(['/?tuning=NotATuning&key=A&scale=Pentatonic+Minor']),
    });
    expect(useFretboardStore.getState().tuning).toBe('Standard E');
  });

  it('ignores an invalid root note and keeps the store default', () => {
    renderHook(() => useUrlState(), {
      wrapper: wrapper(['/?tuning=Standard+E&key=ZZ&scale=Pentatonic+Minor']),
    });
    expect(useFretboardStore.getState().rootNote).toBe('A');
  });

  it('ignores an unrecognised scale and keeps the store default', () => {
    renderHook(() => useUrlState(), {
      wrapper: wrapper(['/?tuning=Standard+E&key=A&scale=MadeUpScale']),
    });
    expect(useFretboardStore.getState().scaleName).toBe('Pentatonic Minor');
  });

  it('works with no query params — store keeps defaults', () => {
    renderHook(() => useUrlState(), { wrapper: wrapper(['/']) });
    const state = useFretboardStore.getState();
    expect(state.tuning).toBe('Standard E');
    expect(state.rootNote).toBe('A');
    expect(state.scaleName).toBe('Pentatonic Minor');
  });
});

describe('useUrlState — URL push on store change', () => {
  it('updates URL params when store state changes after mount', () => {
    const { result } = renderHook(
      () => { useUrlState(); return useSearchParams(); },
      { wrapper: wrapper(['/']) }
    );

    act(() => {
      useFretboardStore.getState().setTuning('Open G');
      useFretboardStore.getState().setRootNote('D');
      useFretboardStore.getState().setScaleName('Major (Ionian)');
    });

    expect(result.current[0].get('tuning')).toBe('Open G');
    expect(result.current[0].get('key')).toBe('D');
    expect(result.current[0].get('scale')).toBe('Major (Ionian)');
  });
});

describe('useUrlState — capo URL hydration', () => {
  it('hydrates capoPosition from a valid ?capo=3 param', () => {
    renderHook(() => useUrlState(), {
      wrapper: wrapper(['/?tuning=Standard+E&key=A&scale=Pentatonic+Minor&capo=3']),
    });
    expect(useFretboardStore.getState().capoPosition).toBe(3);
  });

  it('ignores ?capo=0 — capoPosition stays at default 0', () => {
    renderHook(() => useUrlState(), {
      wrapper: wrapper(['/?tuning=Standard+E&key=A&scale=Pentatonic+Minor&capo=0']),
    });
    expect(useFretboardStore.getState().capoPosition).toBe(0);
  });

  it('ignores ?capo=13 — above max, capoPosition stays at default 0', () => {
    renderHook(() => useUrlState(), {
      wrapper: wrapper(['/?tuning=Standard+E&key=A&scale=Pentatonic+Minor&capo=13']),
    });
    expect(useFretboardStore.getState().capoPosition).toBe(0);
  });

  it('accepts ?capo=12 — boundary max', () => {
    renderHook(() => useUrlState(), {
      wrapper: wrapper(['/?tuning=Standard+E&key=A&scale=Pentatonic+Minor&capo=12']),
    });
    expect(useFretboardStore.getState().capoPosition).toBe(12);
  });
});

describe('useUrlState — capo URL push', () => {
  it('includes ?capo=N in URL when capoPosition > 0', () => {
    const { result } = renderHook(
      () => { useUrlState(); return useSearchParams(); },
      { wrapper: wrapper(['/']) }
    );

    act(() => {
      useFretboardStore.getState().setCapoPosition(5);
    });

    expect(result.current[0].get('capo')).toBe('5');
  });

  it('omits ?capo from URL when capoPosition is 0', () => {
    const { result } = renderHook(
      () => { useUrlState(); return useSearchParams(); },
      { wrapper: wrapper(['/']) }
    );

    act(() => {
      useFretboardStore.getState().setCapoPosition(0);
    });

    expect(result.current[0].get('capo')).toBeNull();
  });
});

describe('useUrlState — notes URL hydration', () => {
  it('hydrates noteNamesVisible=true from ?notes=1', () => {
    renderHook(() => useUrlState(), {
      wrapper: wrapper(['/?tuning=Standard+E&key=A&scale=Pentatonic+Minor&notes=1']),
    });
    expect(useFretboardStore.getState().noteNamesVisible).toBe(true);
  });

  it('noteNamesVisible stays false when ?notes param is absent', () => {
    renderHook(() => useUrlState(), {
      wrapper: wrapper(['/?tuning=Standard+E&key=A&scale=Pentatonic+Minor']),
    });
    expect(useFretboardStore.getState().noteNamesVisible).toBe(false);
  });
});

describe('useUrlState — marks URL hydration', () => {
  it('hydrates freeformMarks from ?marks=3-2,7-0', () => {
    renderHook(() => useUrlState(), {
      wrapper: wrapper(['/?tuning=Standard+E&key=A&scale=Pentatonic+Minor&marks=3-2,7-0']),
    });
    const marks = useFretboardStore.getState().freeformMarks;
    expect(marks).toHaveLength(2);
    expect(marks).toContainEqual({ fret: 3, string: 2 });
    expect(marks).toContainEqual({ fret: 7, string: 0 });
  });

  it('ignores ?marks=25-0 — invalid fret, freeformMarks stays empty', () => {
    renderHook(() => useUrlState(), {
      wrapper: wrapper(['/?tuning=Standard+E&key=A&scale=Pentatonic+Minor&marks=25-0']),
    });
    expect(useFretboardStore.getState().freeformMarks).toHaveLength(0);
  });

  it('ignores ?marks=0-6 — invalid string, freeformMarks stays empty', () => {
    renderHook(() => useUrlState(), {
      wrapper: wrapper(['/?tuning=Standard+E&key=A&scale=Pentatonic+Minor&marks=0-6']),
    });
    expect(useFretboardStore.getState().freeformMarks).toHaveLength(0);
  });
});

describe('useUrlState — notes URL push', () => {
  it('pushes ?notes=1 when noteNamesVisible=true', () => {
    const { result } = renderHook(
      () => { useUrlState(); return useSearchParams(); },
      { wrapper: wrapper(['/']) }
    );

    act(() => {
      useFretboardStore.getState().setNoteNamesVisible(true);
    });

    expect(result.current[0].get('notes')).toBe('1');
  });

  it('omits ?notes from URL when noteNamesVisible=false', () => {
    const { result } = renderHook(
      () => { useUrlState(); return useSearchParams(); },
      { wrapper: wrapper(['/']) }
    );

    act(() => {
      useFretboardStore.getState().setNoteNamesVisible(false);
    });

    expect(result.current[0].get('notes')).toBeNull();
  });
});

describe('useUrlState — marks URL push', () => {
  it('pushes ?marks=fret-string when a freeform mark is added', () => {
    const { result } = renderHook(
      () => { useUrlState(); return useSearchParams(); },
      { wrapper: wrapper(['/']) }
    );

    act(() => {
      useFretboardStore.getState().toggleFreeformMark({ fret: 5, string: 3 });
    });

    expect(result.current[0].get('marks')).toBe('5-3');
  });

  it('omits ?marks from URL when freeformMarks is empty', () => {
    const { result } = renderHook(
      () => { useUrlState(); return useSearchParams(); },
      { wrapper: wrapper(['/']) }
    );

    act(() => {
      // Ensure no marks
      useFretboardStore.setState({ freeformMarks: [] });
      useFretboardStore.getState().setTuning('Standard E'); // trigger push effect
    });

    expect(result.current[0].get('marks')).toBeNull();
  });
});

// ─── Story 7.3: URL-state hardening ──────────────────────────────────────────

function hydrate(search: string) {
  return renderHook(() => { useUrlState(); return useSearchParams(); }, { wrapper: wrapper([`/${search}`]) });
}

/** Push current store state to a URL, reset the store, re-hydrate from that URL. */
function roundTrip(mutate: () => void) {
  const { result, unmount } = hydrate('');
  act(mutate);
  const search = `?${result.current[0].toString()}`;
  unmount();
  useFretboardStore.setState({ ...DEFAULT_FRETBOARD_STATE, freeformMarks: [] });
  hydrate(search);
  return search;
}

describe('useUrlState — ?mode= (7.3 AC1)', () => {
  it.each([
    ['0', 0],
    ['3', 3],
    [String(MODES.length - 1), MODES.length - 1],
  ])('hydrates valid ?mode=%s', (raw, expected) => {
    hydrate(`?mode=${raw}`);
    expect(useFretboardStore.getState().modeIndex).toBe(expected);
  });

  it.each(['-1', String(MODES.length), '99', 'abc', '2x', '1.5', ''])('ignores invalid ?mode=%s', (raw) => {
    hydrate(`?mode=${raw}`);
    expect(useFretboardStore.getState().modeIndex).toBeNull();
  });

  it('pushes ?mode= when a mode is active and omits it otherwise', () => {
    const { result } = hydrate('');
    expect(result.current[0].get('mode')).toBeNull();
    act(() => useFretboardStore.getState().setModeIndex(4));
    expect(result.current[0].get('mode')).toBe('4');
    act(() => useFretboardStore.getState().setModeIndex(null));
    expect(result.current[0].get('mode')).toBeNull();
  });

  it('round-trips modeIndex', () => {
    roundTrip(() => useFretboardStore.getState().setModeIndex(2));
    expect(useFretboardStore.getState().modeIndex).toBe(2);
  });
});

describe('useUrlState — ?chord=&croot= (7.3 AC2)', () => {
  it('hydrates a valid free chord + root, with chordRoot NOT reset by setChordName', () => {
    hydrate('?chord=Minor&croot=D');
    const s = useFretboardStore.getState();
    expect(s.chordName).toBe('Minor');
    expect(s.chordRoot).toBe('D');
  });

  it.each([
    ['unknown chord type', '?chord=Weird&croot=C'],
    ['malformed croot', '?chord=Major&croot=H'],
    ['lowercase croot', '?chord=Major&croot=c'],
    ['chord without croot', '?chord=Major'],
    ['croot without chord', '?croot=C'],
  ])('hydrates neither for %s', (_label, search) => {
    hydrate(search);
    const s = useFretboardStore.getState();
    expect(s.chordName).toBeNull();
    expect(s.chordRoot).toBeNull();
  });

  it('pushes chord + croot (falling back to rootNote) and omits both when no chord', () => {
    const { result } = hydrate('');
    expect(result.current[0].get('chord')).toBeNull();
    act(() => useFretboardStore.getState().setChordName('Major'));
    expect(result.current[0].get('chord')).toBe('Major');
    expect(result.current[0].get('croot')).toBe('A'); // chordRoot null → rootNote
    act(() => useFretboardStore.getState().setChordRoot('F#'));
    expect(result.current[0].get('croot')).toBe('F#');
    act(() => useFretboardStore.getState().setChordName(null));
    expect(result.current[0].get('chord')).toBeNull();
    expect(result.current[0].get('croot')).toBeNull();
  });

  it('round-trips chord + root', () => {
    roundTrip(() => {
      useFretboardStore.getState().setChordName('Dominant 7');
      useFretboardStore.getState().setChordRoot('G');
    });
    const s = useFretboardStore.getState();
    expect(s.chordName).toBe('Dominant 7');
    expect(s.chordRoot).toBe('G');
  });
});

describe('useUrlState — entitlement guard (7.3 AC3/AC4)', () => {
  const PREMIUM_TUNING = 'Open A';
  const LOCKED_CHORD = 'Augmented'; // index 8 ≥ FREE_TIER_CHORD_COUNT

  function recordTunings() {
    const seen: string[] = [];
    const unsub = useFretboardStore.subscribe((s) => seen.push(s.tuning));
    return { seen, unsub };
  }

  it('free tuning in the URL hydrates immediately for an anonymous viewer', () => {
    hydrate('?tuning=Drop+D');
    expect(useFretboardStore.getState().tuning).toBe('Drop D');
  });

  it('anonymous/free viewer: premium tuning never renders, stays on Standard E', async () => {
    const { seen, unsub } = recordTunings();
    hydrate(`?tuning=${encodeURIComponent(PREMIUM_TUNING)}`);
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    // logged in but the subscription resolves non-premium
    act(() => useAuthStore.setState({ accessToken: 't', user: { id: 1, email: 'a', name: null } }));
    unsub();
    expect(useFretboardStore.getState().tuning).toBe('Standard E');
    expect(seen).not.toContain(PREMIUM_TUNING);
  });

  it('premium viewer on slow load: premium tuning applied once entitlement resolves, never before', () => {
    const { seen, unsub } = recordTunings();
    const { result } = hydrate(`?tuning=${encodeURIComponent(PREMIUM_TUNING)}`);
    expect(useFretboardStore.getState().tuning).toBe('Standard E');
    // auth bootstrap resolves first, subscription query a moment later
    act(() => useAuthStore.setState({ accessToken: 't', user: { id: 1, email: 'a', name: null } }));
    expect(useFretboardStore.getState().tuning).toBe('Standard E');
    act(() => useSubscriptionStore.setState({ isPremium: true }));
    unsub();
    expect(useFretboardStore.getState().tuning).toBe(PREMIUM_TUNING);
    expect(result.current[0].get('tuning')).toBe(PREMIUM_TUNING);
    expect(seen.filter((t) => t === PREMIUM_TUNING)).toHaveLength(1);
  });

  it('already-premium viewer at mount gets the premium tuning', () => {
    setEntitled(true);
    hydrate(`?tuning=${encodeURIComponent(PREMIUM_TUNING)}`);
    expect(useFretboardStore.getState().tuning).toBe(PREMIUM_TUNING);
  });

  it('does not override a tuning the user changed before entitlement resolved', () => {
    hydrate(`?tuning=${encodeURIComponent(PREMIUM_TUNING)}`);
    act(() => useFretboardStore.getState().setTuning('DADGAD'));
    act(() => setEntitled(true));
    expect(useFretboardStore.getState().tuning).toBe('DADGAD');
  });

  it('free viewer: locked chord in the URL never renders', () => {
    const seen: (string | null)[] = [];
    const unsub = useFretboardStore.subscribe((s) => seen.push(s.chordName));
    hydrate(`?chord=${LOCKED_CHORD}&croot=C`);
    act(() => useAuthStore.setState({ accessToken: 't', user: { id: 1, email: 'a', name: null } }));
    unsub();
    expect(useFretboardStore.getState().chordName).toBeNull();
    expect(seen).not.toContain(LOCKED_CHORD);
  });

  it('premium viewer on slow load: locked chord + root applied once entitlement resolves', () => {
    hydrate(`?chord=${LOCKED_CHORD}&croot=C%23`);
    expect(useFretboardStore.getState().chordName).toBeNull();
    act(() => setEntitled(true));
    const s = useFretboardStore.getState();
    expect(s.chordName).toBe(LOCKED_CHORD);
    expect(s.chordRoot).toBe('C#');
  });

  it('does not override a chord the user picked before entitlement resolved', () => {
    hydrate(`?chord=${LOCKED_CHORD}&croot=C`);
    act(() => useFretboardStore.getState().setChordName('Minor'));
    act(() => setEntitled(true));
    expect(useFretboardStore.getState().chordName).toBe('Minor');
  });

  it('applies the gated values only once (no re-apply after a later entitlement flip)', () => {
    hydrate(`?tuning=${encodeURIComponent(PREMIUM_TUNING)}`);
    act(() => setEntitled(true));
    act(() => useFretboardStore.getState().setTuning('Standard E'));
    act(() => setEntitled(false));
    act(() => setEntitled(true));
    expect(useFretboardStore.getState().tuning).toBe('Standard E');
  });

  it('a custom-tuning name in ?tuning= always falls back to Standard E, even for premium (AC4)', () => {
    setEntitled(true);
    hydrate('?tuning=My+Custom+Tuning');
    expect(useFretboardStore.getState().tuning).toBe('Standard E');
  });
});

describe('useUrlState — strict capo parsing (7.3 AC5)', () => {
  it.each(['3abc', '3.5', ' 3', '+3', '0x3', '03a'])('ignores ?capo=%s', (raw) => {
    hydrate(`?capo=${encodeURIComponent(raw)}`);
    expect(useFretboardStore.getState().capoPosition).toBe(0);
  });

  it('round-trips capoPosition', () => {
    roundTrip(() => useFretboardStore.getState().setCapoPosition(7));
    expect(useFretboardStore.getState().capoPosition).toBe(7);
  });
});

describe('useUrlState — marks de-duplication (7.3 AC6)', () => {
  it('?marks=3-2,3-2,7-0 yields exactly 2 marks', () => {
    hydrate('?marks=3-2,3-2,7-0');
    expect(useFretboardStore.getState().freeformMarks).toEqual([
      { fret: 3, string: 2 },
      { fret: 7, string: 0 },
    ]);
  });

  it('round-trips freeformMarks', () => {
    roundTrip(() => {
      useFretboardStore.getState().toggleFreeformMark({ fret: 5, string: 1 });
      useFretboardStore.getState().toggleFreeformMark({ fret: 12, string: 4 });
    });
    expect(useFretboardStore.getState().freeformMarks).toEqual([
      { fret: 5, string: 1 },
      { fret: 12, string: 4 },
    ]);
  });
});
