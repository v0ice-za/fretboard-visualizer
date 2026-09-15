import { create } from 'zustand'

export type Theme = 'dark' | 'light' | 'neon' | 'mono' | 'vibrant' | 'minimal'

/** dark/light are free; the other four are premium-gated (Story 4.5). */
export const FREE_THEMES: Theme[] = ['dark', 'light']
export const PREMIUM_THEMES: Theme[] = ['neon', 'mono', 'vibrant', 'minimal']

export function isPremiumTheme(theme: Theme): boolean {
  return (PREMIUM_THEMES as string[]).includes(theme)
}

const ALL_THEMES: Theme[] = [...FREE_THEMES, ...PREMIUM_THEMES]

/** Type guard for untrusted input (e.g. a hand-edited or stale localStorage value). */
export function isValidTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (ALL_THEMES as string[]).includes(value)
}

/**
 * Themes that get the shadcn `.dark` class in addition to their own `data-theme`
 * attribute. Tailwind's `dark:` variant (`@custom-variant dark (&:is(.dark *))` in
 * index.css) keys off this class, not `data-theme` — so every existing `dark:`-prefixed
 * utility across the app needs it on any theme with a dark background, not just the
 * literal `dark` theme. `light` and `minimal` are the light-background family and must
 * NOT get it.
 */
const DARK_FAMILY_THEMES: Theme[] = ['dark', 'neon', 'mono', 'vibrant']

const STORAGE_KEY = 'guitar-app-theme'

/**
 * localStorage access can throw, not just return null: Safari private mode, sandboxed
 * iframes, and browsers with site-data blocked all raise on read/write. Theme
 * persistence is best-effort — a throw must degrade to "no stored preference" /
 * "not persisted", never crash module load or a theme switch.
 */
function safeGetStoredTheme(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function safePersistTheme(theme: Theme) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // best-effort; the in-memory store still drives the current session
  }
}

/**
 * Project is dark-by-default; fall back to that when no valid preference is stored.
 * Intentionally narrowed to the two FREE themes only — this runs synchronously at
 * module load, long before subscription status is known, so a stored premium theme
 * name is never applied here (that would flash a locked theme to a non-premium/
 * unresolved visitor). `useThemeGuard` re-applies a stored premium theme once
 * entitlement is confirmed, and falls back to `dark` on entitlement loss.
 */
function getInitialTheme(): Theme {
  const stored = safeGetStoredTheme()
  return stored === 'light' || stored === 'dark' ? stored : 'dark'
}

/**
 * Raw stored theme preference, including premium names — bypasses
 * {@link getInitialTheme}'s free-only narrowing. Used by `useThemeGuard` to restore a
 * premium theme once entitlement is confirmed; never read at module-load time.
 * Validated against the theme catalogue: a corrupted or stale value yields `null`
 * rather than being forwarded to `setTheme`.
 */
export function readStoredTheme(): Theme | null {
  const stored = safeGetStoredTheme()
  return isValidTheme(stored) ? stored : null
}

/**
 * Drive both theming conventions the CSS supports: `data-theme` on <html>
 * (AC requirement, styles the app) and the `.dark` class (shadcn convention,
 * styles React portals like dropdowns/tooltips rendered outside the app tree).
 */
function applyThemeToDom(theme: Theme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.setAttribute('data-theme', theme)
  root.classList.toggle('dark', (DARK_FAMILY_THEMES as string[]).includes(theme))
}

interface ThemeStore {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: getInitialTheme(),
  setTheme: (theme) => {
    applyThemeToDom(theme)
    safePersistTheme(theme)
    set({ theme })
  },
  toggleTheme: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
}))

// Sync the DOM to the resolved preference as soon as this module loads, so the
// `.dark` class matches even if the inline no-flash script in index.html only set
// the `data-theme` attribute.
applyThemeToDom(useThemeStore.getState().theme)
