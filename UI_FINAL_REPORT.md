# UI Final Report — Academy overlap pass

The overlap skill was run in quick mode against the people-and-vault Academy.

## Result

Nothing in the primary teaching chrome overlaps at 100% zoom on 1366×768, 1920×1080, or 375×812.

| Check | Result |
| --- | --- |
| Full role names | Pass — Depositor, Borrower, Lending Vault, Administrator |
| Labels stacked on the vault | Pass — separated HUD tags |
| Stats HUD covering names | Pass — 76px reserve under Capital / Available / Lent |
| Previous / Next on the 3D floor | Pass — chrome sits below the scene |
| Phone side cropping | Pass — camera pulls back under 700px |
| Play controls covered | Pass |
| Orbit hint on the animation | Pass — View legend sits above the canvas |

## Remaining (accepted)

- On a 1366×768 laptop the WHO / WHAT / WHY row is below the fold. That is page scroll, not overlap.
- Institutional track and Live Devnet lab were not the defect surface this pass.
- GitHub Pages still cannot publish from Actions (token cannot create a Pages site). Local / tunnel preview is the test path.

## Stop condition

Identified overlaps are resolved. Core controls stay accessible. Standard desktop sizes work at 100% zoom. Remaining issues are documented.
