import { useLayoutStore } from './layoutStore'

describe('layoutStore', () => {
  const DEFAULT_STATE = { activeLayout: { topBar: true, modeRow: false, sidePanel: false, bottomBar: false, libraryMode: 'drawer' as const } }

  beforeEach(() => {
    useLayoutStore.setState(DEFAULT_STATE)
  })

  it('has correct initial state', () => {
    useLayoutStore.setState(DEFAULT_STATE)
    const { activeLayout } = useLayoutStore.getState()
    expect(activeLayout.topBar).toBe(true)
    expect(activeLayout.modeRow).toBe(false)
    expect(activeLayout.libraryMode).toBe('drawer')
  })

  it('setLayout updates partial state', () => {
    useLayoutStore.setState(DEFAULT_STATE)
    useLayoutStore.getState().setLayout({ modeRow: true })
    expect(useLayoutStore.getState().activeLayout.modeRow).toBe(true)
    expect(useLayoutStore.getState().activeLayout.topBar).toBe(true)
  })
})
