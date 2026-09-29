import { useTunerStore, DEFAULT_TUNER_STATE } from './tunerStore';

beforeEach(() => {
  useTunerStore.setState({ ...DEFAULT_TUNER_STATE });
});

describe('tunerStore', () => {
  it('starts stopped, with no detected note or error', () => {
    const s = useTunerStore.getState();
    expect(s.isListening).toBe(false);
    expect(s.detectedNote).toBeNull();
    expect(s.error).toBeNull();
  });

  it('setListening(true) clears a stale error', () => {
    useTunerStore.setState({ error: 'permission-denied' });
    useTunerStore.getState().setListening(true);
    expect(useTunerStore.getState().isListening).toBe(true);
    expect(useTunerStore.getState().error).toBeNull();
  });

  it('setListening(false) preserves an error that was just set — does not wipe it', () => {
    // Reproduces the exact sequence useTuner's hook performs on a failed mic
    // request: setError(code) then setListening(false).
    useTunerStore.getState().setError('permission-denied');
    useTunerStore.getState().setListening(false);
    expect(useTunerStore.getState().error).toBe('permission-denied');
    expect(useTunerStore.getState().isListening).toBe(false);
  });

  it('setDetectedNote updates the detected note', () => {
    const note = { note: 'A', octave: 4, cents: 0, frequency: 440 };
    useTunerStore.getState().setDetectedNote(note);
    expect(useTunerStore.getState().detectedNote).toEqual(note);
  });
});
