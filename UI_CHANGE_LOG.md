# UI change log — Lending process canvas

- `src/academy/components/ProcessHud.tsx` — compact lending-system bar (step, capital, advanced, 7-stage grid)
- `src/academy/components/EntityPanel.tsx` — stacked role facts, custody subtitle, live status
- `src/academy/components/StepControls.tsx` — compact controls; hide duplicate step title on phones
- `src/academy/pipeline/LendingPipelineCanvas.tsx` — role card bottom-left; height from CSS; WebGL banner below HUD
- `src/academy/pipeline/WorldLabels.tsx` — HUD/control reserved bands
- `src/index.css` — viewport-aware `.academy-viz` height; one column scroll on tall desktops
- `src/academy/experience/lendingProcess.ts` — origination, guarantee, and collateral→custody hops
- `src/academy/experience/figures.ts` — property packet + XRPL ledger node
- `src/academy/pipeline/LendingNetworkScene.ts` — packet types for document / property / coin
