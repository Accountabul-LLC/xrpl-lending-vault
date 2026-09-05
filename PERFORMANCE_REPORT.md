# Performance Report

Persona: WebGL / Rendering Performance Engineer

## Baseline (code + runtime)

- Three.js enters through `React.lazy(() => import('./SceneMount'))`
- Render loop uses `THREE.Timer`, skips ticks while `document.visibilityState !== 'visible'`, and `dispose()` releases geometries, sprite textures, and the renderer
- Pixel ratio is capped (1.25 on small frames, 1.5 otherwise)
- Transfer packets are coins/documents (3–8), not unbounded cubes; leftover packets are disposed on lesson change
- Canvas size follows the frame via `ResizeObserver`

Browser check on localhost:5173 loaded the 3D world (not the 2D fallback). Play advanced steps without the tab locking up.

Chrome DevTools MCP (`performance_start_trace`) is not configured in this environment, so Core Web Vitals numbers are not claimed here.

## Changes

- Removed always-on pipe pulse meshes (constant extra draw + emissive work)
- Idle motion is a small vertical bob on people only
- Particle cleanup on lesson change prevents sprite/mesh leaks across playbacks

## Correctness

- 2D fallback still hydrates the same lending state if WebGL fails
- Reduced-motion skips packet meshes and applies balances immediately
- Unit tests cover vault fill, loan funding, and principal/interest split

## Follow-ups

- Capture Lighthouse / DevTools trace on a target laptop GPU if frame time needs a numeric SLA
