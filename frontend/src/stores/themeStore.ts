import { create } from 'zustand'

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'guitar-app-theme'

/** Project is dark-by-default; fall back to that when no valid preference is stored. */
function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' ? stored : 'dark'
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
  root.classList.toggle('dark', theme === 'dark')
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
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, theme)
    set({ theme })
  },
  toggleTheme: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
}))

// Sync the DOM to the resolved preference as soon as this module loads, so the
// `.dark` class matches even if the inline no-flash script in index.html only set
// the `data-theme` attribute.
applyThemeToDom(useThemeStore.getState().theme)
