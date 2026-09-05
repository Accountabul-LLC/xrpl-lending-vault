# UI Findings — Lending experience v2

UI-201
Title: Administrator stood behind the vault in the head-on camera
Severity: High
Page: Academy lesson 1
Component: LendingNetworkScene camera / entity positions
Viewport: 1280×800
Zoom: 100%
Observed: Depositor, vault, and borrower were obvious; the administrator was easy to miss.
Expected: Step 1 shows a person setting the rules.
Root cause: Administrator was placed on the vault’s +Z occluded axis with a head-on camera.
Fix: Offset the administrator beside the protocol office; use a raised isometric overview for Meet the Parties / Following the Money / Sandbox.
Status: Resolved

UI-202
Title: Transfer sprites could linger after changing lessons
Severity: Medium
Page: Academy
Component: LendingNetworkScene particles
Observed: Amount labels from a previous playback could remain in the world.
Expected: Lesson changes reset the shared world’s in-flight capital.
Root cause: Lesson preset hydrated React state but did not dispose Three.js packets.
Fix: `setLesson` clears in-flight transfers.
Status: Resolved

UI-203
Title: Lesson extras share a bounded scroll region on short laptops
Severity: Low
Page: Academy sandbox
Viewport: 1366×768
Observed: Lesson 8 controls scroll inside the extras region so the world and WHO/WHAT/WHY stay on screen.
Expected: Core teaching chrome remains visible; sandbox actions remain reachable.
Root cause: Intentional — one primary page/workspace scroll plus a justified extras scroller.
Status: Accepted
