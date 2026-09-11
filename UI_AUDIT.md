# UI Audit — Lending process canvas

Date: 2026-09-11
Mode: QUICK UI FIX after visual-system rebuild
App: Accountabul XRPL Academy (`/?lesson=1`)
Stack: React, Vite, Tailwind, Three.js, CSS z-index tokens

## Layout map

```
Application Shell
├── Sticky header (Academy / Lab / Glossary / theme) z=20
└── Main
    └── Academy
        ├── Sidebar (track + lessons) z=10
        └── Main column (one scroll context)
            ├── Lesson title
            ├── Process canvas (~62vh phone / ~82vh desktop)
            │   ├── WebGL scene (ResizeObserver)
            │   ├── CSS world labels z=12
            │   ├── Process HUD (system status + capital + 7 stages) z=15
            │   ├── Role card overlay z=40 (bottom-left, above controls)
            │   └── Compact step controls z=15
            ├── WHO / WHAT / WHY
            └── Lesson copy
```

## What this pass checked

- Overlap of HUD, labels, role card, and Play/Next
- Canvas height vs chrome on short laptops vs tall desktops
- Nested scrollbars
- Role-card field collisions
- Stage-label crowding
- 3D canvas staying inside its parent
