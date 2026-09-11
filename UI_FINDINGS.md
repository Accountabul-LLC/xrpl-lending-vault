# UI Findings — Lending process canvas

UI-001
Title: Role card covered desks on the right of the vault
Severity: High
Page: Academy canvas
Component: EntityPanel overlay
Viewport: 1280×800
Zoom: 100%
Observed: Card was `right-2 top-[7.5rem]` and sat on Originator / Guarantor.
Expected: Inspecting a role does not hide the process ring.
Root cause: Overlay used the top-right of the canvas, where several desks live.
Fix: Move the card to bottom-left above the control bar; stack Inputs/Output/Status vertically.
Status: Resolved

UI-002
Title: 82vh canvas plus lesson chrome overflowed short laptops
Severity: High
Page: Academy
Component: `.academy-viz`
Viewport: 1366×768
Zoom: 100%
Observed: Canvas claimed most of the window, then WHO/WHAT/WHY required a second scroll inside the column.
Expected: One primary scroll; canvas large but not fighting the header.
Root cause: Inline `h-[min(82vh,860px)]` ignored remaining chrome; tall-desktop rule also set `overflow: auto` on the same column.
Fix: Phone `min(62vh, 560px)`; desktop `min(82vh, calc(100dvh - 11rem))`; fill-height only at `min-height: 900px`.
Status: Resolved

UI-003
Title: HUD stage labels collided in a flex row with connector lines
Severity: Medium
Page: Academy canvas
Component: ProcessHud
Viewport: 768 / 1024
Zoom: 100%
Observed: Seven labels plus `flex-1 last:flex-none` squeezed Origination/Underwriting.
Expected: Loan status readable at 100% zoom.
Root cause: Flex track with connecting hairlines, not a grid.
Fix: `grid grid-cols-7` with truncated labels.
Status: Resolved

UI-004
Title: Bottom hint plus large buttons covered world labels
Severity: Medium
Page: Academy canvas
Component: StepControls overlay
Viewport: 375×812
Zoom: 100%
Observed: “Drag to orbit…” and full-size buttons stacked under Servicer/Administrator labels.
Expected: Controls stay in a reserved bottom strip.
Root cause: Extra hint line and default Btn padding; label clamp only reserved 56px.
Fix: Drop the hint; compact buttons; clamp labels 72px from the bottom.
Status: Resolved

UI-005
Title: Receives/Produces values sat on the far edge of the role card
Severity: Low
Page: Academy canvas
Component: EntityPanel Row
Viewport: all
Zoom: 100%
Observed: Long strings right-aligned away from their labels.
Expected: Role facts read as a small definition list.
Root cause: `justify-between` row layout.
Fix: Stacked label / value blocks.
Status: Resolved
