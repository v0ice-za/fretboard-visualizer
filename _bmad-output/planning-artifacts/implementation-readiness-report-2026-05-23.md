---
stepsCompleted: [1, 2, 3, 4, 5, 6]
documents:
  prd: _bmad-output/planning-artifacts/prds/prd-personal_projects-2026-05-22/prd.md
  architecture: _bmad-output/planning-artifacts/architecture.md
  epics: _bmad-output/planning-artifacts/epics.md
  ux: _bmad-output/planning-artifacts/ux-design-specification.md
---

# Implementation Readiness Assessment Report

**Date:** 2026-05-23
**Project:** Guitar App (personal_projects)

---

## PRD Analysis

### Functional Requirements

FR-1: The system renders an interactive Fretboard reflecting the active Tuning and Capo position. Open-string pitch labels reflect the active Tuning. Fret positions are numbered; numbers shift correctly when a Capo is set. Fretboard updates in < 100ms on any Tuning or Capo change.

FR-2: A user can select any Free Tuning from the predefined free set (5–7 tunings) without an account. Selecting a Tuning updates the Fretboard and all active Highlights in real time. Remaining predefined tunings show a paywall prompt.

FR-2b: An authenticated Premium user can select any predefined Premium Tuning or any saved Custom Tuning. All predefined tunings beyond the free set are available. Custom Tunings appear in the same selector.

FR-3: A user can set a Capo at any fret position (1–12) or remove it. Fretboard display, note names, and active Highlights all shift to reflect the Capo offset.

FR-4: A user can click or tap any fret position to toggle a Highlight on or off, independent of any library Shape. Freeform Highlights are visually distinct from library-sourced Highlights. Multiple positions can be highlighted simultaneously. Selecting a new library Shape prompts the user before clearing existing Freeform Marks. [ASSUMPTION: confirmation prompt]

FR-5: A user can show or hide pitch names on the Fretboard. Toggle is off by default. Names update in real time on Tuning or Capo change.

FR-5b: For authenticated users, the app saves and restores fretboard state (active Tuning, Capo, Freeform Marks) between sessions. Unauthenticated users get no persistence.

FR-6: A user can browse the Chord Library by chord name and type. Free users see 5 preview chords; remaining entries show a paywall prompt. Premium users see the full library.

FR-7: A user can select a chord to highlight its Shape on the Fretboard in the active Tuning. Fretboard updates immediately. Shape reflects active Tuning. Selecting a chord clears any active Scale Pattern Highlight. [ASSUMPTION: one active Shape at a time]

FR-8: A user can browse the Scale Library by scale name and root note. Free users see 5 preview scales; remaining entries show a paywall prompt. Premium users see the full library.

FR-9: A user can select a scale and root note to highlight its full Scale Pattern on the Fretboard. All positions highlighted simultaneously. Pattern reflects active Tuning. Selecting a scale clears any active Chord Shape Highlight.

FR-10: An authenticated Premium user can create a Custom Tuning by specifying a pitch for each string. Per-string pitch input (note + octave). Created tunings saved to user's account. Custom Tunings appear in the tuning selector.

FR-11: An authenticated Premium user can rename or delete their Custom Tunings. Deleting an active Custom Tuning reverts the Fretboard to Standard tuning.

FR-12: An authenticated Premium user can create a Chord Progression by adding, reordering, and removing chords. Stepping through updates the Fretboard Highlight to each chord's Shape. Progressions are saved to the user's account. [ASSUMPTION]

FR-13: A visitor can create an account and log in via Google OAuth or email + password. Google OAuth is primary. Unauthenticated users retain full Free Tier access.

FR-14: An authenticated user can purchase an annual Subscription ($12/yr). Premium Tier features unlock immediately on successful payment. User receives email confirmation. [ASSUMPTION]

FR-15: The app reflects the user's Subscription status and enforces access gates. Expired or cancelled Subscriptions revert to Free Tier immediately (server-side check). Free Tier users see a clear, non-aggressive paywall prompt.

**Total FRs: 17** (FR-1 through FR-15, including FR-2b and FR-5b)

### Non-Functional Requirements

NFR-1: Fretboard renders legibly at 375px minimum viewport width (mobile browser support).
NFR-2: All Highlight and layout updates complete in < 100ms.
NFR-3: Passwords hashed with bcrypt (or equivalent).
NFR-4: Subscription status validated server-side on every authenticated request.
NFR-5: No card data touches the backend — payment handled exclusively by third-party processor.
NFR-6: WCAG 2.1 AA color contrast target for Highlights and note names.

**Total NFRs: 6**

### Additional Requirements / Assumptions Flagged

- FR-4 ASSUMPTION: Confirmation prompt before clearing Freeform Marks when a new library Shape is selected.
- FR-7 / FR-9 ASSUMPTION: One active Shape at a time (chord OR scale, not both).
- FR-12 ASSUMPTION: Chord progressions saved to user account.
- FR-14 ASSUMPTION: Email confirmation sent on subscription purchase.
- GENERAL: 6-string guitar only in v1. Dark mode default.

### PRD Completeness Assessment

PRD is thorough and well-structured. All 17 FRs are numbered and grouped by feature. NFRs are explicitly stated as cross-cutting concerns. Assumptions are tagged inline and indexed in §9. Open questions are documented (free tuning set, payment processor — both since resolved in architecture). No missing feature areas detected.

---

## Epic Coverage Validation

### Coverage Matrix

| FR | Story Coverage | Status |
|----|---------------|--------|
| FR-1 | Stories 1.3, 1.7 | ✅ Covered |
| FR-2 | Story 1.5 | ✅ Covered |
| FR-2b | Story 4.2 | ✅ Covered |
| FR-3 | Story 1.7 | ✅ Covered |
| FR-4 | Story 1.8 | ⚠️ Partial — confirmation prompt AC missing |
| FR-5 | Story 1.8 | ✅ Covered |
| FR-5b | Story 4.4 | ✅ Covered |
| FR-6 | Story 2.4 | ✅ Covered |
| FR-7 | Story 2.4 | ⚠️ Partial — mutual exclusion with scale not explicit in AC |
| FR-8 | Story 2.3 | ✅ Covered |
| FR-9 | Story 1.6 | ✅ Covered |
| FR-10 | Story 4.1 | ✅ Covered |
| FR-11 | Story 4.2 | ✅ Covered |
| FR-12 | Story 4.3 | ⚠️ Partial — PRD assumes saved to account; story defers to in-session only |
| FR-13 | Stories 3.2, 3.3 | ✅ Covered |
| FR-14 | Story 3.5 | ⚠️ Partial — email confirmation not covered; no email service in architecture |
| FR-15 | Stories 3.5, 3.6 | ✅ Covered |

### Missing / Partial Requirements

**GAP-1 (FR-4) — Freeform Mark Clearing Confirmation Prompt**
PRD states: "Selecting a new library Shape prompts the user before clearing existing Freeform Marks."
Story 1.8 AC states freeform dots "coexist alongside active scale/chord highlights" — which implies they are NOT cleared, conflicting with the PRD assumption.
Recommendation: Clarify intent — either freeform marks always persist alongside library shapes (no prompt needed), or add an AC to Story 1.8 or 2.3/2.4 for the confirmation prompt.

**GAP-2 (FR-7 / FR-9) — One Active Shape at a Time**
PRD states: "Selecting a chord clears any active Scale Pattern Highlight" and vice versa.
No story AC explicitly describes this mutual exclusion behavior.
Recommendation: Add an AC to Story 2.3 (Scale Library) and Story 2.4 (Chord Library) explicitly stating that selecting a chord/scale clears the other type.

**GAP-3 (FR-12) — Chord Progression Persistence**
PRD assumption: "Progressions are saved to the user's account."
Story 4.3 explicitly defers: "in-session memory, no server persistence required at this stage."
This is a deliberate deferral, but it conflicts with the PRD assumption. Needs either a follow-on story or explicit acknowledgement that this is a v2 item.
Recommendation: Add a Story 4.3b (or note in Story 4.3) for server-side progression persistence, or explicitly mark this PRD assumption as deferred to v2.

**GAP-4 (FR-14) — Email Confirmation on Subscription Purchase**
PRD assumption: "User receives email confirmation" on subscription purchase.
No story covers transactional email. No email service (SendGrid, SES, etc.) is in the architecture.
Recommendation: Add an AC to Story 3.5 for email confirmation, and add email service to ARCH (or mark as v2 with explicit reasoning).

### Coverage Statistics

- Total PRD FRs: 17
- FRs fully covered: 13
- FRs partially covered: 4 (FR-4, FR-7, FR-12, FR-14)
- FRs not covered: 0
- Coverage: 100% at story level; 4 AC-level gaps requiring resolution

---

## UX Alignment Assessment

### UX Document Status

Found: `_bmad-output/planning-artifacts/ux-design-specification.md` — complete (14 steps, status: complete).

### UX ↔ PRD Alignment

✅ All PRD user journeys (UJ-1, UJ-2, UJ-3) are represented in the UX spec with full flow diagrams.
✅ UX spec adds UJ-4 (Mode Exploration) which extends UJ-1 naturally — not a conflict.
✅ Free/premium split (5 previews + locked items) aligns with FR-6 and FR-8.
✅ PaywallCard is inline/non-modal as required by FR-15 ("non-aggressive paywall prompt").
✅ One-active-shape-at-a-time behaviour (FR-7/FR-9) is reflected in UX-spec UJ-1 flow.
✅ Dark mode default aligns with PRD aesthetic assumption.

⚠️ UX-spec UJ-3 flow diagram shows "PayFast - ZAR · Stripe SA fallback" — architecture has since confirmed Stripe only. Stale documentation reference; no functional impact.

### UX ↔ Architecture Alignment

✅ AppShell CSS Grid named zones — supported by Tailwind v4 + React (ARCH-2).
✅ Zustand stores (fretboardStore, layoutStore, authStore, subscriptionStore) — ARCH-9.
✅ React Router v7 + useUrlState — ARCH-10.
✅ Stripe Checkout + webhook — ARCH-7.
✅ JWT/auth flow — ARCH-5, ARCH-6.

⚠️ GAP-5: Floating UI not listed in architecture.md as a frontend dependency. UX spec and Story 2.2 reference it for PaywallCard anchoring. Needs adding to frontend dependencies.

⚠️ GAP-6: UX spec specifies success toasts (custom tuning saved, subscription activated) and AlertDialog confirmation (clear freeform marks, delete custom tuning). Neither is captured in any story's acceptance criteria.

### Warnings

- Update UX-spec UJ-3 flow diagram to reference Stripe only (cosmetic, not blocking).
- Add Floating UI to the frontend dependencies list in architecture.md.
- Add toast/AlertDialog AC details to relevant stories (Story 4.1, 3.6, 1.8) or accept these as implementation-time decisions.

---

## Epic Quality Review

### Epic Structure Validation

| Epic | User-Centric? | Stands Alone? | Value Clear? | Verdict |
|------|--------------|---------------|--------------|---------|
| 1: Core Fretboard Experience | ✅ | ✅ Standalone | ✅ Full free-tier app | ✅ PASS |
| 2: Library & Freemium Experience | ✅ | ✅ Uses Epic 1 only | ✅ Free/premium split live | ✅ PASS |
| 3: Auth & Subscription | ✅ | ✅ Uses 1 + 2 | ✅ Real accounts + payments | ✅ PASS |
| 4: Premium Features | ✅ | ✅ Uses 1 + 2 + 3 | ✅ Complete premium product | ✅ PASS |

### Story Dependency Analysis

All 25 stories checked for forward dependencies. No forward dependencies found. Dependency chain:
- Each story in Epic 1 builds only on prior Epic 1 stories ✅
- Epic 2 stories depend on Epic 1 (AppShell, useLayoutStore) ✅
- Epic 3 stories depend on Epic 1 + 2 as needed ✅
- Epic 4 stories depend on Epic 3 (auth/subscription enforcement) ✅

### Database Creation Timing

- V1 (users) + V2 (subscriptions): Story 3.1 — first story requiring them ✅
- V3 (custom_tunings): Story 4.1 — first story requiring it ✅
- V4 (saved_sessions): Story 4.4 — first story requiring it ✅
No upfront table creation violations found.

### Best Practices Compliance

🔴 Critical Violations: **None**

🟠 Major Issues: All 6 gaps (GAP-1 through GAP-6) already documented in Epic Coverage and UX Alignment sections above.

🟡 Minor Concerns:
- Stories 1.1, 1.2, 3.1, 3.7 are developer-as-user setup stories — acceptable for brownfield monorepo restructuring starting from an existing codebase.
- Story 3.6 AC references "Story 3.5" by name — backward reference only, not a forward dependency.
- Story 4.3 references chord library from Epic 2 — valid backward epic dependency.

---

## Summary and Recommendations

### Overall Readiness Status

## ✅ READY FOR IMPLEMENTATION

No critical violations. No structural gaps. All 17 FRs have story coverage. Epic dependency chain is clean and correctly ordered. Implementation can begin on Story 1.1 immediately.

### Issues Found: 6 (0 Critical · 4 Major AC-gaps · 2 Minor)

| # | Gap | Severity | Blocking? |
|---|-----|----------|-----------|
| GAP-1 | FR-4: Freeform mark clearing behavior is ambiguous — PRD says "confirmation prompt before clearing" but Story 1.8 says freeform dots "coexist" with library highlights, implying they are never cleared | Major | ⚠️ Resolve before Story 1.8 |
| GAP-2 | FR-7 / FR-9: Mutual exclusion (chord clears scale, scale clears chord) not explicit in Story 2.3 or 2.4 AC | Major | ⚠️ Resolve before Story 2.3 |
| GAP-3 | FR-12: PRD assumes chord progressions saved to user account; Story 4.3 defers to in-session memory | Major | ⚠️ Acknowledge deferral explicitly |
| GAP-4 | FR-14: Email confirmation on subscription purchase not covered; no email service in architecture | Major | ⚠️ Resolve before Story 3.5 |
| GAP-5 | Floating UI not listed in architecture.md frontend dependencies | Minor | No — add before Story 2.2 |
| GAP-6 | Success toasts and AlertDialog (UX spec) not in story ACs | Minor | No — implementation-time decision |

### Recommended Next Steps

1. **Resolve GAP-1 before Story 1.8:** Decide — do freeform marks persist alongside library highlights (no clearing, no prompt) or does a new shape selection prompt before clearing? Update Story 1.8 AC accordingly. Recommendation: freeform marks always persist (additive state pattern from UX spec), with a separate "Clear all marks" action — no automatic clearing.

2. **Resolve GAP-2 before Story 2.3:** Add explicit AC to Story 2.3 and 2.4: "Selecting a scale clears any active chord highlight" and "Selecting a chord clears any active scale highlight."

3. **Acknowledge GAP-3 explicitly:** Add a note to Story 4.3 or epics.md marking chord progression persistence as deferred to v2, so the PRD assumption is intentionally superseded. Otherwise a future developer may add server persistence unexpectedly.

4. **Resolve GAP-4 before Story 3.5:** Decide on email confirmation. Options: (a) add transactional email service (SendGrid free tier) to architecture and Story 3.5 AC; (b) mark as v2 and explicitly close the PRD assumption. Recommendation: defer to v2 — email confirmation is a nice-to-have, Stripe already sends its own payment receipt.

5. **Add Floating UI to architecture.md** frontend dependencies before starting Epic 2. This is a 5-minute fix.

6. **Start implementation** on Story 1.1 (Monorepo Setup) — no blockers exist for Epic 1.

### Final Note

This assessment identified 6 issues across 3 categories. None are structural blockers. All planning artifacts are well-formed, consistent, and ready for a developer agent to implement. The 4 major AC-gaps should each be resolved in the conversation immediately before their respective story begins — they do not need to be fixed before starting Story 1.1.

**Assessed by:** Claude Sonnet 4.6 via BMad implementation-readiness workflow
**Date:** 2026-05-23
