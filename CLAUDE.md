# Guitar App

React (Vite 8, TypeScript `allowJs:true`, Tailwind v4, shadcn/ui) + Java 21 Spring Boot + PostgreSQL. Fretboard visualization, scale/mode explorer, auth (Google OAuth + email), Stripe subscriptions.

## Context Routing — Always Use Distillates

Load these files for project context. Never load their full `.md` counterparts (distillates are lossless, 4× smaller):

- Architecture → `_bmad-output/planning-artifacts/architecture.distillate.md`
- Epics/stories → `_bmad-output/planning-artifacts/epics.distillate.md`
- UX spec → `_bmad-output/planning-artifacts/ux-design-specification.distillate.md`

## Active Sprint

Stories 1.1–1.9: done (Epic 1 complete, awaiting commit). Next: Epic 1 retrospective (optional) or start Epic 2 story 2.1.

- Deferred: `_bmad-output/implementation-artifacts/deferred-work.md`
- Sprint status: `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Hard Constraints

- `frontend/src/data/*.js` — do NOT convert to TS, do NOT modify (musicTheory.js, tunings.js, scales.js)
- Tailwind v4: CSS-only via `@theme` in `index.css` — no `tailwind.config.js`, no postcss
- `src/components/ui/` — shadcn/ui generated files; do not hand-edit
- `@/` alias → `src/`; new components go in the correct `features/` subdirectory
- New API routes: only from the defined surface in architecture.distillate.md — do not invent routes
