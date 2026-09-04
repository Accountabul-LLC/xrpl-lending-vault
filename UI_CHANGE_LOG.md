# UI Change Log — JRPU Lending Protocol

Layout-engineer pass. No branding, color, or copy rewrite.

## Skill

- Added `skills/ui-layout-engineer/SKILL.md` so future agents can run the same Understand → Inspect → Fix → Test loop.

## Shell

- `src/App.tsx` — flex column shell; sticky header with wrap; `min-w-0`; Lab label shortens on extra-small screens; main uses `max-w-[100rem]` and responsive padding.
- `src/index.css` — overflow-x clip; documented z-index custom properties.
- `src/ui.tsx` — cards and stats constrain width; mono values wrap.

## Academy

- `src/academy/Academy.tsx`
  - Grid: `minmax(13rem,15rem) + minmax(0,1fr)`
  - Compact numbered lesson chips below `lg`; full list sticky at `lg+`
  - Glossary in-flow on lesson 4 (no nested buttons)
  - Roles table contained scroll
  - Underwriting steps use `→` and wrap
  - Sandbox rows truncate/wrap; log has a capped, justified scrollbar
- `src/academy/components/LifecycleTracker.tsx` — removed `min-w-[520px]` / nested overflow-x; flexible stage track.
- `src/academy/components/EntityPanel.tsx` — `min-w-0` and wrapping values.
- `src/academy/components/LifecyclePlayer.tsx` — `min-w-0` on the player chrome.

## Visualization

- `src/academy/pipeline/LendingPipelineCanvas.tsx` — viewport-relative height; clamped overlay labels; frame `ResizeObserver`.
- `src/academy/pipeline/LendingNetworkScene.ts` — `ResizeObserver` on the mount node; canvas max 100%; pixel ratio updated on resize.
- `src/academy/pipeline/SceneMount.tsx` — mount node `min-w-0 overflow-hidden`.
- `src/academy/pipeline/FallbackPipeline.tsx` — tighter spacing; inner scroll only if the diagram exceeds the frame.

## Lab

- `src/lab/DevnetLab.tsx` — stacked input/button rows below `sm`; origination fields `grid-cols-1 sm:grid-cols-3`; wrapping ledger ids and log lines.

## Artifacts

- `UI_AUDIT.md`
- `UI_FINDINGS.md`
- `UI_CHANGE_LOG.md`
- `UI_FINAL_REPORT.md`
- `ui-findings.json`
