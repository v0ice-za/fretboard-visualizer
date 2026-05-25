# Deferred Work

## Deferred from: code review of 1-2-appshell-and-design-token-system (2026-05-25)

- `layoutStore` lacks reset mechanism — store accumulates state mutations but has no reset() method to return to DEFAULT_LAYOUT; consider adding for testing/lifecycle use cases in future layout enhancement story

## Deferred from: code review of 1-1-monorepo-setup-and-dev-environment (2026-05-24)

- `main.jsx` imports `App.css` alongside `index.css` — hardcoded body styles bypass shadcn CSS variable system; Story 1.2 owns CSS architecture overhaul
- ESLint only lints `.ts/.tsx`, all `.jsx`/`.js` source files skipped — by design for Story 1.1; Story 1.2 migrates components to `.tsx`
- Playwright config has no `webServer` block; CI tests will hang — stub only; add when real E2E tests are written (Story 1.9)
- `createRoot(document.getElementById('root'))` has no null guard — pre-existing `.jsx` code; address when `main.jsx` is migrated to `.tsx`
- Vite v8.0.14 installed vs architecture spec v6 — v8 is functional; update architecture spec in Story 1.9
- Geist Variable set as `--font-sans` in `@theme` block — conflicts with Story 1.2 font plan (Inter + JetBrains Mono); Story 1.2 replaces all design tokens
- shadcn generated light-mode as `:root` default — project is dark-by-default; Story 1.2 implements dark mode system
- `noUnusedLocals: false` and `noUnusedParameters: false` in tsconfig — deliberate for JS/TS mixed transition period; revisit after Story 1.2 migrates components
- `.gitignore` excludes `.vscode/` entirely — shared editor config cannot be committed; refine when team grows
