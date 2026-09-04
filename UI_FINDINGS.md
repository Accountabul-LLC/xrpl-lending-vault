# UI Findings — JRPU Lending Protocol

All IDs are stable. Status reflects the layout-engineer pass of 2026-09-04.

---

## UI-001

**Title:** Lesson sidebar stacks as eight large buttons above the visualization  
**Severity:** High  
**Page:** Academy  
**Component:** Lesson navigation  
**Viewport:** 320–1023 × any  
**Browser zoom:** 100%  
**Observed behavior:** Below the `lg` breakpoint the full lesson list rendered as a vertical stack (~400px) before the title, canvas, and copy. On a phone the visualization and Next lesson control sat far below the fold.  
**Expected behavior:** All eight lessons remain reachable without consuming the primary viewport.  
**Root cause:** One layout (`w-full` lesson buttons) was used at every width. The grid only became two columns at `lg` (`1024px`).  
**Fix:** Compact numbered lesson chips that wrap on small screens; keep the full titled list in a sticky sidebar at `lg+` using `minmax(13rem,15rem)` + `minmax(0,1fr)`.  
**Regression tests:** 320, 375, 430, 768, 1024, 1366. Confirm chips wrap, desktop list is complete, no independent sidebar scrollbar.  
**Status:** Resolved

---

## UI-002

**Title:** Application header overflows on narrow viewports  
**Severity:** High  
**Page:** Shell  
**Component:** Top navigation  
**Viewport:** 320 × 568  
**Browser zoom:** 100%  
**Observed behavior:** Title “JRPU Lending Protocol” plus “Academy” and “Live Devnet lab” sat in a non-wrapping flex row and forced horizontal page overflow.  
**Expected behavior:** Product chrome stays on-screen; both destinations remain tappable.  
**Root cause:** `flex items-center justify-between` without `flex-wrap` or a short Lab label; title had no `min-w-0` / truncate.  
**Fix:** Wrapping header, truncated title, subtitle hidden below `sm`, Lab label shortens to “Lab” on extra-small screens.  
**Regression tests:** 320, 375, 430, 768. Confirm no document-level horizontal scrollbar.  
**Status:** Resolved

---

## UI-003

**Title:** Academy workspace was not a constrained grid track  
**Severity:** High  
**Page:** Academy  
**Component:** Shell grid / Three.js canvas  
**Viewport:** 1024–1366 × 768  
**Browser zoom:** 100%  
**Observed behavior:** The visualization could paint over the lesson list. A prior change raised the sidebar to `z-20` instead of correcting track sizing.  
**Expected behavior:** Sidebar and workspace remain separate columns.  
**Root cause:** `lg:grid-cols-[16rem_1fr]` does not force the content track to shrink (`1fr` minimum is `auto`). Canvas / absolute labels could overflow the track.  
**Fix:** `lg:grid-cols-[minmax(13rem,15rem)_minmax(0,1fr)]`, `min-w-0` on workspace, canvas `max-width/height: 100%`. Sidebar stacking uses `--z-sticky-sidebar` only as sticky context, not as an overlap patch.  
**Regression tests:** 1024, 1280, 1366, 1440, 1920 at 100% zoom.  
**Status:** Resolved

---

## UI-004

**Title:** WebGL canvas did not follow container size  
**Severity:** High  
**Page:** Academy  
**Component:** `LendingNetworkScene`  
**Viewport:** All, especially after layout changes without a window resize  
**Browser zoom:** 100%  
**Observed behavior:** Renderer sized only on `window.resize`. If `clientWidth`/`clientHeight` was 0 at construct time, `resize()` returned and never ran again. Grid changes could leave a mismatched drawing buffer.  
**Expected behavior:** Canvas width/height equals the visualization frame.  
**Root cause:** No `ResizeObserver`; `setSize` gated on a one-shot window event.  
**Fix:** Observe the mount node with `ResizeObserver`; keep window resize; re-apply pixel ratio in `resize()`.  
**Regression tests:** Resize across the `lg` breakpoint; reload; fallback path still completes queued animations.  
**Status:** Resolved

---

## UI-005

**Title:** Fixed 520px canvas does not fit a laptop height at 100% zoom  
**Severity:** High  
**Page:** Academy  
**Component:** `LendingPipelineCanvas`  
**Viewport:** 1366 × 768  
**Browser zoom:** 100%  
**Observed behavior:** Header + title + 520px canvas already consumed most of a 768px-tall window. Lesson copy, entity panel, and Next/Previous sat below the fold. Users would need to zoom out to see the teaching layout at once.  
**Expected behavior:** Visualization uses a share of the viewport; lesson chrome stays usable at 100% zoom.  
**Root cause:** `h-[420px] md:h-[520px]` ignored viewport height.  
**Fix:** `h-[min(48vh,420px)]` / `sm` / `lg` caps with `min-h-[220px]`.  
**Regression tests:** 1366×768, 1440×900, 1920×1080, mobile 375×667.  
**Status:** Resolved

---

## UI-006

**Title:** Visualization HTML labels clip at canvas edges  
**Severity:** Medium  
**Page:** Academy  
**Component:** Overlay labels on `LendingPipelineCanvas`  
**Viewport:** 375×667, 768×1024, lesson cameras that push nodes to the rim  
**Browser zoom:** 100%  
**Observed behavior:** Protocol / vault / party labels were placed from projected 3D coordinates. The frame used `overflow-hidden` (needed for rounded corners), so labels were cut off.  
**Expected behavior:** Labels stay inside the visualization region.  
**Root cause:** Absolute positioning with no clamp; overflow hidden used as a visual mask rather than a layout bound.  
**Fix:** Clamp overlay points to the frame size; cap label `max-width`. Do not rely on overflow-hidden as the only defense.  
**Regression tests:** Lessons 0–7; 320, 768, 1280.  
**Status:** Resolved

---

## UI-007

**Title:** Capital lifecycle tracker forced a nested horizontal scrollbar  
**Severity:** Medium  
**Page:** Academy  
**Component:** `LifecycleTracker`  
**Viewport:** < 560px wide  
**Browser zoom:** 100%  
**Observed behavior:** Inner flex row had `min-w-[520px]` plus `overflow-x-auto`, adding a second scrollbar under the page scroll.  
**Expected behavior:** One primary page scroll; stage labels wrap or share width.  
**Root cause:** Timeline assumed a desktop min width instead of a flexible track.  
**Fix:** Remove min-width; `flex-1 min-w-0` connectors; wrapping stage labels.  
**Regression tests:** 320, 375, 768, 1280. Confirm no inner horizontal bar when the page itself does not need one.  
**Status:** Resolved

---

## UI-008

**Title:** Glossary popovers overflowed cards and nested buttons  
**Severity:** Medium  
**Page:** Academy lessons 2 and 4  
**Component:** `Term`  
**Viewport:** `lg` two-column term grid (~200px cells)  
**Browser zoom:** 100% / 150%  
**Observed behavior:** Popover was `w-64` (`256px`) from `left-0`, overlapping the neighboring term card. Lesson 4 wrapped `Term` (a `<button>`) inside another `<button>`. `z-10` sat below the old sidebar `z-20`.  
**Expected behavior:** Definitions stay in-flow or within the card; no nested interactive elements.  
**Root cause:** Overlay tooltip used as a layout device; nested controls.  
**Fix:** Lesson 4 shows `GLOSSARY` in-flow when a term is selected. Remaining `Term` popovers use `--z-popover` and `max-w-[min(16rem,calc(100vw-2rem))]`.  
**Regression tests:** Lesson 2 term clicks; Lesson 4 term grid at 375 and 1280; 150% zoom.  
**Status:** Resolved

---

## UI-009

**Title:** Devnet Lab forms overflow cards  
**Severity:** High  
**Page:** Live Devnet Lab  
**Component:** Cover deposit, origination fields, repayment row  
**Viewport:** 320–640; `md` 2-column cards (~360px)  
**Browser zoom:** 100%  
**Observed behavior:** “Deposit first-loss cover” sat beside an input in `display:flex` without `min-width: 0`, overflowing the card. Origination used `grid-cols-3` at every width. Repayment used the same horizontal flex pattern.  
**Expected behavior:** Inputs and actions remain inside the card; controls stay tappable.  
**Root cause:** Flex/grid children default `min-width: auto`; no stacked breakpoint.  
**Fix:** `flex-col sm:flex-row` for mixed input+button rows; `grid-cols-1 sm:grid-cols-3` for origination; `min-w-0` on inputs.  
**Regression tests:** 320, 375, 768, 1024 Lab view.  
**Status:** Resolved

---

## UI-010

**Title:** Long names and ledger values collide in flex rows  
**Severity:** Medium  
**Page:** Academy sandbox, Entity panel, Lab stats/log  
**Component:** `Stat`, `EntityPanel` `Row`, depositor list  
**Viewport:** Narrow columns, 150–200% zoom  
**Browser zoom:** 100–200%  
**Observed behavior:** `justify-between` rows without `min-w-0` let long wallets, business names, and XRP amounts push siblings.  
**Expected behavior:** Text wraps or truncates; neighbors stay in column.  
**Root cause:** Missing flex min-size constraint and overflow wrap on mono values.  
**Fix:** `min-w-0`, `break-all` / `break-words` / `truncate` as appropriate; sandbox log `max-h-48` (justified activity stream).  
**Regression tests:** Entity panel with depositor selected; sandbox depositor list; Lab stats after vault create.  
**Status:** Resolved

---

## UI-011

**Title:** Parties table still needs contained horizontal scroll on the smallest phones  
**Severity:** Informational  
**Page:** Academy lesson 1  
**Component:** Roles table  
**Viewport:** 320  
**Browser zoom:** 100%  
**Observed behavior:** Four columns cannot remain readable if fully squeezed.  
**Expected behavior:** Table does not force page-level horizontal scroll.  
**Root cause:** Tabular comparison needs a minimum column width.  
**Fix:** Wrapper `overflow-x-auto` + table `min-w-[28rem]` so only the table scrolls.  
**Regression tests:** 320, 375 — page does not shift sideways; table is independently scrollable.  
**Status:** Resolved (accepted contained table scroll)

---

## UI-012

**Title:** Fallback 2D pipeline can still scroll inside the canvas frame  
**Severity:** Low  
**Page:** Academy (WebGL unavailable)  
**Component:** `FallbackPipeline`  
**Viewport:** 320 × short height  
**Browser zoom:** 150%+  
**Observed behavior:** Protocol + vault + two party cards may exceed the viewport-relative canvas height.  
**Expected behavior:** Entities remain reachable without covering lesson controls.  
**Root cause:** Fallback is a stacked diagram inside a height-capped frame.  
**Fix:** Tighter padding/gap; `overflow-y-auto` only when the diagram exceeds the frame (safety valve, not a second page scroller).  
**Regression tests:** Disable WebGL / error boundary; 320 and 768.  
**Status:** Resolved with residual inner scroll only when content exceeds the frame

---

## UI-013

**Title:** Main column left unused width on large desktops  
**Severity:** Low  
**Page:** Shell  
**Component:** `<main max-w-7xl>`  
**Viewport:** 1920 × 1080  
**Browser zoom:** 100%  
**Observed behavior:** Visualization sat in an 80rem column with large empty side gutters while the canvas height stayed 520px.  
**Expected behavior:** Available width used for the network view without going full-bleed.  
**Root cause:** `max-w-7xl` (1280px) plus a height-fixed canvas.  
**Fix:** `max-w-[100rem]` (1600px) and viewport-relative canvas height. Branding unchanged.  
**Regression tests:** 1440, 1600, 1920.  
**Status:** Resolved
