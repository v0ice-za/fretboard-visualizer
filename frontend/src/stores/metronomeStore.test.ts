import {
  useMetronomeStore,
  DEFAULT_METRONOME_STATE,
  MIN_BPM,
  MAX_BPM,
  MIN_BEATS_PER_MEASURE,
  MAX_BEATS_PER_MEASURE,
} from './metronomeStore';

beforeEach(() => {
  useMetronomeStore.setState({ ...DEFAULT_METRONOME_STATE });
});

describe('metronomeStore', () => {
  it('starts with the default bpm, beats-per-measure, and stopped', () => {
    const s = useMetronomeStore.getState();
    expect(s.bpm).toBe(100);
    expect(s.beatsPerMeasure).toBe(4);
    expect(s.isPlaying).toBe(false);
  });

  it('setBpm clamps to [MIN_BPM, MAX_BPM] and rounds', () => {
    useMetronomeStore.getState().setBpm(-10);
    expect(useMetronomeStore.getState().bpm).toBe(MIN_BPM);
    useMetronomeStore.getState().setBpm(9999);
    expect(useMetronomeStore.getState().bpm).toBe(MAX_BPM);
    useMetronomeStore.getState().setBpm(120.6);
    expect(useMetronomeStore.getState().bpm).toBe(121);
  });

  it('setBeatsPerMeasure clamps to [MIN_BEATS_PER_MEASURE, MAX_BEATS_PER_MEASURE]', () => {
    useMetronomeStore.getState().setBeatsPerMeasure(0);
    expect(useMetronomeStore.getState().beatsPerMeasure).toBe(MIN_BEATS_PER_MEASURE);
    useMetronomeStore.getState().setBeatsPerMeasure(99);
    expect(useMetronomeStore.getState().beatsPerMeasure).toBe(MAX_BEATS_PER_MEASURE);
  });

  it('togglePlaying flips isPlaying and resets currentBeat', () => {
    useMetronomeStore.setState({ currentBeat: 2 });
    useMetronomeStore.getState().togglePlaying();
    expect(useMetronomeStore.getState().isPlaying).toBe(true);
    expect(useMetronomeStore.getState().currentBeat).toBe(0);
    useMetronomeStore.getState().togglePlaying();
    expect(useMetronomeStore.getState().isPlaying).toBe(false);
  });

  it('setPlaying(false) also resets currentBeat', () => {
    useMetronomeStore.setState({ currentBeat: 3, isPlaying: true });
    useMetronomeStore.getState().setPlaying(false);
    expect(useMetronomeStore.getState().currentBeat).toBe(0);
  });
});
