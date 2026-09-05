# Performance Test Plan

## Critical
- Three.js is lazy-loaded (`SceneMount` via `React.lazy`)
- Render loop pauses when the tab is hidden
- GPU resources dispose on unmount
- Coin / document transfers stay bounded (≤ 8 packets, cleanup after 24)
- Pixel ratio capped (1.25 small / 1.5 otherwise)
- Canvas size follows the frame (`ResizeObserver`), not a fixed viewport

## Useful
- Reduced-motion skips transfer meshes
- Fallback 2D path still updates from the same lending state
- Lesson/step camera lerps instead of allocating new scenes

## Not applicable
- Database query plans
- API waterfalls
- Unbounded load against XRPL Devnet
