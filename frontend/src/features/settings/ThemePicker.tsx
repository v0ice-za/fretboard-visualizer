import { Check, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { useThemeStore, FREE_THEMES, PREMIUM_THEMES, isPremiumTheme } from '@/stores/themeStore';
import type { Theme } from '@/stores/themeStore';

const THEME_LABELS: Record<Theme, string> = {
  dark: 'Dark',
  light: 'Light',
  neon: 'Neon',
  mono: 'Mono',
  vibrant: 'Vibrant',
  minimal: 'Minimal',
};

// Free first, then premium — matches the free-items-then-premium-items convention
// already established in the tuning/library dropdowns.
const THEME_ORDER: Theme[] = [...FREE_THEMES, ...PREMIUM_THEMES];

interface ThemePickerProps {
  /** Reuses the LibraryPanel/LibraryItem paywall-trigger convention: the caller
   * owns a lifted `paywallAnchor` state and renders a single shared `PaywallCard`. */
  onPaywallTrigger?: (anchorEl: HTMLElement) => void;
}

export default function ThemePicker({ onPaywallTrigger }: ThemePickerProps) {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const isPremium = useSubscriptionStore((s) => s.isPremium);

  const handleClick = (t: Theme, e: React.MouseEvent<HTMLButtonElement>) => {
    if (isPremiumTheme(t) && !isPremium) {
      onPaywallTrigger?.(e.currentTarget);
      return;
    }
    setTheme(t);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-muted-foreground">Theme</span>
      <div role="listbox" aria-label="Theme" className="flex flex-col gap-1">
        {THEME_ORDER.map((t) => {
          const locked = isPremiumTheme(t) && !isPremium;
          const active = theme === t;
          return (
            <button
              key={t}
              type="button"
              role="option"
              aria-selected={active}
              aria-disabled={locked}
              onClick={(e) => handleClick(t, e)}
              className={`flex w-full select-none items-center justify-between rounded-lg border px-3.5 py-2.5 text-sm transition-[transform,box-shadow,background-color,color] duration-150 ease-out ${
                locked
                  ? 'cursor-not-allowed border-[var(--glass-border)] text-muted-foreground opacity-50'
                  : active
                  ? 'border-transparent bg-primary/15 text-primary [box-shadow:var(--glow-primary)]'
                  : 'border-transparent text-foreground hover:-translate-y-px hover:bg-[var(--glass-border)] hover:[box-shadow:var(--shadow-sm)]'
              }`}
            >
              <span>{THEME_LABELS[t]}</span>
              <span className="flex items-center gap-1">
                {active && <Check size={14} />}
                {locked && (
                  <Badge variant="outline" className="gap-1 py-0 px-1 text-xs">
                    <Lock size={10} />
                  </Badge>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
