import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ThemePicker from './ThemePicker';
import { useThemeStore } from '@/stores/themeStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';

beforeEach(() => {
  useThemeStore.setState({ theme: 'dark' });
  useSubscriptionStore.setState({ isPremium: false });
});

describe('ThemePicker', () => {
  it('renders all 6 themes, free first then premium', () => {
    render(<ThemePicker />);
    const options = screen.getAllByRole('option');
    expect(options.map((o) => o.textContent?.replace(/\s+/g, ' ').trim().split(' ')[0])).toEqual([
      'Dark', 'Light', 'Neon', 'Mono', 'Vibrant', 'Minimal',
    ]);
  });

  it('marks the active theme as selected with a check icon', () => {
    useThemeStore.setState({ theme: 'light' });
    render(<ThemePicker />);
    expect(screen.getByRole('option', { name: /Light/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('option', { name: /Dark/ })).toHaveAttribute('aria-selected', 'false');
  });

  describe('non-premium user', () => {
    it('shows a lock badge on the 4 premium rows', () => {
      render(<ThemePicker />);
      const premiumNames = ['Neon', 'Mono', 'Vibrant', 'Minimal'];
      premiumNames.forEach((name) => {
        const row = screen.getByRole('option', { name: new RegExp(name) });
        expect(row).toHaveAttribute('aria-disabled', 'true');
      });
    });

    it('does not lock the 2 free rows', () => {
      render(<ThemePicker />);
      expect(screen.getByRole('option', { name: /Dark/ })).toHaveAttribute('aria-disabled', 'false');
      expect(screen.getByRole('option', { name: /Light/ })).toHaveAttribute('aria-disabled', 'false');
    });

    it('clicking a free theme calls setTheme', async () => {
      const user = userEvent.setup();
      render(<ThemePicker />);
      await user.click(screen.getByRole('option', { name: /Light/ }));
      expect(useThemeStore.getState().theme).toBe('light');
    });

    it('clicking a locked premium theme triggers the paywall callback, not setTheme', async () => {
      const onPaywallTrigger = vi.fn();
      const user = userEvent.setup();
      render(<ThemePicker onPaywallTrigger={onPaywallTrigger} />);
      await user.click(screen.getByRole('option', { name: /Neon/ }));
      expect(onPaywallTrigger).toHaveBeenCalledTimes(1);
      expect(onPaywallTrigger).toHaveBeenCalledWith(expect.any(HTMLElement));
      expect(useThemeStore.getState().theme).toBe('dark'); // unchanged
    });

    it('clicking a locked premium theme without an onPaywallTrigger prop does not crash or change the theme', async () => {
      const user = userEvent.setup();
      // onPaywallTrigger is optional — the optional-chaining call site must no-op safely
      render(<ThemePicker />);
      await user.click(screen.getByRole('option', { name: /Neon/ }));
      expect(useThemeStore.getState().theme).toBe('dark'); // unchanged, no throw
    });
  });

  describe('premium user', () => {
    beforeEach(() => {
      useSubscriptionStore.setState({ isPremium: true });
    });

    it('no rows are locked', () => {
      render(<ThemePicker />);
      screen.getAllByRole('option').forEach((row) => {
        expect(row).toHaveAttribute('aria-disabled', 'false');
      });
    });

    it('clicking a premium theme calls setTheme, not the paywall callback', async () => {
      const onPaywallTrigger = vi.fn();
      const user = userEvent.setup();
      render(<ThemePicker onPaywallTrigger={onPaywallTrigger} />);
      await user.click(screen.getByRole('option', { name: /Vibrant/ }));
      expect(useThemeStore.getState().theme).toBe('vibrant');
      expect(onPaywallTrigger).not.toHaveBeenCalled();
    });
  });
});
