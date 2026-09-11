# UI Findings — Academy overlap pass

UI-301
Title: 3D name tags clip at the canvas edge
Severity: High
Page: Academy lesson 1
Component: LendingNetworkScene name sprites
Viewport: 1366×768, 1920×1080, 375×812
Zoom: 100%
Observed: “Depositor / Lender” read as Depos…ender; “Borrower” read as Br…er.
Expected: Full role names stay inside the visualization.
Root cause: Canvas sprites were scaled larger than the close-camera frame; parent used overflow:hidden.
Fix: Replace sprites with a CSS HUD; short names; clamp to canvas bounds.
Status: Resolved

UI-302
Title: Vault / Administrator / Protocol Office labels stacked
Severity: High
Page: Academy lesson 1–2
Component: 3D name sprites + rules-board sprite
Viewport: 1366×768
Observed: Four labels sat on top of the vault.
Expected: One readable tag per actor, not stacked on the safe.
Root cause: World-space sprites project to the same screen cluster; Protocol Office sits behind the vault.
Fix: CSS labels with overlap resolution; drop Protocol Office and Vault rules sprites from the default view.
Status: Resolved

UI-303
Title: Tall 3D panel covered Previous / Next lesson
Severity: High
Page: Academy
Component: academy-shell + LendingPipelineCanvas
Viewport: 1366×768
Zoom: 100%
Observed: Previous lesson / Next lesson painted on the bottom of the 3D floor.
Expected: Lesson chrome stays below the scene.
Root cause: Canvas min-height 440px + 56vh + locked `100vh` column + overflow hidden. Flex overflow painted later siblings on top of the canvas.
Fix: Remove the height lock on short laptops; canvas uses a bounded height and grows only on tall desktops.
Status: Resolved

UI-304
Title: Phone camera cut people off at the sides
Severity: Medium
Page: Academy
Component: LendingNetworkScene camera
Viewport: 375×812
Observed: Depositor and Borrower were clipped by the canvas.
Expected: The full party stays in frame on a phone.
Root cause: Desktop close-camera presets used on a ~6:13 aspect.
Fix: Pull the camera back when the canvas is under 700px wide.
Status: Resolved

UI-305
Title: Nested extras scroller on short desktops
Severity: Low
Page: Academy
Component: Lesson copy grid
Viewport: 1366×768
Observed: A 32vh nested scroller under an already clipped column.
Expected: One primary page scroll.
Fix: Remove `lg:max-h-[32vh] overflow-auto` from extras.
Status: Resolved

UI-306
Title: Orbit hint covered the 3D animation
Severity: Medium
Page: Academy
Component: LendingPipelineCanvas overlay
Viewport: 1366×768, 1920×1080
Observed: “Drag to orbit · Scroll to zoom · Right-drag to pan” sat on the floor of the scene over people, vault, coins, and the contract.
Expected: Camera controls stay readable without covering the animation.
Root cause: Absolute overlay pinned to the bottom of the visualization frame.
Fix: Remove the overlay. Add a View legend above the canvas (Drag = Orbit, Scroll = Zoom, Right-drag = Pan).
Status: Resolved
