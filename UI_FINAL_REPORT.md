# UI final report — Lending process canvas

The Academy visualization is a vault-centered lending map. This pass finished the process hops that were still missing (loan created in the vault, guarantee in Advanced, collateral moving through custody) and cleaned the chrome so HUD, labels, role cards, and Play/Next no longer sit on top of each other.

Checked at 100% zoom:

- Phone-width canvas (~62vh) with compact controls
- Desktop canvas (~82vh, minus header)
- Tall desktop fill-height without a second nested scrollbar for the scene itself

Remaining (informational): InfoPanel and lesson copy still live under the canvas by design. Appraiser / title / insurance are intentionally not rendered. Palisade is not branded; the custodian is labeled Institutional custody layer.
