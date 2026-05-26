import { renderHook, act } from '@testing-library/react';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import { createElement } from 'react';
import { useUrlState } from './useUrlState';
import { useFretboardStore, DEFAULT_FRETBOARD_STATE } from '@/stores/fretboardStore';

function wrapper(initialEntries: string[] = ['/']) {
  return ({ children }: { children: React.ReactNode }) =>
    createElement(MemoryRouter, { initialEntries }, children);
}

beforeEach(() => {
  useFretboardStore.setState({ ...DEFAULT_FRETBOARD_STATE, freeformMarks: [] });
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
