import {
  useProgressionStore,
  DEFAULT_PROGRESSION_STATE,
  MAX_PROGRESSION_CHORDS,
} from '@/stores/progressionStore';

const store = () => useProgressionStore.getState();
const ids = () => store().chords.map((c) => c.id);
const labels = () => store().chords.map((c) => `${c.rootNote} ${c.chordName}`);

beforeEach(() => {
  useProgressionStore.setState({ chords: [], activeIndex: null });
});

describe('useProgressionStore', () => {
  it('starts empty with no active index', () => {
    expect(store().chords).toHaveLength(0);
    expect(store().activeIndex).toBeNull();
    expect(DEFAULT_PROGRESSION_STATE.activeIndex).toBeNull();
  });

  describe('addChord', () => {
    it('appends chords in order with unique ids', () => {
      store().addChord('C', 'Major');
      store().addChord('A', 'Minor');
      expect(labels()).toEqual(['C Major', 'A Minor']);
      expect(new Set(ids()).size).toBe(2);
    });

    it('does not exceed MAX_PROGRESSION_CHORDS', () => {
      for (let i = 0; i < MAX_PROGRESSION_CHORDS + 5; i++) store().addChord('C', 'Major');
      expect(store().chords).toHaveLength(MAX_PROGRESSION_CHORDS);
    });
  });

  describe('removeChord', () => {
    it('removes by id and updates the list', () => {
      store().addChord('C', 'Major');
      store().addChord('A', 'Minor');
      const [firstId] = ids();
      store().removeChord(firstId);
      expect(labels()).toEqual(['A Minor']);
    });

    it('ignores an unknown id', () => {
      store().addChord('C', 'Major');
      store().removeChord('nope');
      expect(store().chords).toHaveLength(1);
    });

    it('decrements activeIndex when removing a chord before it', () => {
      store().addChord('C', 'Major');
      store().addChord('A', 'Minor');
      store().addChord('F', 'Major');
      store().setActiveIndex(2); // F Major active
      store().removeChord(ids()[0]); // remove C Major
      expect(store().activeIndex).toBe(1);
      expect(labels()[store().activeIndex!]).toBe('F Major');
    });

    it('clamps activeIndex when removing the active (last) chord', () => {
      store().addChord('C', 'Major');
      store().addChord('A', 'Minor');
      store().setActiveIndex(1);
      store().removeChord(ids()[1]);
      expect(store().activeIndex).toBe(0);
    });

    it('leaves activeIndex unchanged when removing a chord after it', () => {
      store().addChord('C', 'Major');
      store().addChord('A', 'Minor');
      store().setActiveIndex(0);
      store().removeChord(ids()[1]);
      expect(store().activeIndex).toBe(0);
    });

    it('sets activeIndex to null when the list becomes empty', () => {
      store().addChord('C', 'Major');
      store().setActiveIndex(0);
      store().removeChord(ids()[0]);
      expect(store().activeIndex).toBeNull();
    });
  });

  describe('moveChord', () => {
    it('moves a chord up', () => {
      store().addChord('C', 'Major');
      store().addChord('A', 'Minor');
      store().moveChord(ids()[1], 'up');
      expect(labels()).toEqual(['A Minor', 'C Major']);
    });

    it('moves a chord down', () => {
      store().addChord('C', 'Major');
      store().addChord('A', 'Minor');
      store().moveChord(ids()[0], 'down');
      expect(labels()).toEqual(['A Minor', 'C Major']);
    });

    it('is a no-op at the top boundary', () => {
      store().addChord('C', 'Major');
      store().addChord('A', 'Minor');
      store().moveChord(ids()[0], 'up');
      expect(labels()).toEqual(['C Major', 'A Minor']);
    });

    it('is a no-op at the bottom boundary', () => {
      store().addChord('C', 'Major');
      store().addChord('A', 'Minor');
      store().moveChord(ids()[1], 'down');
      expect(labels()).toEqual(['C Major', 'A Minor']);
    });

    it('keeps activeIndex tracking the moved active chord', () => {
      store().addChord('C', 'Major');
      store().addChord('A', 'Minor');
      store().setActiveIndex(0); // C Major active
      store().moveChord(ids()[0], 'down'); // C Major moves to index 1
      expect(store().activeIndex).toBe(1);
      expect(labels()[store().activeIndex!]).toBe('C Major');
    });
  });

  describe('setActiveIndex', () => {
    it('sets a valid index', () => {
      store().addChord('C', 'Major');
      store().setActiveIndex(0);
      expect(store().activeIndex).toBe(0);
    });

    it('rejects an out-of-range index', () => {
      store().addChord('C', 'Major');
      store().setActiveIndex(5);
      expect(store().activeIndex).toBeNull();
    });

    it('accepts null', () => {
      store().addChord('C', 'Major');
      store().setActiveIndex(0);
      store().setActiveIndex(null);
      expect(store().activeIndex).toBeNull();
    });
  });

  describe('next / prev', () => {
    it('next starts at 0 when nothing is active', () => {
      store().addChord('C', 'Major');
      store().addChord('A', 'Minor');
      store().next();
      expect(store().activeIndex).toBe(0);
    });

    it('next advances and clamps at the last chord', () => {
      store().addChord('C', 'Major');
      store().addChord('A', 'Minor');
      store().setActiveIndex(0);
      store().next();
      expect(store().activeIndex).toBe(1);
      store().next();
      expect(store().activeIndex).toBe(1); // clamped
    });

    it('prev retreats and clamps at 0', () => {
      store().addChord('C', 'Major');
      store().addChord('A', 'Minor');
      store().setActiveIndex(1);
      store().prev();
      expect(store().activeIndex).toBe(0);
      store().prev();
      expect(store().activeIndex).toBe(0); // clamped
    });

    it('next/prev do nothing on an empty progression', () => {
      store().next();
      expect(store().activeIndex).toBeNull();
      store().prev();
      expect(store().activeIndex).toBeNull();
    });
  });

  describe('clear', () => {
    it('resets chords and activeIndex', () => {
      store().addChord('C', 'Major');
      store().setActiveIndex(0);
      store().clear();
      expect(store().chords).toHaveLength(0);
      expect(store().activeIndex).toBeNull();
    });
  });
});
