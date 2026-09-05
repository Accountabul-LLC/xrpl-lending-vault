# Merge Conflict Report — integration of skill branches into `cursor/integration-release-fea1`

**Base:** `origin/main` @ `d96fdf4` (Widen Academy into a full desktop learning workspace)  
**Integration branch:** `cursor/integration-release-fea1`  
**Date:** 2026-09-05

Merge order (dependency-driven): skills-only branch first, then the feature branch, then the
UI branch, so layout fixes were applied on top of the combined structure rather than under it.

| Step | Branch | PR | Commits | Textual conflicts |
| --- | --- | --- | --- | --- |
| 1 | `cursor/adaptive-security-skills-370c` | #3 | `607d0d3` | 3 files (add/add) |
| 2 | `cursor/institutional-lending-academy-8df7` | #4 | `aa1b0d1` | 2 files |
| 3 | `cursor/ui-layout-engineer-fea1` | #6 | `3276323`, `8f5153c`, `274d5db` | 5 files |

Every conflict is recorded below. Semantic (Type H) conflicts that Git did not flag are included.

---

## MERGE-001

**Files:** `skills/red-team-security/SKILL.md`, `skills/blue-team-security/SKILL.md`,
`skills/red-blue-security-cycle/SKILL.md`  
**Branches:** `main` (from #2) vs `cursor/adaptive-security-skills-370c` (#3)  
**Type:** A / add-add (both sides created the same paths independently)

**Branch A intent (main):** Full lending-vault-specific Red/Blue/cycle playbooks.  
**Branch B intent (#3):** Generalize the methodology into `adaptive-*` skills and turn the three
original names into alias stubs that redirect to the adaptive playbooks. The PR body states it
supersedes #2's files.

**Resolution:** THEIRS for the three alias files — the replacement is the declared intent, and the
adaptive `FINANCIAL`/`BLOCKCHAIN` modules were checked to cover the vault case (capacity, position
ownership, self-approval, yield double-claim, admin fund movement, wallet binding/replay).
One concrete artifact existed only in the superseded playbooks — the vault "impossible states"
checklist — so it was carried into
`skills/adaptive-security-shared/references/modules.md` under the lending-vault section (COMBINE).

**Validation:** No conflict markers; all 4 adaptive skills + 3 aliases + shared references present.  
**Status:** Resolved.

---

## MERGE-002

**File:** `src/App.tsx` (header subtitle)  
**Branches:** `main` (#5) vs `cursor/institutional-lending-academy-8df7` (#4)  
**Type:** A (textual)

**Branch A intent:** Compact header sizing (`text-sm lg:text-base`, `text-[11px]`).  
**Branch B intent:** Subtitle copy "Basic and institutional lending academy" to reflect two tracks.

**Resolution:** COMBINE — main's sizing classes with the branch's subtitle text.  
**Status:** Resolved.

---

## MERGE-003

**File:** `src/academy/Academy.tsx` (lesson 0 body)  
**Branches:** `main` (#5) vs `cursor/institutional-lending-academy-8df7` (#4)  
**Type:** B / C (structural + delete/modify)

**Branch A intent:** Replace the lesson-0 `<details>` "Advanced Lending Roles" block with the
`AdvancedRolesPanel` side panel next to the visualization.  
**Branch B intent:** Add an "Institutional Lending" link inside that `<details>` block, plus an
`onOpenInstitutional` prop on `LessonCopy`.

**Resolution:** REWRITE — the `<details>` block stays removed (main), and the link is relocated
into `AdvancedRolesPanel`'s description, which now receives `onOpenInstitutional`. The unused
`LessonCopy` prop was dropped. Behavior preserved: the link switches to the Institutional track
(`?track=institutional`).

**Validation:** Playwright: clicking "Institutional Lending" in the roles panel opens Institutional
lesson 1 and the URL gains `track=institutional`.  
**Status:** Resolved.

---

## MERGE-004

**File:** `src/academy/Academy.tsx` (sidebar / workspace shell)  
**Branches:** `main` (#5) vs `cursor/institutional-lending-academy-8df7` (#4)  
**Type:** B (structural)

**Branch A intent:** Full-width workstation shell with compact lesson rail and side panels.  
**Branch B intent:** Insert `TrackToggle` (Basic | Institutional) at the top of the old sidebar.

**Resolution:** COMBINE — main's shell kept; `TrackToggle` replaces the rail's static
"JRPU Lending Academy" label (the toggle renders that label itself).  
**Status:** Resolved.

---

## MERGE-005

**File:** `src/App.tsx`  
**Branches:** integration (main + #4) vs `cursor/ui-layout-engineer-fea1` (#6)  
**Type:** A / B

**Branch A intent:** Academy `<main>` is full-width with tight padding; Lab keeps `max-w-7xl`.  
**Branch B intent:** Sticky header with z-index token, `min-w-0`, title truncation, subtitle hidden
below `sm`, `Lab` short label, `max-w-[100rem]` for the whole app, responsive padding.

**Resolution:** COMBINE — sticky header + tokens + truncation + short label from #6; the
view-conditional `<main>` classes from main (Academy full-width, Lab `max-w-7xl`) with #6's
`min-w-0` and responsive padding added. #6's `max-w-[100rem]` was **not** applied because main
had already made the Academy full-width and deliberately kept the Lab at `7xl`.  
**Status:** Resolved.

---

## MERGE-006

**File:** `src/index.css`  
**Branches:** main vs #6  
**Type:** A

**Resolution:** COMBINE — both rule sets kept: `min-height: 100%` on `html/body/#root` and the
`.academy-shell > aside` rule (main); z-index custom properties, `overflow-x: clip`, `#root { min-width: 0 }` (#6); `inst-*` keyframes (#4) were auto-merged.  
**Status:** Resolved.

---

## MERGE-007

**File:** `src/academy/components/LifecycleTracker.tsx`  
**Branches:** main vs #6  
**Type:** B

**Branch A intent:** Tighter vertical padding (`py-2`, `mb-1.5`), still `overflow-x-auto` + `min-w-[520px]`.  
**Branch B intent:** Remove the nested horizontal scrollbar: wrapped chips below `sm`, flexible
`flex-1 min-w-0` timeline at `sm+`.

**Resolution:** COMBINE — #6's structure with main's compact padding.  
**Status:** Resolved.

---

## MERGE-008

**File:** `src/academy/pipeline/LendingPipelineCanvas.tsx` (frame sizing)  
**Branches:** main vs #6  
**Type:** A

**Branch A intent:** Larger desktop stage: `h-[min(58vh,640px)] min-h-[360px]`.  
**Branch B intent:** Phone-safe stage: `min-h-[220px] h-[min(48vh,420px)] sm:… lg:h-[min(56vh,520px)]`,
plus `ref`/`data-viz-frame` for the ResizeObserver-driven HUD.

**Resolution:** COMBINE — `min-h-[220px] h-[min(48vh,420px)] sm:h-[min(52vh,480px)] lg:min-h-[360px] lg:h-[min(58vh,640px)]`
with the `ref` and data attribute. Desktop gets main's size; phones get #6's.  
**Status:** Resolved.

---

## MERGE-009

**File:** `src/academy/Academy.tsx` (lesson 0 roles table)  
**Branches:** main vs #6  
**Type:** B

**Branch A intent:** Replace the 4-column roles table with three clickable role cards.  
**Branch B intent:** Fix the table's clipping on phones by stacking it into cards below `sm`.

**Resolution:** OURS (main) — the role cards already stack on phones and select the entity; #6's
table fix targets markup that no longer exists. No functionality lost.  
**Status:** Resolved.

---

## MERGE-010

**File:** `src/academy/Academy.tsx` (`AcademyInner` layout)  
**Branches:** main (+#4) vs #6  
**Type:** B (structural, three-way)

**Branch A intent:** Fixed-height desktop workstation (`h-[calc(100vh-3.25rem)]`), compact titled
rail, side panels for roles and entity inspector, workspace scrolls internally at `lg+`.  
**Branch B intent:** Numbered lesson chips below `lg` so the rail does not push the stage off a
phone screen; `min-w-0` everywhere; `break-words` title; sidebar stacking token.

**Resolution:** REWRITE — main's shell is authoritative; #6's fixes applied inside it:
- new shared `src/academy/components/LessonNav.tsx`: chips below `lg`, main's compact rail at `lg+`
  (used by both Basic and Institutional so navigation is identical across tracks);
- fixed height only at `lg+` (`lg:h-… lg:min-h-…`) so phones use natural page flow;
- aside uses `z-[var(--z-sticky-sidebar)]` (see MERGE-012);
- `min-w-0` / `break-words` on header, columns and entity column.

**Validation:** Overlap scan, both tracks, 9 viewports × top/scrolled: 0 hits.  
**Status:** Resolved.

---

## MERGE-011 (semantic)

**Files:** `src/academy/institutional/Institutional.tsx`  
**Branches:** #4 vs main/#6  
**Type:** H (no textual conflict)

**Issue:** The Institutional shell was authored against the old `grid lg:grid-cols-[16rem_1fr] gap-6`
sidebar and the `max-w-7xl` main. After main went full-width and #6 introduced phone chips, the
two tracks would have had different navigation and different desktop widths, and the Institutional
aside kept `z-20`.

**Resolution:** Same shell classes and `LessonNav` as the Basic track; sticky aside at `lg+`
(`lg:sticky lg:top-16 lg:self-start`) since Institutional lessons are long-form and page-scroll;
sidebar z token; compact header typography to match.  
**Status:** Resolved.

---

## MERGE-012 (semantic)

**Files:** `src/App.tsx`, `src/academy/Academy.tsx`, `src/academy/institutional/Institutional.tsx`  
**Branches:** main (`aside … z-20`) vs #6 (sticky header `z-[var(--z-sticky-header)]` = 20)  
**Type:** H

**Issue:** Git merged cleanly, but a sticky header at z 20 and a later-in-DOM aside also at z 20
means the aside would paint over the header when scrolled on phones.

**Resolution:** Asides use `--z-sticky-sidebar` (10). Verified with an `elementFromPoint` check at
the header/aside intersection while scrolled: header always on top.  
**Status:** Resolved.

---

## MERGE-013 (semantic, pre-existing on main)

**File:** `src/academy/Academy.tsx` (visualization grid)  
**Type:** H — surfaced by the integration UI scan, reproduced on `origin/main`

**Issue:** Inside the fixed-height `lg:overflow-auto` workspace the visualization grid had `min-h-0`,
so flex shrinking compressed it and its content spilled onto the row below: Advanced-roles buttons
overlapped Previous/Next at 1024×768 and the entity panel's Close button at 1280–1440px.

**Resolution:** Both content grids are `shrink-0`; the workspace column scrolls instead of
overlapping. Committed separately (`c0c2982`) so it is reviewable on its own.  
**Status:** Resolved.

---

## Summary

| Type | Count | Resolutions |
| --- | --- | --- |
| A textual | 4 | 3 COMBINE, 1 THEIRS (declared supersession, content preserved) |
| B structural | 5 | 3 COMBINE, 1 REWRITE, 1 OURS |
| C delete/modify | 1 | REWRITE (link relocated) |
| H semantic | 3 | all fixed on the integration branch |
| E/F/G | 0 | no dependency, schema, or API changes in any branch |

No conflict was resolved by dropping a branch's functionality, and no security- or performance-
relevant code was touched by any branch (skills only; Three.js chunk still lazy-loaded).
