# UI Audit — JRPU Lending Protocol

**Mode:** Deep UI audit  
**Date:** 2026-09-04  
**Scope:** Academy and Live Devnet Lab (React + Vite + Tailwind + Three.js)  
**Zoom:** 100% unless noted  
**Rule:** Diagnose the layout model first. Do not redesign branding, color, type, or product hierarchy.

---

## Phase 1 — Application understanding

| Area | Finding |
|---|---|
| Framework | React 18 + TypeScript + Vite 5 |
| Component library | None (custom `Card`, `Stat`, `Btn` in `src/ui.tsx`) |
| CSS | Tailwind 3 utility classes + small global CSS in `src/index.css` |
| Responsive system | Tailwind defaults: `sm` 640, `md` 768, `lg` 1024 |
| Breakpoints in use | `sm`, `md`, `lg` — no `xl`/`2xl` layout rules |
| Application shell | `App.tsx`: top nav + `<main>` |
| Header | Product title + Academy / Lab switcher |
| Sidebar | Academy lesson list only (Lab has none) |
| Footer | None |
| Modal system | None |
| Dropdown / overlay | Glossary `Term` popovers; no portal |
| Page container | `<main className="p-6 max-w-7xl mx-auto">` (before fix) |
| Max-width | 80rem (`max-w-7xl`) centered |
| Overflow | Body unconstrained; canvas `overflow-hidden`; one table and lifecycle tracker used nested `overflow-x-auto` |
| Fixed / sticky | None in the shell before fix; canvas labels `position: absolute`; sidebar `relative z-20` |
| Z-index | Ad hoc (`z-10` popover, `z-20` sidebar). No scale. |
| Visualization | Three.js `WebGLRenderer` in a fixed-height frame; window `resize` only (no `ResizeObserver`) |

---

## Phase 2 — Page layout map

```text
Application Shell (min-h-screen)
├── Header (title + Academy / Lab)
└── Main (max-w-7xl, padding 24px)
    ├── Academy
    │   ├── Sidebar 16rem (lg+) or stacked full-width lesson list (< lg)
    │   └── Workspace (min-w-0)
    │       ├── Lesson title
    │       ├── Pipeline canvas (420 / 520px fixed height)
    │       │   ├── Three.js canvas or 2D fallback
    │       │   ├── Absolute HTML labels
    │       │   └── Status banner
    │       ├── Lifecycle tracker (min-width 520px + overflow-x)
    │       ├── Copy + Entity panel (1fr + 18rem at lg)
    │       └── Previous / Next
    └── Lab
        ├── Wallet cards
        └── 2-column card grid (Vault, Loan book, Originate, Repayment)
            └── Activity log (max-h-64 overflow-y)
```

### Dimension owners (before)

| Region | Width | Height | Overflow |
|---|---|---|---|
| Shell | 100vw | min 100vh | none |
| Main | min(100% - 48px, 80rem) | auto | none |
| Academy grid | `16rem` + `1fr` at lg | auto | sidebar `z-20` over neighbors |
| Canvas | 100% of workspace | 420px / 520px | hidden |
| WebGL canvas | `setSize(root)` on window resize only | same | CSS 100% |
| Lifecycle tracker inner | min 520px | auto | overflow-x-auto |
| Entity panel | 18rem at lg | auto | none |
| Lab forms | `grid-cols-3` / `flex` without `min-width: 0` | auto | can overflow card |

---

## Phase 3–19 — Scan summary

Highest-impact defects (full records in `UI_FINDINGS.md`):

1. **UI-001** Academy lesson nav consumes an entire mobile viewport before the visualization.
2. **UI-002** Header and Lab button overflow small widths; no wrap.
3. **UI-003** Workspace column not `minmax(0,1fr)`; canvas could paint over the lesson list (previous `z-20` was a stacking patch).
4. **UI-004** Three.js canvas ignored container resize and could mount at 0×0.
5. **UI-005** Visualization height 520px plus chrome does not fit a 768px-tall laptop at 100% zoom.
6. **UI-006** HTML labels and the vault card clip at canvas edges.
7. **UI-007** Lifecycle tracker forced a nested horizontal scrollbar.
8. **UI-008** Glossary popovers used a fixed 16rem width and nested buttons.
9. **UI-009** Lab origination / cover / repayment controls overflow cards on small screens.
10. **UI-010** Long mono values and names had no `min-width: 0` / wrap.

---

## Layout model after fix

```text
Application Shell (flex column, overflow-x clip)
├── Sticky header (z 20, wrapping nav)
└── Main (max-w 100rem, responsive padding, min-w-0)
    ├── Academy grid
    │     minmax(13rem, 15rem) + minmax(0, 1fr)   [lg+]
    │     compact numbered lesson chips            [< lg]
    │   └── Workspace
    │       ├── Canvas height = min(viewport fraction, cap)
    │       │     ResizeObserver + clamped labels
    │       ├── Lifecycle tracker sharing remaining width
    │       └── minmax(0,1fr) + minmax(14rem, 18rem)
    └── Lab cards with stacked controls below sm
```

Z-index scale:

```text
Base content         0
Sticky sidebar      10
Canvas banner       15
Sticky header       20
Dropdown            30
Popover             40
```

---

## Stop-condition checklist

| Criterion | Status |
|---|---|
| Identified overlaps resolved | Yes (see findings) |
| No critical content clipped | Yes after canvas clamp + overflow containment |
| Core controls accessible | Header, lessons, Prev/Next, Lab actions |
| Standard desktops work at 100% zoom | Canvas height now viewport-relative |
| Responsive layouts checked | 320–1920 widths; 768 / 900 / 1080 heights |
| Unnecessary nested scrollbars removed | Lifecycle tracker no longer forces overflow-x |
| Remaining issues documented | UI-011 (informational), UI-012 (low) |
