import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChordsInKey from './ChordsInKey';
import { useFretboardStore, DEFAULT_FRETBOARD_STATE } from '@/stores/fretboardStore';

beforeEach(() => {
  useFretboardStore.setState({ ...DEFAULT_FRETBOARD_STATE });
});

describe('ChordsInKey', () => {
  it('shows the degrade note for the default (non-heptatonic) Pentatonic Minor scale', () => {
    render(<ChordsInKey />);
    expect(screen.getByText(/needs a 7-note scale/i)).toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('renders the 7 diatonic degrees for a heptatonic scale', () => {
    useFretboardStore.setState({ rootNote: 'C', scaleName: 'Major (Ionian)' });
    render(<ChordsInKey />);
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(7);
    expect(screen.getByText('C')).toBeInTheDocument(); // I
    expect(screen.getByText('Dm')).toBeInTheDocument(); // ii
    expect(screen.getByText('Bdim')).toBeInTheDocument(); // vii°
  });

  it('clicking a degree sets chordName AND roots the highlight at that degree', async () => {
    const user = userEvent.setup();
    useFretboardStore.setState({ rootNote: 'C', scaleName: 'Major (Ionian)' });
    render(<ChordsInKey />);
    await user.click(screen.getByText('Dm')); // ii = D minor
    expect(useFretboardStore.getState().chordName).toBe('Minor');
    expect(useFretboardStore.getState().chordRoot).toBe('D');
  });

  it('re-clicking the active degree clears the highlight', async () => {
    const user = userEvent.setup();
    useFretboardStore.setState({
      rootNote: 'C',
      scaleName: 'Major (Ionian)',
      chordName: 'Minor',
      chordRoot: 'D',
    });
    render(<ChordsInKey />);
    const activeOption = screen.getByText('Dm').closest('[role="option"]');
    expect(activeOption).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByText('Dm'));
    expect(useFretboardStore.getState().chordName).toBeNull();
    expect(useFretboardStore.getState().chordRoot).toBeNull();
  });

  it('the 7ths toggle switches to seventh chords', async () => {
    const user = userEvent.setup();
    useFretboardStore.setState({ rootNote: 'C', scaleName: 'Major (Ionian)' });
    render(<ChordsInKey />);
    expect(screen.getByText('C')).toBeInTheDocument(); // triad before toggle
    await user.click(screen.getByLabelText('7ths'));
    expect(screen.getByText('Cmaj7')).toBeInTheDocument();
    expect(screen.getByText('Bm7♭5')).toBeInTheDocument(); // half-diminished vii
  });

  it('toggling 7ths clears a stale highlight (chord type would no longer match)', async () => {
    const user = userEvent.setup();
    useFretboardStore.setState({
      rootNote: 'C',
      scaleName: 'Major (Ionian)',
      chordName: 'Minor',
      chordRoot: 'D',
    });
    render(<ChordsInKey />);
    await user.click(screen.getByLabelText('7ths'));
    // Highlight is cleared so the ii degree (now Dm7) doesn't orphan.
    expect(useFretboardStore.getState().chordName).toBeNull();
    expect(useFretboardStore.getState().chordRoot).toBeNull();
    const selected = screen
      .getAllByRole('option')
      .filter((el) => el.getAttribute('aria-selected') === 'true');
    expect(selected).toHaveLength(0);
  });

  it('marks only the matching degree active (root + type), robust to key changes', () => {
    // D minor rooted, but scale is C major → ii degree is the active one.
    useFretboardStore.setState({
      rootNote: 'C',
      scaleName: 'Major (Ionian)',
      chordName: 'Minor',
      chordRoot: 'D',
    });
    render(<ChordsInKey />);
    const selected = screen
      .getAllByRole('option')
      .filter((el) => el.getAttribute('aria-selected') === 'true');
    expect(selected).toHaveLength(1);
    expect(selected[0]).toHaveTextContent('Dm');
  });
});
