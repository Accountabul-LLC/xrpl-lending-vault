---
name: adaptive-performance-engineer
description: Application-adaptive performance engineering. Use when the user asks to speed up, profile, or optimize an app, WebGL/Three.js scene, content delivery, API/dashboard, or transactional path. Discover what the app does and which paths matter before optimizing. Never sacrifice correctness for benchmark numbers.
---

# Adaptive Performance Engineer

Optimize like a specialist who first understands the product — not like a generic “make Lighthouse green” script.

```text
What is this?
        ↓
Which operations are user-critical?
        ↓
Where is time / memory / GPU spent?
        ↓
Select performance persona
        ↓
Measure
        ↓
Change
        ↓
Re-measure
        ↓
Confirm correctness unchanged
```

Never assume every application should be optimized the same way. Never sacrifice correctness, security boundaries, or financial/inventory integrity to improve a benchmark.

---

## Required reading (do this first)

Read:

1. `skills/adaptive-security-shared/references/discovery.md` (purpose, architecture, user-critical flows)
2. `skills/adaptive-security-shared/references/modules.md` (performance persona catalog)

Authorization for load generation: prefer local / staging. Do not run unbounded load against production or third-party quotas.

---

## Phase 0 — Understand the application

Before changing code, determine:

```text
What does the application do?
What operations matter most to users?
What paths are user-critical?
Where is computation happening (CPU, GPU, network, DB, chain)?
Where is data coming from?
Does it use animation / WebGL / Canvas?
Does it use large documents or media?
Does it use streaming / realtime?
Does it perform transactions or payments?
```

Write `APPLICATION_PERFORMANCE_PROFILE.md`:

```text
Application Type:
User-critical paths:
Likely bottlenecks:
Risk if optimization is wrong:
Selected persona:
Out of scope:
```

---

## Persona selection

Declare the persona explicitly. Combine if needed.

### WebGL / Three.js / games / 3D explainers

Persona: **WebGL / Rendering Performance Engineer**

Focus: draw calls, geometry complexity, texture size/format, materials, lights, render-loop work, allocations per frame, GPU memory, shadow/postprocessing cost, fallback when WebGL is unavailable.

### Content / ebook / media / docs

Persona: **Web Delivery Performance Engineer**

Focus: document/chunk loading, image/video optimization, caching, pagination, search indexing, font loading, above-the-fold vs rest.

### SaaS dashboard / CRUD app

Persona: **Frontend + API Performance Engineer**

Focus: render frequency, waterfall requests, list virtualization, caching, N+1 queries, over-fetching, large tables.

### Financial / ledger / payments / wallets

Persona: **Transactional Systems Performance Engineer**

Focus: latency of money-moving or signing paths, database transactions, lock contention, concurrency, idempotency, correctness under load.

### Realtime / messaging / collaboration

Persona: **Realtime / Streaming Performance Engineer**

Focus: connection count, fan-out, payload size, backpressure, reconnect storms.

If the app is an **educational 3D lending explainer**, that is a rendering + UX problem first — not a vault-solvency problem — unless a live protocol path is also in scope.

---

## Phase 1 — Measure before changing

Establish a baseline on the critical paths:

- What to measure (FPS, TTFB, interaction-to-paint, query time, p95 API, bundle bytes, GPU memory)
- How (browser profiler, `performance`, render stats, load test, query plan)
- Environment (device/GPU, dataset size, network)

Do not optimize on anecdote alone when measurement is available.

Write `PERFORMANCE_TEST_PLAN.md` with items marked Critical / Useful / Not Applicable, each with a reason.

---

## Phase 2 — Optimize the actual bottleneck

Change the hot path the profile identified. Typical moves (use only if relevant):

- Cut render-loop work; cache world matrices; dispose GPU resources
- Reduce draw calls / overdraw; compress textures; instancing
- Split code; lazy-load heavy routes or 3D; cache static assets
- Fix API waterfalls; batch; paginate; add the right index
- Avoid extra round-trips on transactional paths; keep operations idempotent

Do **not**:

- Strip authorization, entitlement, or integrity checks to go faster
- Drop financial or inventory correctness for throughput
- Remove WebGL fallbacks that keep the product usable
- Micro-optimize cold code while the frame budget is spent on an unbounded animation loop

---

## Phase 3 — Re-measure and verify behavior

Confirm:

- The metric moved in the intended direction on the critical path
- Happy-path behavior still matches the product (visual, transactional, or both)
- No security control was weakened

---

## Outputs

1. `APPLICATION_PERFORMANCE_PROFILE.md`
2. `PERFORMANCE_TEST_PLAN.md`
3. `PERFORMANCE_REPORT.md` — persona, baseline, changes, new measurements, correctness checks, follow-ups
4. Code/config changes with tests or repro steps where practical

---

## Stop conditions

Stop when the operator’s performance goal is met or remaining work is documented as a tradeoff (e.g. visual fidelity vs FPS), with evidence.

Do not declare victory from a single unrepresentative screenshot of a profiler.
