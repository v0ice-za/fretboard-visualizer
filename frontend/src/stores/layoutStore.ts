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
  loginModalOpen: boolean
  openLoginModal: () => void
  closeLoginModal: () => void
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
  loginModalOpen: false,
  openLoginModal: () => set({ loginModalOpen: true }),
  closeLoginModal: () => set({ loginModalOpen: false }),
}))
