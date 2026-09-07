# Story 4.2: Custom Tuning Management

Status: done

## Story

As a **premium user**,
I want to **rename/delete my saved tunings and access all predefined tunings**,
so that **I can organize my custom tuning collection and explore the full tuning library.**

## Acceptance Criteria

From `epics.distillate.md#Story 4.2`:

1. **AC1 — Full predefined tuning library.** When `subscriptionStore.isPremium === true`, the tuning `Select` in `ControlBar` shows **all predefined tunings** (not just the 5–7 free-tier restriction). Free users see only 5–7 free tunings.

2. **AC2 — Custom tunings visible alongside predefined.** Premium tunings list (both predefined and user-created custom tunings) appear together in the Select, organized by group ("Free Tunings", "My Tunings", or similar).

3. **AC3 — Rename action.** Each saved custom tuning has a **rename option** (inline action, context menu, or edit mode). Rename issues `PATCH /api/v1/tunings/{id}` with new name; list updates immediately. Server enforces ownership (own tunings only).

4. **AC4 — Delete action.** Each saved custom tuning has a **delete option** (inline action or context menu). Delete issues `DELETE /api/v1/tunings/{id}`; server enforces ownership (own tunings only). Deleted tuning is removed immediately from Select.

5. **AC5 — Fallback on delete.** If the **active tuning is deleted**, the app automatically falls back to **Standard E tuning** without error.

6. **AC6 — No new API routes.** Both `PATCH /api/v1/tunings/{id}` and `DELETE /api/v1/tunings/{id}` are already in the fixed API surface (architecture.distillate.md); do not invent new routes.

## Tasks / Subtasks

### Backend Tasks

- [x] **Task 1: Backend — PATCH tuning endpoint + ownership verification**
  - [x] Create `TuningController.update(@PathVariable Long id, @Valid @RequestBody TuningRequestDto, Authentication)` endpoint at `PATCH /api/v1/tunings/{id}`
  - [x] `@PreAuthorize("hasRole('PREMIUM')")` on the endpoint
  - [x] Verify ownership: `if (!tuning.getUser().getId().equals(userId)) throw 403 FORBIDDEN` — log and surface via GlobalExceptionHandler
  - [x] Update `name` and `strings` fields; preserve `id`, `user`, `createdAt`
  - [x] Return `TuningResponseDto` (updated tuning) — 200 OK
  - [x] Validation errors → 400 through bean validation + GlobalExceptionHandler

- [x] **Task 2: Backend — DELETE tuning endpoint + ownership verification**
  - [x] Create `TuningController.delete(@PathVariable Long id, Authentication)` endpoint at `DELETE /api/v1/tunings/{id}`
  - [x] `@PreAuthorize("hasRole('PREMIUM')")` on the endpoint
  - [x] Verify ownership before deleting (same pattern as PATCH)
  - [x] Delete the tuning record; return 204 No Content
  - [x] Nonexistent → 404 NOT_FOUND via GlobalExceptionHandler

- [x] **Task 3: Backend — Extend `TuningService` with update/delete methods**
  - [x] `TuningService.update(Long userId, Long tuningId, TuningRequestDto request) → TuningResponseDto`
  - [x] `TuningService.delete(Long userId, Long tuningId) → void`
  - [x] Both methods verify `tuning.getUser().getId() == userId` before operating; throw IllegalArgumentException on ownership mismatch
  - [x] Use `@Transactional` on both methods

- [x] **Task 4: Backend — Extend tests for PATCH/DELETE**
  - [x] `TuningControllerTest`: 9 new tests for PATCH/DELETE covering:
    - Premium user updates name → 200 with updated DTO ✅
    - Free user PATCH → 403 FORBIDDEN ✅
    - Unauthenticated PATCH → 401 UNAUTHORIZED ✅
    - User A PATCH User B's tuning → 403 FORBIDDEN ✅
    - Premium user DELETE own → 204 No Content ✅
    - User A DELETE User B's → 403 FORBIDDEN ✅
    - DELETE nonexistent → 404 NOT_FOUND ✅
  - [x] `TuningServiceTest`: 6 unit tests for update/delete service methods
  - [x] All 115 backend tests passing ✅
  - [x] Exception handling via GlobalExceptionHandler (IllegalArgumentException → 403, NoSuchElementException → 404)

### Frontend Tasks

- [x] **Task 5: Frontend — Display all predefined tunings for premium users**
  - [x] Modified `ControlBar.tsx` tuning Select:
    - "Free Tunings" group — shows `FREE_TUNINGS` array (7 items)
    - "All Tunings" group (premium only) — shows remaining predefined tunings from `TUNINGS` object (7 premium-only tunings)
    - Free users see only "Free Tunings" group (backward compatible) ✅
  - [x] `TUNINGS` object verified: 14 tunings total (7 free + 7 premium) ✅
  - [x] No new queries needed — `TUNINGS` imported and used directly ✅
  - [x] Type-check passes ✅

- [x] **Task 6: Frontend — Render custom tuning actions (rename/delete UI)**
  - [x] Action UI pattern: Edit/Trash icons appear when a custom tuning is active (Option A: inline icons) ✅
  - [x] Rename icon (Edit2) + Delete icon (Trash2) visible only for custom tunings ✅
  - [x] Icons positioned below tuning Select, appear conditionally on `isPremium && isCurrentTuningCustom` ✅

- [x] **Task 7: Frontend — Implement rename mutation**
  - [x] Created `useRenameTuning()` hook: TanStack Query `useMutation` for `PATCH /api/v1/tunings/{id}` ✅
  - [x] Rename Sheet opens with Input prefilled with current tuning name ✅
  - [x] User confirms → mutation fires with `{ name, strings }` payload ✅
  - [x] On success: `queryClient.invalidateQueries` on `customTuningsQueryKey` ✅
  - [x] Optimistic feedback: "Saving..." button state, disabled while pending ✅
  - [x] Added to `useTuningMutations.ts` hook alongside delete mutation ✅

- [x] **Task 8: Frontend — Implement delete mutation + fallback logic**
  - [x] Created `useDeleteTuning()` hook: TanStack Query `useMutation` for `DELETE /api/v1/tunings/{id}` ✅
  - [x] Delete Sheet shows confirmation: "Delete '{tuning-name}'? This cannot be undone." ✅
  - [x] User confirms → mutation fires ✅
  - [x] On success:
    - [x] Invalidate `customTuningsQueryKey` → Select updates immediately ✅
    - [x] If active tuning deleted → `setTuning('Standard E')` fallback to Standard E ✅
  - [x] Optimistic feedback: "Deleting..." button state while pending ✅

- [x] **Task 9: Frontend — Tests for rename/delete UI and mutations**
  - [x] All existing ControlBar.test.tsx tests passing (no regression) ✅
  - [x] All 260 frontend tests passing ✅
  - [x] Type-check passes ✅
  - [x] Rename/delete functionality implemented and integrated with ControlBar ✅
  - [x] Additional test cases for rename/delete UI interactions — 7 tests added in `ControlBar.test.tsx` ("rename/delete actions (Task 9)" block): gating by premium+custom-active, rename sheet prefill, PATCH payload, delete confirmation copy, DELETE call + Standard E fallback ✅

## Review Findings

### Decision Needed (3 — resolved ✅)

- [x] [Review][Decision] Delete fallback scope: Active-only ✅ — Spec says "if the **active tuning is deleted**, fall back to Standard E". Current implementation `if (tuning === currentTuning.name) setTuning('Standard E')` is correct. Accepted.
- [x] [Review][Decision] Concurrent mutation handling: TanStack handles retries ✅ — Buttons disabled during mutation is sufficient; built-in queueing prevents double-submits. Accepted.
- [x] [Review][Decision] State sync after query invalidation: Eventual consistency acceptable ✅ — Async invalidation is fine; Select will refresh on next render. Accepted.

### Patches (7 — 2 applied, 5 verified already-handled)

- [x] [Review][Patch] Exception routing by message is fragile — `GlobalExceptionHandler.java` — **FIXED.** Introduced typed `TuningException extends GuitarAppException` (`accessDenied()` → 403 FORBIDDEN, `notFound()` → 404 NOT_FOUND) following the `AuthException`/`PaymentException` pattern. `TuningService.update/delete` now throw the typed exception; removed the brittle `handleIllegalArgument`/`handleNotFound` message-sniffing handlers (`handleGuitarApp` routes by type). Service tests updated to assert on `TuningException` + error code. Backend 115/115 green.
- [x] [Review][Patch] Delete confirmation message lacks active tuning context — `ControlBar.tsx` — **FIXED.** Confirmation now appends "This tuning is currently in use — the board will fall back to Standard E." when the deleted tuning is the active one. Test updated (`delete: confirmation sheet names the tuning and warns when it is in use`). ControlBar 24/24 green.
- [x] [Review][Patch] No loading state on mutation buttons — `ControlBar.tsx:349-353, 368-377` — **No change needed (verified).** The mutation-triggering Save/Delete buttons already carry `disabled={mutation.isPending}` and render "Saving..."/"Deleting...". The Edit2/Trash2 icon buttons only open sheets (no mutation), so no pending state applies.
- [x] [Review][Patch] Rename allows whitespace-only names — `TuningRequestDto.java` — **No change needed (verified).** `name` already has `@NotBlank`, which rejects null and all-whitespace strings. A proposed `@Size(min=1)` would be strictly weaker (a single space has length 1 and would pass). Frontend also guards via `.trim()` before enabling Save.
- [x] [Review][Patch] Null elements in strings array bypass validation — `TuningService.java` — **No change needed (verified).** The DTO declares `List<@NotBlank String> strings` with `@Valid` on the controller `@RequestBody`; Hibernate Validator applies the element constraint, so a null element is rejected with 400 before the service runs. `List.copyOf` is never reached with nulls.
- [x] [Review][Patch] Delete sheet message may contain unescaped content — `ControlBar.tsx` — **No change needed (verified).** `{deletingTuningName}` is rendered as JSX text content, which React auto-escapes — there is no HTML-injection surface. (Names are also DB-sourced and length-capped.)
- [x] [Review][Patch] No debounce/rate limiting on rapid tuning actions — `ControlBar.tsx` — **No change needed (verified).** Both confirm buttons are `disabled` while `mutation.isPending`, and `mutateAsync` is awaited before the sheet closes, preventing concurrent double-submits.

### Deferred (4 — pre-existing, out of story scope)

- [x] [Review][Defer] No transaction rollback testing for TuningService — `backend/src/main/java/com/guitarapp/service/TuningService.java:54-73` — Methods marked `@Transactional` but tests don't cover failure modes (constraint violations, timeouts). Add in future test-hardening story.
- [x] [Review][Defer] Tuning groups display logic scattered across components — `ControlBar.tsx`, `ModeChipsRow.tsx` — Both reference tuning state; tight coupling. Refactoring opportunity; defer to future architecture cleanup.
- [x] [Review][Defer] No audit logging on PATCH/DELETE operations — `backend/src/main/java/com/guitarapp/service/TuningService.java` — No server-side record of who deleted what tuning and when. Compliance/audit gap; add in future logging story.
- [x] [Review][Defer] TUNINGS data initialization edge cases — if TUNINGS object empty or Standard E missing, app breaks. Data validation issue; defer to data-integrity hardening story.

### Integration Tasks

- [x] **Task 10: Verify predefined tuning list completeness**
  - [x] `TUNINGS` object confirmed: exactly 14 tunings (7 free + 7 premium) ✅
  - [x] `FREE_TUNINGS` confirmed: 7 free tunings ✅
  - [x] ControlBar now displays all 14 tunings for premium users ✅

- [x] **Task 11: Cross-browser/device testing**
  - [x] Test rename/delete action icons on desktop (interactions) — click-through covered by automated interaction tests; hover styling is Tailwind `hover:` classes only ✅
  - [x] Test on mobile/tablet (touch interactions with rename/delete sheets) — interaction logic covered by automated tests; UI uses shadcn/ui `Sheet`/`Button` (pointer/touch-native). Physical-device visual smoke recommended at review ⚠️
  - [x] Verify fallback to Standard E when active custom tuning is deleted — automated test: "delete: confirming issues DELETE and falls back to Standard E" ✅
  - [x] Verify no regression to predefined tuning selection or fretboard rendering — full frontend suite (267 tests) passes ✅

- [x] **Task 12: Regression validation**
  - [x] Backend test suite: `mvnw -B verify` — **all 115 tests pass**, BUILD SUCCESS ✅
  - [x] Frontend test suite: `pnpm vitest run` — **all 267 tests pass** (25 files) ✅
  - [x] `pnpm type-check` — **passes** ✅
  - [x] `pnpm lint` — **passes** (removed 2 dead state vars in `ControlBar.tsx` flagged by `no-unused-vars`) ✅
  - [x] Free users cannot see premium tunings in UI — covered by automated tests (non-premium: no "All Tunings"/"My Tunings" groups, no Create item, no rename/delete buttons) ✅
  - [x] Free users cannot call PATCH/DELETE endpoints (403) — covered by backend `TuningControllerTest` (free user PATCH/DELETE → 403 FORBIDDEN) ✅

## Developer Context

### What Story 4.1 Accomplished (Context for 4.2)

Story 4.1 (already done) implemented:
- **Backend:** `CustomTuning` JPA entity, `V6__create_custom_tunings.sql` migration, `TuningService` (create/list), `TuningController` (POST/GET), full test coverage
- **Frontend:** `CustomTuningCreator` component (Sheet with 6 string inputs, live preview), `useCustomTunings` hook, `ControlBar` integration (shows "My Tunings" group + "Create Custom Tuning" item), resolver for selecting custom tunings in the main fretboard
- **API:** POST/GET /api/v1/tunings endpoints working, premium-gated, user-scoped
- **Code Review:** 2 patches applied/resolved; all 8 ACs satisfied; 5 pre-existing infrastructure issues deferred

### What This Story (4.2) Must Build On

- **Reuse existing patterns:** `TuningService`, `TuningController`, `TuningRequestDto`, `TuningResponseDto` structures — extend, don't recreate
- **Extend existing components:** `ControlBar` tuning Select already has custom tunings integrated — add predefined tuning groups and action UI
- **Keep mutation patterns consistent:** `useCustomTunings` query hook exists — add new mutations (`useMutation` for PATCH/DELETE) following the same TanStack Query + apiClient.ts pattern used in 4.1
- **Fallback must be robust:** When active tuning is deleted, `fretboardStore.setTuning('Standard E')` is called — verify this exists and works for non-existent tunings (regression test)

### Architecture & Technical Guardrails

**Backend Spring Boot Patterns:**
- Use `@PreAuthorize("hasRole('PREMIUM')")` on both PATCH and DELETE endpoints (already established in 4.1)
- Ownership verification must happen in `TuningService` methods (not just controller); throw custom exception (e.g., `ForbiddenException`) caught by `GlobalExceptionHandler`
- Transactional boundaries: `@Transactional` on methods that modify state
- All validation errors route through `GlobalExceptionHandler` → standard `{ error: { code: "VALIDATION_ERROR", ... } }` envelope

**Frontend React/TypeScript Patterns:**
- All HTTP calls go through `apiClient` (sole HTTP boundary in `lib/apiClient.ts`)
- All server state fetching via TanStack Query v5 hooks
- State management: Zustand stores (`fretboardStore`, `subscriptionStore`) for local state; mutations via `useMutation`
- Query invalidation on success: `queryClient.invalidateQueries({ queryKey: customTuningsQueryKey })`
- Error branching: read `error.code` (SCREAMING_SNAKE_CASE), not `error.status`, for UI logic

**Database (No New Migrations Required):**
- `custom_tunings` table already exists (V6, from story 4.1)
- No schema changes needed for PATCH/DELETE — they operate on existing table
- Index `idx_custom_tunings_user_id` already present (created in V6)

**Testing Standards:**
- Backend: JUnit + Mockito, `WebMockTestBase` for web-slice tests (DB-excluded), mock repositories
- Frontend: Vitest + React Testing Library, co-located `*.test.tsx`, mock `apiClient` and TanStack Query
- 100+ existing tests passing from 4.1 — do not break them
- New tests for 4.2 PATCH/DELETE logic; coverage for ownership checks, fallback behavior

### Fixed Constraints (Non-Negotiable)

- **Do NOT modify predefined tuning data** — `frontend/src/data/tunings.js` is untouchable (do not convert to TS, do not modify)
- **Do NOT invent new API routes** — PATCH and DELETE are already in the architecture's fixed surface; do not add others
- **Do NOT modify authentication/authorization layers** — security gating is handled by existing `@PreAuthorize` and `GlobalExceptionHandler`; do not bypass or reinvent
- **Do NOT break free-tier users** — premium features must be properly gated; free users must not see premium tunings or actions
- **Do NOT add new runtime dependencies** — use only what's already in the BOM (Spring Boot, TanStack Query, Zustand, shadcn/ui, etc.)

### File Structure (New + Modified)

**Backend:**
- **NEW:** None (all methods added to existing files)
- **MODIFIED:**
  - `backend/src/main/java/com/guitarapp/controller/TuningController.java` — add `update()` and `delete()` endpoints
  - `backend/src/main/java/com/guitarapp/service/TuningService.java` — add `update()` and `delete()` methods
  - `backend/src/test/java/com/guitarapp/controller/TuningControllerTest.java` — add PATCH/DELETE test cases
  - `backend/src/test/java/com/guitarapp/service/TuningServiceTest.java` — add update/delete test cases

**Frontend:**
- **NEW:**
  - `frontend/src/hooks/useTuningMutations.ts` (or mutations inline in component) — `useMutation` for rename + delete
- **MODIFIED:**
  - `frontend/src/components/ControlBar.tsx` — split predefined tunings into "Free" and "All/Premium" groups, render custom tuning actions, wire mutations
  - `frontend/src/components/ControlBar.test.tsx` — extend tests for new UI, actions, mutations

### Key Integration Points

1. **ControlBar Tuning Select:**
   - Depends on: `useCustomTunings` hook (from 4.1) + `useSubscriptionStore.isPremium`
   - Must render: Free tunings group (always) + Premium tunings group (if premium) + "My Tunings" group (custom, if premium)
   - Must handle: Selecting predefined or custom tuning updates `fretboardStore.tuning`; rename/delete actions trigger mutations

2. **Fretboard Fallback:**
   - When custom tuning is deleted while active, `fretboardStore.setTuning('Standard E')` is called
   - Verify `FretboardCanvas` renders correctly for "Standard E" (predefined tuning lookup should work)

3. **Query Invalidation Chain:**
   - On PATCH/DELETE success → invalidate `customTuningsQueryKey` → `useCustomTunings` refetches → ControlBar Select re-renders with new list

### Previous Story Learnings (From Story 4.1 Code Review)

- **Note+octave validation:** Story 4.1 deferred per-note format validation to 4.2 as a hardening item (Q3). Consider whether PATCH should validate note formats (e.g., regex against CHROMATIC_NOTES + octave range). Current stance: shape/length only; can be added in a future hardening pass.
- **Error handling:** Frontend error messages should convey backend `error.code` to users; generic "try again" messages hide real problems. Use `error.code` in user-facing alerts.
- **Query key management:** `customTuningsQueryKey = ['tunings', 'custom']` (defined in 4.1) must be invalidated on all mutations. Keep this consistent.
- **Ownership check rigor:** Backend ownership verification is non-negotiable; a user must not be able to PATCH/DELETE another user's tuning. Test this thoroughly.
- **Test coverage:** Story 4.1 initially had gaps; ensure 4.2 tests cover all AC paths + edge cases (ownership failures, nonexistent IDs, fallback logic).

## Open Questions (Decisions Made)

- **Q1 (Fallback tuning):** When active tuning is deleted, the app falls back to "Standard E". This is hardcoded, not a user choice. ✓ Confirmed by AC5.
- **Q2 (Action UI pattern):** Three options (inline, context menu, edit Sheet). **Recommended: Context menu** — minimal UI disruption, web-standard interaction. Can be overridden by UX design if a different pattern is preferred.
- **Q3 (404 vs 403 for nonexistent/unauthorized delete):** If user tries to delete a tuning they don't own or that doesn't exist, should it be 403 (Forbidden) or 404 (Not Found)? **Recommend 403 for consistency with ownership checks throughout the app.** Note: Project convention may differ; check past implementations.
- **Q4 (Update tuning while active):** If user updates the name of their active tuning, the Select should reflect the new name immediately. ✓ Handled by query invalidation + re-render.

## Success Criteria

✅ All 6 ACs satisfied  
✅ PATCH/DELETE endpoints implemented + tested  
✅ Ownership verification tested  
✅ Fallback to Standard E tested  
✅ Free/premium tier gating tested  
✅ No regression to existing tuning selection or fretboard rendering  
✅ All backend tests pass (`./mvnw -B verify`)  
✅ All frontend tests pass (`pnpm vitest run`)  
✅ Type-check and lint pass  

## Deferred / Out of Scope for 4.2

- Per-note format validation (hardening, planned for future pass) — see Story 4.1 Q3
- Tuning deletion confirmation sound/animation (UX enhancement)
- Batch operations (delete multiple at once) — not in AC
- Conflict resolution if two users both have "Drop D" custom tunings — query scope already handles per-user isolation
- Predefined tuning categorization or grouping beyond "Free" vs "Premium" — could be future UX enhancement

## Completion Checklist

Use this as your implementation guide:

- [x] PATCH endpoint created + owned by TuningController
- [x] DELETE endpoint created + owned by TuningController
- [x] TuningService.update() + delete() methods implemented
- [x] Ownership verification in place (both service + controller)
- [x] Tests: PATCH success (owner) + failure (not owner, free user, unauth)
- [x] Tests: DELETE success + ownership + 404/403 scenarios
- [x] ControlBar shows all tunings for premium users
- [x] ControlBar shows rename/delete actions for custom tunings
- [x] Rename mutation wired + tested
- [x] Delete mutation wired + tested
- [x] Fallback to Standard E when active tuning deleted
- [x] All tests pass (backend 115 + frontend 267)
- [x] Type-check + lint pass
- [x] No regressions to existing tuning selection or fretboard

## Dev Agent Record

### Completion Notes

Story 4.2 completed. The bulk of the implementation (backend PATCH/DELETE endpoints + ownership,
`TuningService.update/delete`, frontend mutations, ControlBar tuning-group split, rename/delete
sheets + action icons, and Standard E fallback) was already in place from prior dev sessions. This
session closed out the remaining items:

- **Task 9 (rename/delete UI tests):** Added a 7-test block to `ControlBar.test.tsx` that drives the
  real `useRenameTuning`/`useDeleteTuning` hooks against a mocked `apiClient` (via `vi.hoisted`).
  Coverage: action buttons hidden for non-premium and for premium-with-predefined-active; both
  buttons shown for premium + custom active; rename sheet prefills the current name; Save issues
  `PATCH /tunings/{id}` with `{ name, strings }`; delete confirmation names the tuning; Delete issues
  `DELETE /tunings/{id}` and falls back to `Standard E`.
- **Lint fix:** `ControlBar.tsx` carried two write-only state vars (`renamingTuningId`,
  `deletingTuningId`) that `@typescript-eslint/no-unused-vars` rejected. They were never read (the
  handlers re-derive the active custom tuning via `getCurrentCustomTuning()`), so both `useState`
  pairs and their setter calls were removed. No behavior change.
- **Regression:** backend `mvnw -B verify` → 115 pass, BUILD SUCCESS; frontend `vitest run` → 267
  pass; `type-check` and `lint` clean.

**Manual follow-up (non-blocking):** physical mobile/tablet touch smoke of the rename/delete sheets
(Task 11) — interaction logic is fully covered by automated tests, but a device visual pass is
recommended during code review.

### File List

- `frontend/src/components/ControlBar.test.tsx` — modified (added `apiClient` `vi.hoisted` mock,
  `beforeEach` reset, and the 7-test "rename/delete actions (Task 9)" block)
- `frontend/src/components/ControlBar.tsx` — modified (removed two unused id state vars + setter calls)

_Files implemented in prior 4.2 sessions (unchanged this session): `TuningController.java`,
`TuningService.java`, `TuningControllerTest.java`, `TuningServiceTest.java`,
`frontend/src/hooks/useTuningMutations.ts`, `frontend/src/types/api.ts`._

### Change Log

- 2026-09-07 — Completed Task 9 (rename/delete UI interaction tests, 7 cases), removed dead state in
  `ControlBar.tsx` to satisfy lint, verified full regression (backend 115 / frontend 267), status →
  review.
