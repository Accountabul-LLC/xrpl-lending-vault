# Integration Report — `cursor/integration-release-fea1`

**Base:** `origin/main` @ `d96fdf4`  
**Date:** 2026-09-05  
**Role:** Merge Conflict & Integration Engineer (`skills/merge-integration-engineer/SKILL.md`)

## Final status

**READY FOR REVIEW** — all merges resolved, no conflict markers, type-check and production build
pass, features from every branch verified in the browser, UI overlap scan clean on both Academy
tracks and the Lab. Main was not touched; this branch is the candidate to fast-forward/merge.

---

## Branches integrated

| Branch | PR | Purpose | Commits incorporated |
| --- | --- | --- | --- |
| `cursor/adaptive-security-skills-370c` | #3 | Application-adaptive Red/Blue/performance skills; original names become aliases | `607d0d3` |
| `cursor/institutional-lending-academy-8df7` | #4 | Second Academy track (Institutional) with `?track=` URL sync | `aa1b0d1` |
| `cursor/ui-layout-engineer-fea1` | #6 | Structural layout fixes: no overlap at 100% zoom, phone/tablet responsiveness, canvas HUD | `3276323`, `8f5153c`, `274d5db` |

Already on main and therefore not re-merged: #1 (`academy-lending-pipeline-aedd`), #2
(`security-skills-aedd`), #5 (`academy-fullwidth-layout-aedd`).

Integration-only commits: `f81f66d` (skill), `c0c2982` (pre-existing overlap fix), reports.

## Merge order and rationale

1. Skills-only branch (#3) — no source overlap with anything else; add/add conflicts with #2's files.
2. Feature branch (#4) — adds the Institutional track and touches `Academy.tsx`/`App.tsx`.
3. UI branch (#6) — layout fixes applied last so they land on the combined structure (main's
   full-width shell + the new track), then re-verified.

## Conflicts

- **Textual conflicts:** 10 files across three merges — all resolved (see `MERGE_CONFLICT_REPORT.md`
  MERGE-001 … MERGE-010).
- **Semantic conflicts (Git-clean but incompatible):** 3 found and fixed —
  - MERGE-011: Institutional shell written against the pre-full-width layout;
  - MERGE-012: sticky header and aside sharing z-index 20;
  - MERGE-013: `min-h-0` viz grid in a fixed-height scroll column caused content spill (pre-existing on main).
- **Dependency / schema / API conflicts:** none. `package.json`, lock file, Vite/Tailwind/TS configs
  are identical to main. No database, no server API.

## Resolution principles applied

- No conflict resolved by wholesale OURS/THEIRS except MERGE-001, where THEIRS is the declared
  intent of #3 and the only unique content on the losing side (vault "impossible states") was
  preserved in the adaptive shared module.
- Where main and #6 disagreed on sizing, both intents were kept by breakpoint (canvas: phone sizes
  from #6, desktop size from main; lesson nav: chips below `lg`, main's rail at `lg+`).
- #6's `max-w-[100rem]` app shell was not applied: main had already made the Academy full-width
  and intentionally kept the Lab at `max-w-7xl`.

## Build result

```
tsc -b            → exit 0
vite build        → ✓ built (index 811 kB, SceneMount 547 kB lazy chunk, css 26.8 kB)
```

Chunk-size warning is pre-existing (Three.js); the scene remains a separate lazy chunk.

## Tests executed

The repository defines no unit-test or lint script (`build` = `tsc -b && vite build`). Validation
used the type-checker, the production build, and browser automation against the dev server:

| Check | Scope | Result |
| --- | --- | --- |
| Type check | whole repo | pass |
| Production build | whole repo | pass |
| Overlap / clipping / horizontal-overflow scan | Basic L1/L4/L8, Institutional L1/L4/L8, Lab × 320, 375, 430, 768, 1024, 1280, 1366, 1440, 1920 × unscrolled + scrolled 140px | **0 hits** |
| Real-zoom-equivalent viewports (125% / 150% / 200% of 1366×768 → 1093×614, 911×512, 683×384) | same 7 pages | **0 hits** |
| Sticky-header paint order (`elementFromPoint` at header/aside intersection while scrolled) | all pages/viewports | header always on top |
| Same scan against `origin/main` (control) | same matrix | 31 hits: roles-panel vs Previous/Next/Close overlaps at 1024–1440, projected canvas labels clipped by the stage frame at 320px (up to 66px), 54px Lab overflow at 320 — all absent on the integration branch |

## Feature verification (Phase 15 checklist)

**Adaptive security skills (#3)**
- ✓ `adaptive-red-team`, `adaptive-blue-team`, `adaptive-red-blue-cycle`, `adaptive-performance-engineer` present
- ✓ `red-team-security`, `blue-team-security`, `red-blue-security-cycle` are alias stubs pointing at the adaptive skills
- ✓ shared references present; vault impossible-states checklist retained in `modules.md`

**Institutional Lending track (#4)**
- ✓ Basic | Institutional toggle switches tracks; URL gains/loses `track=institutional`
- ✓ "Institutional Lending" link (now in the Advanced-roles panel) opens Institutional lesson 1
- ✓ Institutional lesson rail and Next/Previous work; URL `lesson=N` syncs
- ✓ Returning to Basic restores lesson 1 with the 3D pipeline
- ✓ Reduce-motion checkbox present on both tracks; `inst-*` CSS retained

**UI layout (#6)**
- ✓ Zero overlaps at every tested viewport, including the combined layouts #6 never saw
- ✓ No horizontal page overflow anywhere (was 54px on the Lab at 320px on main)
- ✓ Lifecycle tracker has no nested horizontal scrollbar; chips on phones
- ✓ Canvas HUD (`data-viz-hud`) renders; ResizeObserver frame present
- ✓ Glossary terms expand as in-flow `role="note"`; lesson-4 term cards show definitions inline
- ✓ Numbered lesson chips (8, `aria-current`) below `lg`; titled rail at `lg+`
- ✓ Lab forms stack below `sm`; header shows "Lab" on phones

**Main's full-width workstation (#5, preserved)**
- ✓ Academy uses full desktop width; Lab remains `max-w-7xl`
- ✓ Compact rail shows all eight lessons without scrolling at `lg+`
- ✓ Roles panel beside the stage at `xl+`; entity inspector sticky beside lesson copy
- ✓ Desktop stage keeps `min(58vh, 640px)`

## Security verification

No branch changed authentication, authorization, wallet signing, or the Devnet lab's XRPL
transaction paths (`src/lab/DevnetLab.tsx` received layout-only class changes; handlers unchanged).
Security skills were replaced by their generalized successors as intended by #3; nothing was removed
to make a merge pass.

## Performance verification

- Three.js scene still loaded via `lazy(() => import('./SceneMount'))` — separate chunk in the build.
- No new dependencies. Institutional track adds ~2.2k lines of static React, reflected in the main
  chunk: 750 kB → 811 kB minified (226 kB → 241 kB gzip); CSS 4.9 kB → 6.1 kB gzip. The Three.js
  chunk is unchanged (547 kB). If this matters, `Institutional` is a natural `lazy()` boundary.
- ResizeObserver-driven canvas sizing from #6 retained (no per-frame layout reads).

## Files changed vs main that are not attributable to a branch

- `skills/merge-integration-engineer/SKILL.md` — new skill (this engagement).
- `src/academy/components/LessonNav.tsx` — extracted so both tracks share one lesson rail (MERGE-010/011).
- `src/academy/institutional/Institutional.tsx` — shell aligned with main's workstation (MERGE-011).
- `src/academy/Academy.tsx` `shrink-0` on the two content grids (MERGE-013).
- `skills/adaptive-security-shared/references/modules.md` — vault checklist preserved (MERGE-001).
- `UI_CHANGE_LOG.md`, `UI_FINAL_REPORT.md` — integration notes pointing here.
- `MERGE_CONFLICT_REPORT.md`, `INTEGRATION_REPORT.md` — this documentation.

## Remaining concerns

1. **Desktop workspace scrolls internally.** Main's design (#5) fixes the Academy height at `lg+`
   and scrolls the workspace column, while the rail stays put. With the MERGE-013 fix the column now
   scrolls where it previously overlapped. This is main's intended behaviour, but it is a nested
   scrollbar; if the team prefers a single page scroll, drop `lg:h-[calc(100vh-3.25rem)]` and
   `lg:overflow-auto` in `AcademyInner` (both tracks would then match).
2. **Stale UI reports.** `UI_AUDIT.md`, `UI_FINDINGS.md`, `ui-findings.json` describe the #6 branch
   state; they carry an integration note but were not rewritten.
3. **PRs #3, #4, #6** should be closed as superseded once this branch merges (their content is fully
   contained here), or rebased if the team prefers to merge them individually — in which case the
   conflict resolutions above are the reference.
4. **Bundle size** warning (>500 kB) is pre-existing and unchanged in nature.

## Recommendation

Merge `cursor/integration-release-fea1` into `main` (merge commit or fast-forward). Do not merge
#3, #4, or #6 directly on top afterwards — they would re-introduce the conflicts resolved here.
