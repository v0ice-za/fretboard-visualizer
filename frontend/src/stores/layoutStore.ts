import { create } from 'zustand'

type LibraryMode = 'drawer' | 'sidebar' | 'inline' | 'modal'

export interface LayoutConfig {
  topBar: boolean
  modeRow: boolean
  sidePanel: boolean
  bottomBar: boolean
  libraryMode: LibraryMode
}

interface LayoutStore {
  activeLayout: LayoutConfig
  setLayout: (patch: Partial<LayoutConfig>) => void
}

const DEFAULT_LAYOUT: LayoutConfig = {
  topBar: true,
  modeRow: false,
  sidePanel: false,
  bottomBar: false,
  libraryMode: 'drawer',
}

export const useLayoutStore = create<LayoutStore>((set) => ({
  activeLayout: DEFAULT_LAYOUT,
  setLayout: (patch) =>
    set((state) => ({ activeLayout: { ...state.activeLayout, ...patch } })),
}))
