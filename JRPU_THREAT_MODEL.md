# JRPU Threat Model & Security Architecture

Status: DESIGNING, targeting **XRPL Devnet** for testing. No code
implemented yet — this is the pre-code threat model that implementation and
later audit must satisfy. Built on native XRPL primitives (MPT, Escrow,
Payment Channels, multisign) rather than a custom smart contract — see
`JRPU_PROTOCOL_ARCHITECTURE.md` §0 for why, and read §0 below before the
generic threat table: the biggest new risk class versus an EVM-vault design
is **operator trust**, not covered by typical smart-contract threat models.

## 0. XRPL-Specific Risk: The Operator Is Not Eliminated, Only Bounded

Because XRPL mainnet/devnet has no general on-ledger computation, cap
enforcement, accrual accounting, and claim-authorization signing are done by
an off-ledger operator service (see Protocol Architecture §0, §3, §8). This
is a fundamentally different trust model than a self-enforcing contract:

| Risk | Description | Mitigation |
|---|---|---|
| Operator miscomputes accrual/cap | Bug in off-ledger indexer causes wrong EscrowFinish/refund decision or wrong claim authorization amount | Indexer logic replayable/auditable from public ledger history; independent code review; devnet testing specifically exercises boundary cases (at-cap, over-cap, concurrent deposits) before any mainnet consideration |
| Operator signer-key compromise | Attacker controls enough multisig weight to authorize bad EscrowFinish/PaymentChannelFund | `SignerListSet` quorum (e.g., 3-of-5+) with master key disabled; keys held by separate parties/devices; regular key rotation |
| Operator censorship | Operator simply refuses to finish a legitimate escrow or sign a legitimate claim | Escrow `CancelAfter` guarantees funds auto-return to sender if never finished — depositor is never permanently stuck even if the operator goes dark; document this fallback explicitly |
| Operator front-runs cap decisioning | Operator finishes escrows out of submission order to favor one depositor | Publish and follow a deterministic ordering rule (e.g., FIFO by escrow creation ledger index) so cap-fill order is verifiable after the fact |
| False sense of "trustless" | Users assume XRPL-native = same guarantees as an audited smart contract | Explicit user-facing disclosure that cap/accrual enforcement is operator + multisig + auditability, not cryptographic contract enforcement (see Compliance doc) |

This section is additive to, not a replacement for, the general threat table
below.

## 1. Protocol Invariants (must hold after every state transition)

1. `TOTAL_PRINCIPAL <= MAX_VAULT_CAPACITY` at all times.
2. `USER_LIABILITIES <= TOTAL_ASSETS` (solvency) — no transition may leave
   the protocol owing more than it holds/is owed.
3. A user's cumulative withdrawals (principal + yield) can never exceed
   amounts legitimately owed to that position, per the accrual ledger.
4. Distributed yield cannot be claimed twice (see §2, double-claim
   analysis).
5. Sum of all positions' `principal` reconciles exactly with
   `TOTAL_PRINCIPAL`; sum of all `outstandingYield` reconciles with
   `AVAILABLE_DISTRIBUTABLE_YIELD` allocation.
6. No admin function can move user principal/yield to a non-user address.
7. Pausing a subsystem (deposits/borrowing/withdrawals/distributions) never
   locks a user out of *already-owed, already-liquid* funds indefinitely
   beyond the documented emergency scope.

## 2. Threat-by-Threat Analysis

Note: several rows below are written for a general contract-based vault and
are reinterpreted for XRPL's native-transaction model rather than literally
applicable (e.g., there is no EVM-style reentrancy on XRPL; the equivalent
concern is the operator indexer double-processing the same ledger event).

| Threat | Vector | Mitigation |
|---|---|---|
| Reentrancy | Malicious token/callback re-enters withdraw/claim mid-execution | Checks-effects-interactions ordering; reentrancy guard on all state-changing external-call functions; update ledger *before* external transfer |
| Oracle manipulation | If collateral pricing uses a manipulable price feed, attacker under-collateralizes or triggers false liquidation | Use time-weighted/aggregated oracle feeds, sanity-bound price deltas, avoid single-block spot price dependence |
| Rounding attacks | Repeated tiny operations exploit integer division rounding to drain dust or inflate a position | Use fixed-point math library with consistent rounding direction (round in protocol's favor), minimum-deposit/claim thresholds |
| Precision errors | Mismatched decimals between asset and accounting unit | Normalize all internal accounting to one fixed decimal precision at ingress |
| Flash-loan attacks | Attacker borrows large capital to temporarily manipulate utilization/price/vote within one tx | No governance/rate decisions based on single-block balances; rate/utilization snapshots use time-weighted or checkpointed values, not instantaneous balance |
| Double claiming | Claim yield, then claim same accrued amount again (e.g., via frequency switch or replay) | Single continuous accrual ledger per position (§4 of Protocol Architecture); claim decrements `outstandingYield` atomically before transfer |
| Payout-frequency manipulation | Switch frequency to claim same window twice or accrue extra | Frequency changes checkpoint accrued yield and only apply going forward (see Protocol Architecture §4) |
| Deposit-cap bypass | Multiple simultaneous deposits race past `MAX_VAULT_CAPACITY` | Atomic check-and-effect within a single transaction guarded by reentrancy protection; cap check reads post-effect state, not stale cached state |
| Unauthorized withdrawals | Attacker drains another user's position | Position keyed to `msg.sender`/authenticated account only; no admin bypass path (see Emergency Controls) |
| Admin-key compromise | Single key takes over pause/param functions | Multisig (e.g., 3-of-5) + timelock on non-emergency changes; no single-key fund-moving capability at all |
| Borrower collusion | Borrowers coordinate to extract favorable terms or fake repayment | Independent underwriting per borrower, credit limits capping single/related-party exposure, on-chain or auditable off-chain repayment proof |
| Bad debt | Borrower default exceeds collateral/reserve | Bad-debt reserve absorbs first; overflow triggers disclosed pro-rata loss socialization, never silently hidden in "yield" accounting |
| Insolvency | `USER_LIABILITIES > TOTAL_ASSETS` | Solvency invariant checked and enforced on every distribution/withdrawal; distributions capped at `AVAILABLE_DISTRIBUTABLE_YIELD` |
| Accounting manipulation | Direct storage manipulation or unauthorized ledger writes | All ledger mutations behind access-controlled internal functions; no direct external setters on core accounting state |
| Transaction replay | Signed withdrawal/claim message replayed | Nonces / sequence numbers on any off-chain-signed action; standard replay protection |
| Front-running | MEV bots front-run large deposits/withdrawals for advantage | Minimize any state where transaction ordering creates arbitrage (e.g., rate doesn't jump instantly on a single large deposit); consider commit-reveal only if actually needed — avoid over-engineering at this stage |
| Smart-contract upgrade attacks | Malicious or buggy upgrade drains vault | Timelocked, multisig-gated upgrades only; consider immutable core accounting logic with upgradeable peripheral modules; publish upgrade diffs before timelock expiry |

## 3. Design Principles Applied

- **Frontend is never the security boundary** — every invariant above is
  enforced at the contract/protocol layer.
- **Claim (pull) over push** for distributions — smaller, well-understood
  attack surface (see Protocol Architecture §8).
- **Checks-effects-interactions** everywhere funds move.
- **Single accrual ledger** — eliminates an entire class of double-claim
  and frequency-switch bugs by construction rather than by patching.
- **Reject-over-partial** on cap breaches — fewer edge cases to get wrong
  under concurrency (see Protocol Architecture §3).
- **No unbacked distributions** — the solvency invariant is checked, not
  assumed.

## 4. Pre-Audit Checklist (before any mainnet deployment)

- [ ] Formal/automated invariant testing (fuzzing) against all invariants in
      §1.
- [ ] Independent third-party smart-contract audit.
- [ ] Multisig + timelock live and tested on testnet before mainnet.
- [ ] Emergency pause functions tested end-to-end (each of the four
      independently).
- [ ] Oracle feed(s) reviewed for manipulation resistance if collateral
      pricing is on-chain.
- [ ] Bad-debt and insolvency scenarios simulated (not just happy path).

## 5. Explicitly Out of Scope for This Round

Production smart contracts are **not** written as part of this design pass,
per explicit instruction. This document defines what implementation and
audit must satisfy once building begins.
