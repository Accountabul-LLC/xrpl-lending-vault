# UI Change Log — Academy overlap pass

## Layout

- `academy-shell` no longer forces `100vh` + `overflow: hidden` on laptop heights.
- Fill-height workstation only at `min-width: 1024px` and `min-height: 900px`.
- Visualization height is `min(42vh, 380px)` (sm: 46vh / 440px), then flex-grow on tall desktops.
- Removed the extras `max-h-[32vh]` nested scroller.

## Labels

- Removed world-space name sprites and the “Vault rules” sprite.
- Added `WorldLabels` CSS HUD: clamped inside the canvas, reserved 76px under the stats chip, collision push.
- Default tags: Depositor, Lending Vault, Administrator, Borrower, Agreement (when visible).
- Narrow screens use Admin / Vault so five tags still fit.

## Camera

- Canvas width `< 700px` frames the party from farther back so people are not cropped.

## Files

- `src/academy/Academy.tsx`
- `src/academy/pipeline/WorldLabels.tsx`
- `src/academy/pipeline/LendingPipelineCanvas.tsx`
- `src/academy/pipeline/LendingNetworkScene.ts`
- `src/index.css`
