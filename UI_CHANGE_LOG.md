# UI Change Log — Lending experience v2

- Replaced the abstract node/pipe HUD-heavy scene with a shared world: people, vault, coins, agreement.
- Step **n of 10** bar is always visible (Previous / Next / Play / Pause / Restart).
- WHO / WHAT / WHY panel is always visible under the world.
- Visualization grows with the workspace (`flex-1` on desktop) instead of a short fixed strip plus a large dead extras column.
- Advanced roles are a compact chip strip in the same world, not a second map stealing canvas width.
- 2D fallback uses person + vault symbols with the same layout if WebGL is unavailable.
- Administrator offset so they are not hidden behind the vault; overview lessons use a raised camera.
