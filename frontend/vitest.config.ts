import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(viteConfig, defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    // Several component tests mount heavy trees (6-Select creator, live fretboard
    // preview, auth form + mutation). Under full-suite CPU contention these can exceed
    // vitest's 5s default and flake; give assertions headroom without weakening them.
    testTimeout: 15000,
    hookTimeout: 15000,
  },
}))
