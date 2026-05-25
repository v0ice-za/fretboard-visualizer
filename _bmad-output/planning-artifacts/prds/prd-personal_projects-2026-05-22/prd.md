---
title: Guitar App PRD
status: draft
created: 2026-05-22
updated: 2026-05-22
---

# PRD: Guitar App *(working title — confirm)*

## 0. Document Purpose

This PRD defines requirements for a guitar fretboard visualization web app. It is written for a solo developer (Voice, who is also the primary user) and guides downstream architecture, epics, and implementation. Features are grouped with FRs nested; assumptions are tagged inline and indexed in §9.

---

## 1. Vision

Guitarists who explore alternate tunings often find themselves lost — chord shapes and scale patterns learned in standard tuning shift in ways that are difficult to visualize mentally. Guitar App solves this by giving players an interactive, real-time fretboard viewer that instantly reflects how any shape or pattern looks in their current tuning.

The product is built first for Voice's own use, but designed cleanly enough that any guitarist who experiments with tunings — from drop tunings to open tunings and beyond — will find it immediately useful. The UI prioritizes clarity above all else: a readable fretboard that gets out of the player's way and shows exactly what they need.

A subscription tier unlocks power-user features — custom tunings, full chord and scale libraries, and chord progressions — at a price point meaningfully below existing competitors.

---

## 2. Target User

### 2.1 Primary Persona

**Voice (the builder)** — a guitarist who regularly plays in multiple tunings and needs a fast, clean reference while practicing. Values an uncluttered UI and wants information surfaced without friction.

### 2.2 Jobs To Be Done

- See how a familiar chord shape or scale pattern maps onto the fretboard in a different tuning, without working it out mentally mid-session.
- Quickly switch between tunings while practicing without breaking focus.
- Mark notes freehand on the fretboard to work out ideas in real time.
- Optionally display note names to support theory work.
- Access a full chord and scale library for reference (Premium).
- Build and step through chord progressions in context of the active tuning (Premium).

### 2.3 Non-Users (v1)

- Musicians on non-guitar instruments.
- Beginners seeking instructional content (lessons, video tutorials, guided exercises).
- Users who need audio playback or tab editing.

### 2.4 Key User Journeys

**UJ-1. Guitarist switches to Drop D and checks how a familiar scale sits.**
- **Persona + context:** Voice is mid-practice, has just retuned to Drop D, needs to see how his minor pentatonic shape maps.
- **Entry state:** Unauthenticated, home page.
- **Path:** Selects Drop D from tuning dropdown → opens Scale Library preview → selects minor pentatonic → fretboard highlights the pattern in Drop D.
- **Climax:** Fretboard immediately shows every note of the pentatonic in Drop D. Clear and readable.
- **Resolution:** Continues playing, adjusts capo position as needed.

**UJ-2. Subscriber creates a custom tuning and explores chord shapes.**
- **Persona + context:** Voice is experimenting with a non-standard open tuning and wants to map chord voicings.
- **Entry state:** Authenticated, active Subscription.
- **Path:** Opens custom tuning creator → inputs per-string pitches → saves tuning → opens Chord Library → selects a chord → fretboard highlights Shape in the custom tuning.
- **Climax:** Chord voicing mapped to the unique tuning in real time. No mental math required.
- **Resolution:** Continues exploring other chord shapes in the same tuning.

**UJ-3. Free user discovers the app and converts to subscriber.**
- **Persona + context:** A guitarist finds the app via search, tries the fretboard and 5 preview scales.
- **Entry state:** Unauthenticated.
- **Path:** Uses fretboard in standard tuning → tries a preview scale → hits paywall prompt on a non-preview scale → sees subscription offer → signs up and pays.
- **Climax:** Full library and custom tunings unlock immediately after payment.
- **Resolution:** Active subscriber with Premium Tier access.

---

## 3. Glossary

- **Fretboard** — The central UI component: a visual guitar neck with strings and frets that reflects the active Tuning and Capo.
- **Tuning** — The set of pitches assigned to each open string (e.g., Standard: E-A-D-G-B-E).
- **Free Tuning** — One of 5–7 predefined Tunings available on the Free Tier (e.g., Standard, Drop D, Open G).
- **Premium Tuning** — Any predefined Tuning outside the Free Tuning set, plus any Custom Tuning. Requires a Subscription.
- **Custom Tuning** — A user-defined Tuning with arbitrary per-string pitches. Premium only.
- **Shape** — A fingering pattern on the Fretboard representing either a Chord Shape or a Scale Pattern.
- **Chord Shape** — A Shape representing a specific chord voicing.
- **Scale Pattern** — A Shape representing all positions of a scale across the Fretboard.
- **Highlight** — The visual state of a fret position that belongs to the active Shape or is manually marked.
- **Freeform Marking** — User-driven manual toggling of Highlights on the Fretboard, independent of any library Shape.
- **Capo** — A device that raises all string pitches; represented as a fret offset that shifts the Fretboard display.
- **Note Name Toggle** — A UI control that shows or hides pitch names at each fret position. Off by default.
- **Chord Library** — A curated collection of Chord Shapes. Full access is Premium; ~5 previews are Free.
- **Scale Library** — A curated collection of Scale Patterns. Full access is Premium; ~5 previews are Free.
- **Chord Progression** — An ordered sequence of chords. Premium only.
- **Free Tier** — The experience available without a Subscription (no account required).
- **Premium Tier** — The experience unlocked by an active Subscription.
- **Subscription** — An annual paid plan granting Premium Tier access.

---

## 4. Features

### 4.1 Interactive Fretboard Viewer

**Description:** The central UI component. Renders a guitar fretboard dynamically reflecting the active Tuning and Capo. Supports two interaction modes simultaneously: select-to-highlight (a Shape from a library is chosen and the fretboard highlights it in the active Tuning) and Freeform Marking (user clicks fret positions to toggle Highlights manually). The Note Name Toggle shows pitch names per fret when enabled. The fretboard is always clean and readable; neither mode clutters the view by default. Realizes UJ-1, UJ-2.

**Functional Requirements:**

#### FR-1: Fretboard Render
The system renders an interactive Fretboard reflecting the active Tuning and Capo position.
**Consequences:**
- Open-string pitch labels reflect the active Tuning.
- Fret positions are numbered; numbers shift correctly when a Capo is set.
- Fretboard updates in < 100ms on any Tuning or Capo change.

#### FR-2: Free Tuning Selection
A user can select any Free Tuning from the predefined free set without an account.
**Consequences:**
- 5–7 Free Tunings are accessible to all users without an account. [ASSUMPTION: Standard, Drop D, Open G, Open E, Open D, DADGAD, Drop C — final list confirmed before build]
- Selecting a Tuning updates the Fretboard and all active Highlights in real time.
- Remaining predefined tunings (beyond the free set) display a paywall prompt in the tuning selector.

#### FR-2b: Premium Tuning Selection
An authenticated Premium user can select any predefined Premium Tuning or any saved Custom Tuning.
**Consequences:**
- All predefined tunings (beyond the 5–7 free set) are available to Premium users. The full predefined set is sourced comprehensively from publicly available guitar tuning references — aiming to cover every named tuning in common use.
- Custom Tunings appear in the same selector alongside predefined tunings.

#### FR-3: Capo Support
A user can set a Capo at any fret position (1–12) or remove it.
**Consequences:**
- Fretboard display shifts to reflect the Capo offset.
- Note names (when visible) update to reflect the capo'd pitches.
- Active Highlights adjust position relative to the Capo.

#### FR-4: Freeform Marking
A user can click or tap any fret position to toggle a Highlight on or off, independent of any library Shape.
**Consequences:**
- Freeform Highlights are visually distinct from library-sourced Highlights. [ASSUMPTION: different color]
- Multiple positions can be highlighted simultaneously.
- Selecting a new library Shape prompts the user before clearing existing Freeform Marks. [ASSUMPTION: confirmation prompt]

#### FR-5: Note Name Toggle
A user can show or hide pitch names on the Fretboard.
**Consequences:**
- Toggle is off by default.
- When on, every fret position displays its pitch name given the active Tuning and Capo.
- Names update in real time on Tuning or Capo change.

#### FR-5b: Fretboard State Persistence
For authenticated users, the app saves and restores fretboard state between sessions.
**Consequences:**
- Active Tuning, Capo position, and Freeform Marks are persisted to the user's account.
- On next visit, the fretboard is restored to the last saved state.
- Unauthenticated users get no persistence (state resets on page load).

**Feature-specific NFRs:**
- Fretboard renders legibly at 375px minimum viewport width (mobile browser support).
- All Highlight and layout updates complete in < 100ms.

---

### 4.2 Chord Library

**Description:** A curated collection of Chord Shapes browsable by chord name and type. Free users see ~5 preview chords; all others show a paywall prompt. Selecting a chord highlights its Shape on the Fretboard in the active Tuning. Realizes UJ-1, UJ-3.

**Functional Requirements:**

#### FR-6: Chord Library Browse
A user can browse the Chord Library by chord name and type.
**Consequences:**
- Free users see [ASSUMPTION: 5 preview chords] labeled as previews; remaining entries show a paywall prompt.
- Authenticated Premium users see the full library.

#### FR-7: Chord Shape Highlight
A user can select a chord to highlight its Shape on the Fretboard in the active Tuning.
**Consequences:**
- Fretboard updates immediately on selection.
- Shape reflects the active Tuning (not hardcoded to standard tuning).
- Selecting a chord clears any active Scale Pattern Highlight. [ASSUMPTION: one active Shape at a time]

---

### 4.3 Scale Library

**Description:** A curated collection of Scale Patterns browsable by scale name and root note. Free users see ~5 preview scales; all others show a paywall prompt. Selecting a scale highlights all positions of the pattern across the Fretboard in the active Tuning. Realizes UJ-1, UJ-3.

**Functional Requirements:**

#### FR-8: Scale Library Browse
A user can browse the Scale Library by scale name and root note.
**Consequences:**
- Free users see [ASSUMPTION: 5 preview scales]; remaining entries show a paywall prompt.
- Authenticated Premium users see the full library.

#### FR-9: Scale Pattern Highlight
A user can select a scale and root note to highlight its full Scale Pattern on the Fretboard.
**Consequences:**
- All positions of the scale are highlighted simultaneously across the Fretboard.
- Pattern reflects the active Tuning.
- Selecting a scale clears any active Chord Shape Highlight.

---

### 4.4 Custom Tunings (Premium)

**Description:** Authenticated Premium users can define Custom Tunings by specifying arbitrary pitches for each string. Saved tunings appear alongside Common Tunings in the tuning selector. Realizes UJ-2.

**Functional Requirements:**

#### FR-10: Custom Tuning Creator
An authenticated Premium user can create a Custom Tuning by specifying a pitch for each string.
**Consequences:**
- UI provides per-string pitch input (note + octave).
- Created tunings are saved to the user's account.
- Custom Tunings appear in the tuning selector alongside Common Tunings.

#### FR-11: Custom Tuning Management
An authenticated Premium user can rename or delete their Custom Tunings.
**Consequences:**
- Deleting an active Custom Tuning reverts the Fretboard to Standard tuning.

---

### 4.5 Chord Progressions (Premium)

**Description:** Authenticated Premium users can build an ordered sequence of chords and step through them, with the Fretboard updating to each chord's Shape in the active Tuning. Realizes UJ-2.

**Functional Requirements:**

#### FR-12: Chord Progression Builder
An authenticated Premium user can create a Chord Progression by adding, reordering, and removing chords from the Chord Library.
**Consequences:**
- Stepping through the progression updates the Fretboard Highlight to each chord's Shape.
- Progressions are saved to the user's account. [ASSUMPTION]

**Notes:**
- [NOTE FOR PM] Auto-advance / tempo playback is a natural v2 follow-on; defer unless it surfaces as blocking during development.

---

### 4.6 Authentication & Subscription

**Description:** User accounts gate Premium Tier access. Registration, login, and subscription management are handled by the Java backend. Subscription is annual only. No account is required for Free Tier use. Realizes UJ-3.

**Functional Requirements:**

#### FR-13: User Registration & Login
A visitor can create an account and log in via Google OAuth or email + password.
**Consequences:**
- Google OAuth is the primary auth method; email + password is also supported.
- Unauthenticated users retain full Free Tier access without an account.

#### FR-14: Subscription Purchase
An authenticated user can purchase an annual Subscription.
**Consequences:**
- Payment processor must support South African bank accounts and ZAR. [ASSUMPTION: PayFast recommended — SA-native, ZAR-native, straightforward integration; Stripe SA is an alternative — confirm during architecture]
- Subscription is priced at $12/yr.
- Premium Tier features unlock immediately on successful payment.
- User receives email confirmation. [ASSUMPTION]

#### FR-15: Subscription Status Enforcement
The app reflects the user's Subscription status and enforces access gates.
**Consequences:**
- Expired or cancelled Subscriptions revert to Free Tier immediately (server-side check).
- Free Tier users see a clear, non-aggressive paywall prompt on Premium features.

---

## 5. Non-Goals (Explicit)

- **No audio playback in v1** — visual reference only; no chord or scale audio preview.
- **No instructional content** — no lessons, tutorials, or guided exercises.
- **No tab or sheet music editor** — reference and visualization only.
- **No native mobile app** — mobile-responsive web covers mobile use cases in v1.
- **No social or sharing features** — no public profiles, shareable fretboard states, or community content in v1.
- **No MIDI input** — no real-time note detection from a connected instrument.
- **No monthly subscription** — annual plan only at launch.

---

## 6. MVP Scope

### 6.1 In Scope

- Interactive Fretboard Viewer — tuning, capo, freeform marking, note name toggle (FR-1 – FR-5)
- Chord Library — free previews + paywall (FR-6, FR-7)
- Scale Library — free previews + paywall (FR-8, FR-9)
- Custom Tunings for Premium users (FR-10, FR-11)
- Chord Progressions for Premium users (FR-12)
- Auth + Annual Subscription management (FR-13 – FR-15)
- React frontend, Java + Maven backend

### 6.2 Out of Scope for MVP

- Audio playback — v2
- MIDI integration — v2+
- Social / sharing features — v2+
- Monthly subscription option — [NOTE FOR PM: revisit if annual-only creates conversion friction]
- Progression auto-advance / tempo playback — v2
- 7-string or 12-string fretboard support — v2+

---

## 7. Success Metrics

**Primary**
- **SM-1:** Voice uses the app during practice sessions weekly or more within 30 days of launch. Validates FR-1 – FR-5.
- **SM-2:** Free-to-paid conversion rate ≥ 10% of registered users within 30 days of signup. Validates FR-3, FR-6, FR-8, FR-13 – FR-15.

**Secondary**
- **SM-3:** Annual subscription churn < 20%.
- **SM-4:** Fretboard render and update latency < 100ms in-browser. Validates FR-1.

**Counter-metrics (do not optimize)**
- **SM-C1:** Do not optimize for session length or page views — the app should help users and get out of their way. A short, effective session is success.

---

## 8. Open Questions

1. Which 5–7 tunings make the Free Tuning set? (Assumed: Standard, Drop D, Open G, Open E, Open D, DADGAD, Drop C — confirm before build.)
2. Payment processor — PayFast vs. Stripe SA; confirm during architecture based on integration complexity with SA bank account.
3. Comprehensive tuning dataset — to be compiled from publicly available sources during build; free vs. premium split applied on top of the full dataset.

---

## 9. Assumptions Index

- **§4.1 FR-2** — Free Tuning set: Standard, Drop D, Open G, Open E, Open D, DADGAD, Drop C (7 tunings); final list confirmed before build.
- **§4.1 FR-4** — Freeform Highlights are visually distinct (different color) from library Highlights; confirmation prompt before clearing on Shape selection.
- **§4.1 Feature NFR** — Fretboard is mobile-responsive (375px minimum width).
- **§4.2 FR-6** — 5 preview chords in Free Tier. ✓ Confirmed.
- **§4.3 FR-8** — 5 preview scales in Free Tier. ✓ Confirmed.
- **§4.2 FR-7** — One active Shape at a time (chord OR scale, not both simultaneously).
- **§4.5 FR-12** — Chord progressions saved to user account.
- **§4.6 FR-13** — Google OAuth + email/password auth. ✓ Confirmed.
- **§4.6 FR-14** — Stripe (or equivalent) handles payment; email confirmation sent on purchase. Price $12/yr. ✓ Confirmed.
- **§4.1 FR-5b** — Fretboard state persistence (tuning, capo, freeform marks) for authenticated users. ✓ Confirmed.
- **§General** — 6-string guitar only in v1. ✓ Confirmed.
- **§Aesthetic** — Dark mode default; light mode available. ✓ Confirmed.

---

## Aesthetic and Tone

- **Visual direction:** Clean, minimal, high-contrast. The Fretboard is the hero — all other UI elements defer to it.
- **Anti-references:** Avoid the visual density of Ultimate Guitar or Guitar Pro. This should feel closer to a focused developer tool than a feature-packed music platform.
- **Color:** [ASSUMPTION: dark mode default, light mode available] Highlights must be high-contrast and legible under dim lighting (a player glancing at a phone screen in a dark room).
- **Typography:** Neutral sans-serif or monospaced for note names; legibility is the sole criterion.
- **UI copy:** Minimal — labels and actions only. No marketing language inside the app interface.

---

## Monetization

- **Free Tier:** No account required. Fretboard + 5–7 Free Tunings + Capo + Freeform Marking + Note Name Toggle + 5 chord previews + 5 scale previews.
- **Premium Tier:** Annual Subscription at **$12/yr**. Unlocks all remaining predefined tunings, Custom Tuning creation, full Chord Library, full Scale Library, Chord Progressions, and fretboard state persistence.
- **Positioning:** Priced below major competitors (Ultimate Guitar Pro ~$40/yr, Chordify ~$60/yr).
- **Paywall UX:** Clear, non-aggressive upgrade prompts. No dark patterns.

---

## Platform

- **v1:** Web app only. Mobile-responsive (phone browsers supported without a native app).
- **Tech:** React frontend; Java + Maven backend (auth, subscription, data).
- **v2+:** Native mobile considered if web adoption warrants it.

---

## Cross-Cutting NFRs

- **Performance:** Fretboard re-renders in < 100ms on any Tuning, Capo, or Shape change.
- **Accessibility:** WCAG 2.1 AA color contrast target for Highlights and note names. [ASSUMPTION]
- **Security:** Passwords hashed (bcrypt or equivalent). Subscription status validated server-side on every authenticated request. Payment handled exclusively by third-party processor (no card data touches the backend).
- **Reliability:** No formal SLA for v1 (solo project, best-effort uptime). [ASSUMPTION]
