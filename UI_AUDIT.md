# UI Audit — Academy overlap pass

Date: 2026-09-11
Mode: QUICK UI FIX (overlap, overflow, chrome, canvas labels)
App: JRPU Lending Academy (`/?lesson=1`)
Stack: React, Vite, Tailwind, Three.js, custom CSS variables for z-index

## Layout map

```
Application Shell (#root)
├── Sticky header (Academy / Live Devnet lab) z=20
└── Main
    ├── Academy
    │   ├── Sidebar (lesson list) z=10
    │   └── Main column
    │       ├── Lesson title
    │       ├── Step controls (Play / Previous / Next)
    │       ├── View legend (orbit / zoom / pan)
    │       ├── 3D canvas
    │       │   ├── WebGL scene
    │       │   ├── CSS world labels z=12
    │       │   └── Stats HUD z=15
    │       ├── Lifecycle tracker
    │       ├── WHO / WHAT / WHY
    │       ├── Lesson copy + entity panel
    │       └── Previous lesson / Next lesson
    └── Lab (not the primary defect surface this pass)
```

## What was broken

The people-and-vault world was in place, but the **labeling and height model** still behaved like a node graph HUD:

- 3D canvas sprites were huge relative to the close camera, so “Depositor / Lender” and “Borrower” clipped at the canvas overflow.
- Protocol Office, Vault rules, Lending Vault, and Administrator sprites stacked on the vault.
- `h-[min(56vh,560px)]` plus `lg:min-h-[440px]` plus `lg:h-[100vh]` plus `overflow: hidden` made the scene cover Previous/Next on 1366×768.
- Phone camera stayed close, so people were cut off at the sides.

## Approach

Do not restyle the product. Fix the layout model:

1. CSS HUD labels, clamped inside the canvas, collision-separated, reserved space under the stats chip.
2. One page scroll on short laptops; fill-height only when `min-height: 900px` and `min-width: 1024px`.
3. Farther camera under 700px wide.
