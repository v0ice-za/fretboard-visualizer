import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChordRelationships from './ChordRelationships';
import { useFretboardStore, DEFAULT_FRETBOARD_STATE } from '@/stores/fretboardStore';

beforeEach(() => {
  useFretboardStore.setState({ ...DEFAULT_FRETBOARD_STATE });
});

describe('ChordRelationships', () => {
  it('prompts to pick a chord when none is active', () => {
    render(<ChordRelationships />);
    expect(screen.getByText(/Select a chord to see related chords/i)).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('lists jazzify suggestions and shared-note chords for an active chord', () => {
    // Active chord = C Major (chordRoot set explicitly).
    useFretboardStore.setState({ chordName: 'Major', chordRoot: 'C' });
    render(<ChordRelationships />);
    expect(screen.getByText('C Major')).toBeInTheDocument(); // active-chord header
    const jazzList = screen.getByRole('list', { name: 'Jazzify suggestions' });
    expect(screen.getByRole('list', { name: 'Chords that share notes' })).toBeInTheDocument();
    // Relative minor of C major is A Minor (scoped — it also appears as a shared-note chord).
    expect(within(jazzList).getByText('A Minor')).toBeInTheDocument();
    // An extension upgrade at the same root.
    expect(within(jazzList).getByText('C Major 7')).toBeInTheDocument();
  });

  it('falls back to rootNote when chordRoot is null (standard-tab chord)', () => {
    // Chord picked from the standard Chord tab leaves chordRoot null → uses rootNote.
    useFretboardStore.setState({ chordName: 'Major', chordRoot: null, rootNote: 'C' });
    render(<ChordRelationships />);
    expect(screen.getByText('C Major')).toBeInTheDocument();
  });

  it('clicking a suggestion sets chordName THEN roots it (correct order)', async () => {
    const user = userEvent.setup();
    useFretboardStore.setState({ chordName: 'Major', chordRoot: 'C' });
    render(<ChordRelationships />);
    const jazzList = screen.getByRole('list', { name: 'Jazzify suggestions' });
    await user.click(within(jazzList).getByText('A Minor')); // relative minor
    expect(useFretboardStore.getState().chordName).toBe('Minor');
    expect(useFretboardStore.getState().chordRoot).toBe('A');
  });

  it('tags an identical-pitch-set chord as "same notes"', () => {
    // C6 ≡ Am7 — A Minor 7 shares all four tones.
    useFretboardStore.setState({ chordName: 'Major 6', chordRoot: 'C' });
    render(<ChordRelationships />);
    const aliasBtn = screen.getByText('A Minor 7').closest('button')!;
    expect(aliasBtn).toHaveTextContent('same notes');
  });

  it('a diminished chord shows no substitutions but still lists shared notes', () => {
    useFretboardStore.setState({ chordName: 'Diminished 7', chordRoot: 'C' });
    render(<ChordRelationships />);
    expect(screen.getByText(/No substitutions or upgrades/i)).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Chords that share notes' })).toBeInTheDocument();
  });
});
