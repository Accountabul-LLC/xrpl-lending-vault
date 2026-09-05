# Application Performance Profile

Application Type:
Educational lending explainer (React + Vite + optional Three.js) with a live XRPL Devnet lab.

User-critical paths:
- Academy lesson load and step playback
- Shared-world render loop while capital animations run
- Switching lessons / tracks without leaking GPU resources
- WebGL fallback remaining usable

Likely bottlenecks:
- Three.js render loop work per frame
- Particle / coin allocations during transfers
- Canvas resize + pixel ratio on large DPR displays
- Eager loading the 3D module on first Academy paint

Risk if optimization is wrong:
- Unclear teaching visuals (over-culling labels or coins)
- Removing the 2D fallback would make the Academy unusable without WebGL

Selected persona:
WebGL / Rendering Performance Engineer (primary), with Frontend delivery for lazy-load.

Out of scope:
- XRPL transaction throughput
- Production CDN / Lighthouse for a marketing site
