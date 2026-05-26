import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ModeChipsRow from './ModeChipsRow';
import { useFretboardStore } from '@/stores/fretboardStore';
import { MODES } from '@/utils/fretboardUtils';

beforeEach(() => {
  useFretboardStore.setState({ modeIndex: null });
});

describe('ModeChipsRow', () => {
  it('renders 7 mode chips with correct labels', () => {
    render(<ModeChipsRow />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(MODES.length);
    MODES.forEach((mode, i) => {
      expect(buttons[i]).toHaveTextContent(mode.name);
    });
  });

  it('all chips start inactive (aria-pressed=false) when modeIndex is null', () => {
    render(<ModeChipsRow />);
    screen.getAllByRole('button').forEach(btn => {
      expect(btn).toHaveAttribute('aria-pressed', 'false');
    });
  });

  it('clicking a chip activates it (sets aria-pressed=true)', async () => {
    const user = userEvent.setup();
    render(<ModeChipsRow />);
    const ionianBtn = screen.getByRole('button', { name: 'Ionian' });
    await user.click(ionianBtn);
    expect(ionianBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('clicking an already-active chip deactivates it (sets aria-pressed=false)', async () => {
    const user = userEvent.setup();
    useFretboardStore.setState({ modeIndex: 0 });
    render(<ModeChipsRow />);
    const ionianBtn = screen.getByRole('button', { name: 'Ionian' });
    expect(ionianBtn).toHaveAttribute('aria-pressed', 'true');
    await user.click(ionianBtn);
    expect(ionianBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('ArrowRight moves focus to the next chip', () => {
    render(<ModeChipsRow />);
    const buttons = screen.getAllByRole('button');
    act(() => { buttons[0].focus(); });
    act(() => { fireEvent.keyDown(buttons[0], { key: 'ArrowRight' }); });
    expect(buttons[1]).toHaveFocus();
  });

  it('ArrowLeft wraps from the first chip to the last chip', () => {
    render(<ModeChipsRow />);
    const buttons = screen.getAllByRole('button');
    act(() => { buttons[0].focus(); });
    act(() => { fireEvent.keyDown(buttons[0], { key: 'ArrowLeft' }); });
    expect(buttons[MODES.length - 1]).toHaveFocus();
  });

  it('container has role=toolbar with aria-label "Mode overlay"', () => {
    render(<ModeChipsRow />);
    expect(screen.getByRole('toolbar')).toHaveAttribute('aria-label', 'Mode overlay');
  });
});
