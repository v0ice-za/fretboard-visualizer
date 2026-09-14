import { createRef } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IconButton } from './IconButton';

describe('IconButton', () => {
  it('defaults to type="button" so it never submits a surrounding form', () => {
    render(<IconButton aria-label="Example">•</IconButton>);
    expect(screen.getByRole('button', { name: 'Example' })).toHaveAttribute('type', 'button');
  });

  it('respects an explicit type override', () => {
    render(<IconButton aria-label="Submit" type="submit">•</IconButton>);
    expect(screen.getByRole('button', { name: 'Submit' })).toHaveAttribute('type', 'submit');
  });

  it('forwards the ref to the underlying <button> — required for the Tooltip render prop', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<IconButton ref={ref} aria-label="Example">•</IconButton>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current).toBe(screen.getByRole('button', { name: 'Example' }));
  });

  it('marks data-active and applies the active tint when active + tone="default"', () => {
    render(<IconButton aria-label="Example" active>•</IconButton>);
    const button = screen.getByRole('button', { name: 'Example' });
    expect(button).toHaveAttribute('data-active', 'true');
    expect(button.className).toMatch(/bg-primary\/15/);
  });

  it('does not carry the active tint when tone="destructive", even if active is true', () => {
    render(<IconButton aria-label="Example" active tone="destructive">•</IconButton>);
    const button = screen.getByRole('button', { name: 'Example' });
    expect(button.className).not.toMatch(/bg-primary\/15/);
  });

  it('omits data-active when inactive', () => {
    render(<IconButton aria-label="Example">•</IconButton>);
    expect(screen.getByRole('button', { name: 'Example' })).not.toHaveAttribute('data-active');
  });

  it('merges a caller-supplied className rather than replacing the built-in styles', () => {
    render(<IconButton aria-label="Example" className="my-custom-class">•</IconButton>);
    const button = screen.getByRole('button', { name: 'Example' });
    expect(button.className).toMatch(/my-custom-class/);
    expect(button.className).toMatch(/inline-flex/);
  });

  it('renders children and fires onClick', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<IconButton aria-label="Example" onClick={onClick}>Glyph</IconButton>);
    expect(screen.getByText('Glyph')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Example' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
