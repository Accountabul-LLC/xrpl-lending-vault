# Lending Academy — Gap Analysis (v2)

The Academy’s job is to teach the lending lifecycle. Three.js is only the presentation layer.

## Intended experience

A new user should be able to watch one shared world and answer:

- Who creates / configures the vault?
- Who deposits, and where does the money go?
- Who borrows, who reviews, and where loan capital comes from?
- What the borrower agrees to
- How principal and interest return separately
- How that becomes vault yield / depositor benefit
- What happens if a payment is missed
- How advanced institutional roles sit around the same transaction

## Current experience (before v2)

The scene is a node graph: octahedron (protocol), box (vault), sphere (depositor), cylinder (borrower), plus glowing tubes and unlabeled cubes sliding along them. The classroom already starts with $75,000 deposited and $40,000 lent, so the origin of capital is never shown.

A user can see that *something* is moving. They often cannot tell *who* the entities are, *why* they are there, or *where money is going* without reading the sidebar.

**Main problem:** visual abstraction without enough process clarity.

## Classification

```text
KEEP
Lesson navigation (8 basic lessons)
KEEP
Academy page shell, TrackToggle, URL lesson sync
KEEP
Dark theme, typography, Accountabul / JRPU styling
KEEP
Three.js mount path (lazy load, ResizeObserver, dispose, reduced motion, WebGL fallback)
KEEP
Simulation reducer + animation queue pattern
KEEP
Institutional track (separate lessons; not replaced)
KEEP
Entity inspector concept
KEEP
z-index scale and responsive lesson chips

MODIFY
Three.js scene → one shared lending world
MODIFY
Step controls → STEP n OF 10 with Play / Pause / Restart
MODIFY
Lesson copy so it follows the business story
MODIFY
Simulation presets (begin from unconfigured / empty)
MODIFY
2D fallback so it still shows people + vault
MODIFY
Advanced roles: progressive reveal in the same world

REPLACE
Abstract entity nodes (octa / sphere / box / cylinder)
REPLACE
Always-on pipe pulses and unlabeled particle cubes
REPLACE
7-stage “capital lifecycle” bar that does not match the 10-step story

REMOVE
Visual noise that does not name a lending role
REMOVE
The implication that native XRPL vaults automatically send a fixed daily cash payment
```
