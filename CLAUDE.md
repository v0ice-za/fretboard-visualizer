# Guitar App

Interactive fretboard visualization with scale/mode explorer, chord library, Google OAuth + email auth, and Stripe subscriptions. Free/premium tier gating enforced server-side.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18.3, Vite 6, TypeScript (`allowJs:true`), Tailwind v4 (CSS-first `@theme`), shadcn/ui, Zustand, TanStack Query v5, React Router v7 |
| Backend | Java 21, Spring Boot 3.4, Maven, Spring Security 6, Spring Data JPA, Hibernate, Flyway |
| Database | PostgreSQL 16 (Railway); tables: `users`, `subscriptions`, `custom_tunings`, `saved_sessions` |
| Auth | Google OAuth 2.0 (ID token → backend verify) + email/password; JWT pair (15-min access + 7-day httpOnly refresh) |
| Payments | Stripe Billing + Checkout; webhook at `POST /api/v1/webhooks/stripe` |
| Deploy | Frontend → Vercel · Backend → Railway (Dockerfile) |
| Testing | Vitest (unit), Playwright in `frontend/e2e/` (E2E) |

## Context Routing — Always Use Distillates

Load these files for project context. Never load their full `.md` counterparts (distillates are lossless, 4× smaller):

- Architecture → `_bmad-output/planning-artifacts/architecture.distillate.md`
- Epics/stories → `_bmad-output/planning-artifacts/epics.distillate.md`
- UX spec → `_bmad-output/planning-artifacts/ux-design-specification.distillate.md`

## Active Sprint

Epic 1 complete (committed). Epic 2 complete. Epic 3 in progress.

- Active story: `_bmad-output/implementation-artifacts/3-1-backend-scaffold-and-database.md`
- Deferred: `_bmad-output/implementation-artifacts/deferred-work.md`
- Sprint status: `_bmad-output/implementation-artifacts/sprint-status.yaml`

Story cycle: **CS** → **VS** → **DS** → **CR** → next **CS** (or **ER** when epic completes).

## Skills Quick Reference

| Code | Skill | When |
|---|---|---|
| DS | `bmad-dev-story` | Implement the active story |
| CR | `bmad-code-review` | After DS; issues → back to DS |
| CS | `bmad-create-story` (create) | Prepare the next backlog story |
| VS | `bmad-create-story` (validate) | Validate a story before dev |
| SS | `bmad-sprint-status` | Check sprint progress at any time |
| CK | `bmad-checkpoint-preview` | Walkthrough a commit or PR |
| QA | `bmad-qa-generate-e2e-tests` | Generate API/E2E tests post-dev |
| ER | `bmad-retrospective` | Epic-end review |
| CC | `bmad-correct-course` | Major scope or direction changes |
| QQ | `bmad-quick-dev` | Small one-off tasks outside the story cycle |

## Key Paths

```
frontend/src/
  features/          ← new components go here in the correct subdirectory
  components/ui/     ← shadcn/ui generated — do not hand-edit
  components/shared/ ← PaywallCard, AppShell
  stores/            ← fretboardStore, authStore, subscriptionStore, layoutStore
  hooks/             ← useUrlState, useSubscription, useCapo
  lib/               ← apiClient.ts (sole HTTP boundary), queryClient.ts, stripe.ts
  data/              ← tunings.js, scales.js, musicTheory.js — DO NOT TOUCH

backend/src/main/java/com/guitarapp/
  controller/ service/ repository/ model/ dto/ security/ exception/ config/ webhook/

backend/src/main/resources/db/migration/   ← V1–V4 Flyway SQL files
```

## Hard Constraints

- `frontend/src/data/*.js` — do NOT convert to TS, do NOT modify (musicTheory.js, tunings.js, scales.js)
- Tailwind v4: CSS-only via `@theme` in `index.css` — no `tailwind.config.js`, no postcss
- `src/components/ui/` — shadcn/ui generated files; do not hand-edit
- `@/` alias → `src/`; new components go in the correct `features/` subdirectory
- New API routes: only from the defined surface in `architecture.distillate.md` — do not invent routes
- All API fetching via TanStack Query — no raw `fetch`/`axios` in components
- All backend exceptions route through `GlobalExceptionHandler` — never return stack traces
- Never trust client-side subscription state to gate backend logic — verify JWT claims server-side
- Frontend error branching uses `error.code` (SCREAMING_SNAKE_CASE), not `error.status`
