# JRPU Lending Protocol — Vault Architecture

Status: DESIGNING (pre-implementation). No code exists yet.

**Target network for this build: XRPL Devnet.** This is a test deployment
to validate the vault/lending mechanics end-to-end (deposits, cap handling,
accrual, distribution, withdrawal, borrower flow) using devnet XRP/test
assets — not a production launch with real user funds. All figures ($250k
cap, 25% APY) are the test scenario's target parameters, not live financial
commitments. The architecture below is written so it carries forward
unchanged to mainnet once validated; the compliance review in
`JRPU_COMPLIANCE_QUESTIONS.md` becomes a hard gate before any mainnet/
real-funds deployment, not before devnet testing.

## 0. Platform Decision: XRPL Mainnet (Devnet for testing), Native Features Only (+ MPT)

**JRPU is built on XRPL using native ledger primitives — no custom smart
contract.** Devnet and mainnet share the same transaction set, so this
design is devnet-first but mainnet-portable. XRPL mainnet has no general-purpose on-ledger computation
(no Hooks, no EVM). This is a deliberate, important constraint that
reshapes every section below versus a typical EVM-vault design:

| Need | Native XRPL primitive used |
|---|---|
| Vault share / position receipt | **MPT (Multi-Purpose Token)** — one MPTIssuance represents JRPU vault shares/receipts |
| Deposit custody | Vault-controlled XRPL account (or MPT issuer account) receiving `Payment` transactions |
| Time/condition-gated fund release | **Escrow** (`EscrowCreate` / `EscrowFinish` / `EscrowCancel`) |
| Streaming/claimable payouts without per-user push cost | **Payment Channels** (`PaymentChannelCreate` / `Claim` / `Fund`) |
| Admin authority (no single key) | **Multi-signing** (`SignerListSet`) on the vault account(s) |
| Emergency clawback of a specific bad position (not blanket fund seizure) | **Clawback** (requires the vault's issued asset to opt into the Clawback amendment/flag) |
| Restricting who can hold vault shares | **Trust line / MPT authorization** (`RequireAuth` on the MPT issuance, per-holder authorization) |

**Critical honesty point:** because there is no on-ledger arbitrary
computation, logic like "reject deposits that would breach $250,000",
"compute accrued yield", and "gate a claim to the correct amount" **cannot
be enforced purely by the ledger itself** the way a smart contract enforces
it. On XRPL mainnet this logic necessarily lives in an **off-ledger vault
operator service** that is the only entity permitted to submit the native
transactions (MPT issuance, Escrow finish, Payment Channel claim
authorization) that make funds move. This service's authority is bounded
and made auditable via multisign + published rules + on-ledger transaction
history, but it is **not trustless** in the way a fully on-chain contract
is — that tradeoff must be disclosed to users (see Threat Model §0 and
Compliance doc) and is the single biggest architectural difference from the
original generic-vault-contract draft.

If true on-ledger enforcement of the cap/accrual logic becomes a hard
requirement later, the alternative is Xahau (Hooks) — noted here as a future
option, not part of this design.

## 1. Overview

JRPU is a capped-capacity lending vault. Depositors supply capital, the
protocol deploys that capital through a defined lending strategy to
borrowers, and net revenue funds depositor yield. The vault has a hard
$250,000 capacity ceiling and a 25% APY *target* (never a guarantee unless
explicitly and contractually funded).

```
Depositor Capital
   -> JRPU Vault (accounting + cap enforcement)
   -> Lending Strategy (capital deployment)
   -> Borrowers (interest + fees)
   -> Protocol Revenue
   -> Reserve (liquidity + bad-debt buffer)
   -> Depositor Yield (accrual -> distribution)
```

## 2. Yield Engine

APY (Annual Percentage Yield) is the compounding annualized return. APR
(Annual Percentage Rate) is the simple, non-compounding nominal rate. JRPU's
25% figure is an **APY target**, so periodic compounding rates must be
derived from it, not from naive division.

```
periodicRate = (1 + APY)^(1 / periodsPerYear) - 1
```

| Frequency | periodsPerYear | periodicRate | Approx. annualized check |
|---|---|---|---|
| Daily   | 365 | (1.25)^(1/365) - 1 ≈ 0.0006119 (0.06119%) | (1+0.0006119)^365 - 1 ≈ 25% |
| Weekly  | 52  | (1.25)^(1/52) - 1 ≈ 0.004284 (0.4284%)   | (1+0.004284)^52 - 1 ≈ 25% |
| Monthly | 12  | (1.25)^(1/12) - 1 ≈ 0.018773 (1.8773%)   | (1+0.018773)^12 - 1 ≈ 25% |

Naively dividing 25% by 365 (≈0.0685%/day) *overstates* the true daily rate
and, compounded, produces an effective APY well above 25%. The formula above
is mandatory for all three frequencies — distribution frequency changes
*when* yield is paid, never the annualized target itself.

### Yield state vocabulary (must be used consistently everywhere — code, UI, docs)

- **APY** — the target annualized, compounding rate the protocol is aiming
  to pay (25%). Forward-looking, a target, not a promise.
- **APR** — simple annualized rate without compounding; used only if/where
  a non-compounding disclosure is needed (e.g., certain lending-law
  disclosures).
- **Projected yield** — forward estimate shown to a user before/at deposit,
  computed from APY and current terms. Explicitly labeled "projected/target."
- **Accrued yield** — yield mathematically earned by a position based on
  elapsed time and the periodic rate, whether or not it has been funded or
  paid out yet.
- **Realized yield** — the portion of accrued yield that is actually backed
  by realized protocol revenue (see §5) and thus eligible to be distributed.
- **Distributed yield** — yield that has actually been paid/made claimable
  to the user.
- **Outstanding yield** — accrued yield not yet distributed (accrued minus
  distributed).

Accrued yield can exceed realized yield if the underlying strategy has not
yet generated enough revenue — see the "no fictitious yield" rule in §5.

## 3. $250,000 Hard Cap

`MAX_VAULT_CAPACITY = 250_000` is the ceiling on total depositor principal.
On an EVM chain this is a one-line contract `require`. **On XRPL mainnet
there is no on-ledger code path to reject an inbound `Payment` based on a
dynamic running total** — the ledger will simply accept any payment sent to
the vault account. Cap enforcement is therefore necessarily a function of
the off-ledger vault operator service plus native-transaction design, and
must be built to fail safely even though it isn't purely trustless.

**Recommendation: reject the entire over-cap deposit (Option B) — refund in
full, not partial-fill — and enforce it via a pending/staging step rather
than instant custody.**

Mechanism:
1. Users do not send funds directly and unconditionally into vault custody.
   Instead, deposit is a two-step flow: `EscrowCreate` (or a payment to a
   dedicated per-deposit staging address) that the vault operator must
   explicitly `EscrowFinish` (accept) or `EscrowCancel` (refund) before the
   deposit is credited as a position.
2. The operator service checks `totalPrincipal + depositAmount <=
   MAX_VAULT_CAPACITY` against its own ledger-derived running total (built
   from indexing confirmed on-ledger `EscrowFinish`/MPT-issuance history —
   the operator's authoritative state is itself just a replay of public
   ledger transactions, so it's auditable even though not self-enforcing).
3. If within cap: `EscrowFinish` executes, and the operator issues the
   corresponding MPT position/receipt to the depositor in the same
   settlement.
4. If over cap: the operator does not finish the escrow before its
   `CancelAfter` time, so it auto-cancels and funds return to the sender —
   never partially finished. This makes "reject-entire" the structurally
   easy path (an escrow either finishes in full or doesn't) and avoids ever
   needing to compute or send a partial refund amount.
5. Every `EscrowFinish`/`EscrowCancel` is a public, auditable ledger event,
   so users and any observer can verify the operator only finished escrows
   that kept `totalPrincipal <= 250,000` — the cap is *transparently
   verifiable after the fact* even though it isn't cryptographically
   *enforced before the fact* the way a contract `require` would be.

This is the core trust tradeoff of building on XRPL mainnet without Hooks:
enforcement shifts from "the ledger prevents it" to "the operator is
bounded by multisign + timelocked rules and every action is publicly
auditable." This must be disclosed to users plainly (see Compliance doc).

## 4. User Positions

On XRPL there is no contract storage for a `struct` — a position is
represented by **one MPT holding per depositor** (the vault's MPTIssuance,
authorized per-holder via `RequireAuth`) whose on-ledger balance encodes
principal, plus an **off-ledger position record maintained by the operator
indexer** (rebuildable from ledger history, not the sole source of truth for
funds — funds ownership always traces back to the MPT balance itself):

```
MPT balance (on-ledger, authoritative for "what does this wallet own"):
  holder MPT balance  = principal + (any yield already minted/transferred to them)

Position record (off-ledger index, authoritative for accounting detail):
{
  account: <XRPL address>,
  mptIssuanceId: <the vault's MPT>,
  principal: <derived from initial EscrowFinish amount, immutable per deposit>,
  depositTimestamp,
  distributionFrequency: DAILY | WEEKLY | MONTHLY,
  accruedYield,
  distributedYield,
  outstandingYield,        // accruedYield - distributedYield
  lastDistributionTimestamp,
  nextDistributionTimestamp,
  claimChannelId: <PaymentChannel ID used for this position's payouts>,
  status: ACTIVE | PENDING_WITHDRAWAL | CLOSED
}
```

Each position gets its own **Payment Channel** from the vault account to the
holder, used exclusively for yield claims (see §8) — this keeps claim
authorization scoped per-user and auditable per-channel rather than a
shared pool of ambiguous transfers.

### Frequency changes

**Recommendation: frequency changes take effect at the start of the next
distribution period, not immediately.**

Rationale: immediate switching creates a double-claim vector — a user could
accrue under a monthly schedule, switch to daily right before a boundary,
and attempt to claim the same accrued-but-undistributed yield under both
schedules' timing logic. Effective-next-period changes are implemented by:

1. On frequency-change request, finalize (checkpoint) all currently accrued
   yield up to `now` into `outstandingYield` under the *old* schedule.
2. Record the new frequency and compute `nextDistributionTimestamp` from the
   *new* schedule's next boundary after `now`.
3. Yield accrued between the checkpoint and the new schedule's first
   distribution accrues once, continuously — accrual itself is
   frequency-agnostic (see §8); only claim/payout timing changes.

This makes double-claiming structurally impossible because there is a single
continuous accrual ledger per position, and frequency only gates *when*
`outstandingYield` becomes payable.

## 5. Yield Funding (critical)

Yield is never conjured by a timer. It is backed by actual protocol revenue.

```
Depositor Capital -> JRPU Vault -> Lending Strategy -> Borrowers
   -> Interest + Origination Fees -> Protocol Revenue
   -> Reserve top-up + Protocol Fee split -> Available Distributable Yield
   -> Depositor Yield (capped at what's actually available)
```

### Accounting ledgers (must be tracked independently)

- **TOTAL_ASSETS** — sum of liquid reserve + outstanding loan principal +
  accrued (not yet collected) borrower interest recognized as receivable.
- **TOTAL_PRINCIPAL** — sum of all depositor principal (liability).
- **ACCRUED_BORROWER_INTEREST** — interest borrowers owe but haven't paid
  yet (receivable, not cash).
- **REALIZED_REVENUE** — interest/fees actually *collected* in cash/asset
  form. Only realized revenue can fund distributions.
- **AVAILABLE_DISTRIBUTABLE_YIELD** — `REALIZED_REVENUE - PROTOCOL_FEES -
  RESERVE_TOPUP - BAD_DEBT_ABSORBED`, i.e., what's actually free to pay
  depositors right now.
- **PROTOCOL_RESERVES** — liquidity buffer + bad-debt buffer (see §6).
- **PROTOCOL_FEES** — protocol's own revenue cut, tracked separately from
  depositor-owed amounts.
- **BAD_DEBT** — recognized borrower defaults/shortfalls not recoverable;
  reduces TOTAL_ASSETS and must be absorbed by reserves before it can touch
  depositor principal.
- **USER_LIABILITIES** — sum of all positions' `principal + outstandingYield`
  — what the protocol owes depositors in total.

### Hard rule

`distributedYield` for any period is capped at
`min(accrued-but-undistributed for that position pro-rata, AVAILABLE_DISTRIBUTABLE_YIELD)`.
If realized revenue is insufficient, the protocol distributes what's
available and carries the remainder forward as `outstandingYield` — it does
**not** pay out unbacked yield, and the UI/dashboard must disclose when a
distribution was partially or fully deferred due to insufficient realized
revenue. `USER_LIABILITIES <= TOTAL_ASSETS` (solvency invariant) must hold
after every state transition, or the transition reverts.

## 6. Liquidity Reserve

Modeled reserve ratios (fraction of $250,000 kept liquid, not lent out):

| Reserve | Liquid $ | Lendable $ | Withdrawal liquidity | Lending capacity / 25% APY feasibility | Default protection |
|---|---|---|---|---|---|
| 10% | $25,000 | $225,000 | Weak — a handful of large withdrawals can exhaust it, forcing a withdrawal queue | Highest lending capacity, easiest to *theoretically* hit 25% if borrower rates are high enough | Weak — little buffer to absorb defaults without touching principal |
| 20% | $50,000 | $200,000 | Moderate — covers routine redemption patterns | Still workable for 25% target with realistic borrower rates/utilization | Moderate |
| 25% | $62,500 | $187,500 | Strongest instant-liquidity story | Requires higher borrower rates or utilization to still hit 25% net-of-reserve | Strongest |

**Recommendation: start at 20% reserve**, split into a *liquidity
sub-reserve* (for withdrawals, target ~12–15%) and a *bad-debt sub-reserve*
(target ~5–8%), re-evaluated quarterly against actual default/withdrawal
data. This is a business decision to revisit with real usage data — treat
20% as the design default, not final.

## 7. Borrowing Side

- **Who can borrow**: whitelisted/underwritten borrowers only at launch
  (not permissionless) — reduces bad-debt and compliance surface while the
  protocol is small and uninsured.
- **Max LTV**: 65–70% against posted collateral (conservative starting
  point for a new, capital-constrained protocol).
- **Collateral**: over-collateralized in a liquid, oracle-priced asset (or
  off-chain collateral with legal lien, if doing real-world lending —
  requires legal review, see compliance doc).
- **Loan duration**: fixed terms (e.g., 30/60/90-day) rather than open-ended,
  to make cash-flow and liquidity planning tractable against a fixed
  $250,000 cap.
- **Interest rate**: fixed or algorithmically-set per utilization band (see
  math below), disclosed to borrower before draw.
- **Origination fee**: flat % on draw, routed to PROTOCOL_FEES / reserve
  top-up, not depositor yield.
- **Late/default handling**: grace period -> late fee -> liquidation trigger
  -> bad-debt recognition if liquidation shortfalls.
- **Liquidation**: automatic if collateralized on-chain and LTV breaches
  threshold; manual/legal process if real-world collateral.
- **Repayment**: principal + interest either amortized or bullet at term
  end, borrower's choice disclosed upfront.
- **Underwriting**: credit checks / collateral verification before a credit
  line is opened; not purely permissionless at launch.
- **Credit limits**: per-borrower cap, separate from the vault-wide $250,000
  depositor cap, sized to keep single-borrower concentration risk bounded
  (e.g., no single borrower > 20% of lendable capital).
- **Bad debt**: absorbed by bad-debt reserve first; if reserve is exhausted,
  losses are socialized pro-rata across depositor principal — this must be
  explicitly disclosed to users, it is not swept under "yield."

### Required borrower rate to sustain 25% depositor APY

This is the key sustainability check — charging borrowers 25% does **not**
give depositors 25%. Approximate required borrower APR:

```
requiredBorrowerAPR ≈ (depositorAPY_target + reserveDrag + protocolFeeRate + expectedDefaultRate + opexRate)
                        / utilizationRate
```

Worked illustrative example (20% reserve, i.e., 80% utilization ceiling):

- Depositor target: 25%
- Reserve drag (idle 20% earns ~0%, diluting blended return): effectively
  requires the *lent* 80% to earn `25% / 0.80 = 31.25%` just to cover the
  idle portion, before fees/defaults.
- Add protocol fee (e.g., 2%), expected default rate (e.g., 3%), opex (e.g.,
  1%): borrower rate needs to be roughly `31.25% + 2% + 3% + 1% ≈ 37%` APR
  at 80% utilization to net depositors 25%.
- At 100% theoretical utilization (unrealistic, no reserve) the required
  borrower rate drops to roughly `25% + 2% + 3% + 1% = 31%`.

**Conclusion: a 25% depositor APY target requires borrower rates in the
~31–37%+ APR range at realistic utilization, which is a high-yield/
higher-risk private-credit rate band.** This must be explicitly modeled
against real, identified borrowers/strategy (see Financial Model doc) before
25% is advertised anywhere — if the achievable borrower rate is lower, the
depositor APY target must be lowered accordingly, not fudged.

## 8. Distribution System

**One accounting engine, not three parallel systems.** Yield accrues
continuously per-position using the periodic-rate math from §2, independent
of distribution frequency. Distribution frequency only controls *when*
`outstandingYield` is checkpointed into a claimable/paid state.

### Push vs. Claim

| | Push (protocol auto-sends) | Claim (user withdraws) |
|---|---|---|
| Gas/tx cost | Protocol pays for every position, every period — scales linearly with user count × frequency, expensive and DoS-prone at scale | User pays own claim tx, only when they choose to claim |
| Scalability | Poor — daily push to thousands of daily-frequency users is enormous tx volume | Good — claims are opt-in and can batch |
| Security | Larger attack surface (automated funds movement, keeper/bot dependency, reentrancy on every push) | Smaller surface — standard pull-payment pattern, well-understood safe pattern |
| Reliability | A single failed push run affects everyone | Individual user failures don't affect others |

**Recommendation: Claim model, implemented as an XRPL Payment Channel per
position.** Concretely:

1. At deposit, the vault opens a `PaymentChannelCreate` to the depositor
   with an initial small `Amount` allocation (topped up over time via
   `PaymentChannelFund` as yield accrues and is realized).
2. The operator indexer computes `outstandingYield` continuously
   (frequency-agnostic accrual, per §2/§4) and, at each distribution
   boundary the position is eligible for, **signs an off-ledger claim
   authorization** (a standard XRPL Payment Channel `Amount` + signature)
   for the cumulative claimable balance — this costs no ledger transaction
   by itself.
3. The user submits `PaymentChannelClaim` themselves, whenever they want,
   redeeming up to the latest signed authorized amount — one transaction,
   user-paid, on their own schedule. This is the direct XRPL analog of the
   EVM "claim()" pull pattern: the channel only ever pays out what's been
   authorized, and authorization amounts are monotonically increasing and
   capped at `outstandingYield`, so a claim can never exceed what's owed.
4. This avoids the "push" failure mode entirely — the operator never needs
   to submit one transaction per user per period; it only signs (free,
   off-ledger) claim authorizations, and users decide when to actually
   settle on-ledger.

## 9. Withdrawals

```
Request Withdrawal -> Validate Position -> Calculate Principal
  -> Calculate Claimable Yield -> Check Available Liquidity
  -> Process Withdrawal -> Update Accounting
```

**Recommendation: liquidity-dependent withdrawals with a queue fallback, no
blanket instant-redemption promise.**

- **Instant withdrawals**: allowed only up to currently available liquid
  reserve (§6). This is the honest default — capital deployed to borrowers
  on fixed terms is not instantly recallable.
- **Withdrawal queue**: if liquidity is insufficient, the request enters a
  FIFO queue and is fulfilled as loans mature / reserve replenishes.
- **Maturity periods**: optional — could tie a position's early-exit
  behavior to underlying loan terms, but is a product decision, not a
  security requirement.
- **Early withdrawal penalty**: optional lever to discourage liquidity runs;
  if used, must be disclosed upfront at deposit time, not surprised later.
- Never market "instant redemption" language anywhere (UI, marketing,
  terms) unless the reserve model actually guarantees it for 100% of
  capacity, which it structurally does not under a lending strategy.

## 10. Security Architecture — see `JRPU_THREAT_MODEL.md`

## 11. Emergency Controls

Separate, granular pause switches rather than one global pause:

- `PAUSE_DEPOSITS`
- `PAUSE_BORROWING`
- `PAUSE_WITHDRAWALS`
- `PAUSE_DISTRIBUTIONS`

Each guarded by its own role/permission so, e.g., withdrawals can stay live
while new borrowing is halted during an incident.

**Multisig administration required** — no single private key controls
pause, cap changes, or fund movement. Implemented natively via XRPL
`SignerListSet` on the vault account(s): configure a quorum (e.g., 3-of-5
signer weight) so any `EscrowFinish`, MPT issuance, or `PaymentChannelFund`
requires multiple co-signers, with the account's master key disabled
(`AccountSet` `asfDisableMaster`) once the signer list is live so the
multisig is the *only* path to move funds. Non-emergency parameter changes
(cap, reserve ratio) are additionally timelocked by the operator's own
process rules (e.g., published 24–48h notice before the new signer-approved
transaction is submitted); pauses (below) are the one class of action kept
fast.

Since XRPL has no on-ledger "pause" primitive, the four pause switches are
implemented as **operator-service flags**, not ledger state: when paused,
the operator simply stops finishing new deposit escrows / signing new claim
authorizations / creating new borrower disbursement escrows, as applicable.
This is disclosed as an operational control, not a cryptographic one —
funds already legitimately claimable via an already-signed Payment Channel
authorization remain claimable by the user even during a pause, since that
authorization was already committed.

**Explicitly document what admins CAN do:**
- Trigger the four pauses above (immediate, no timelock).
- Propose parameter changes (reserve ratio, fee rate) — subject to timelock
  + multisig quorum.
- Propose adding/removing whitelisted borrowers — subject to multisig
  quorum.

**Explicitly document what admins CANNOT do:**
- Cannot withdraw, redirect, or move user principal or accrued yield
  directly.
- Cannot exceed `MAX_VAULT_CAPACITY` via any admin function.
- Cannot alter a user's already-recorded accrued/distributed yield history.
- Cannot bypass the reentrancy guard or checks-effects-interactions ordering
  via an admin path.

## 12. Dashboard — see mockup in original request; data sources map directly
to the ledgers in §5 and position fields in §4. UI must visually distinguish
**target/projected APY** (a label, forward-looking) from any **realized
historical performance** figure (computed from actual `distributedYield`
over trailing periods) — never blend the two into one number.

## 13. Compliance Architecture — see `JRPU_COMPLIANCE_QUESTIONS.md`

## Module Architecture (devnet build, not yet implemented)

Since there's no on-ledger contract, "modules" are: (a) native XRPL ledger
objects/transaction types doing custody and settlement, and (b) an
off-ledger operator service doing accounting/decisioning and *only*
submitting the narrow set of native transactions each module is allowed to.

```
On-ledger (XRPL Devnet objects):
  MPTIssuance          - vault share/position receipt token
  Escrow                - staged deposits (cap-gated accept/refund), borrower disbursement
  PaymentChannel (x N)  - one per position, used for yield claims
  SignerList             - multisig quorum on the vault account(s)
  Trustline/MPT Auth      - per-holder authorization gating who can hold vault shares

Off-ledger operator service (indexes the ledger; holds no unilateral fund power beyond signer weight):
  LedgerIndexer          - rebuilds position/ledger state by replaying confirmed XRPL txns
  YieldAccounting         - periodic-rate math, accrual ledger, realized-vs-accrued (§2, §5)
  CapGuard                - decides EscrowFinish vs EscrowCancel against MAX_VAULT_CAPACITY (§3)
  StrategyManager          - tracks capital routed to LendingStrategy / borrowers (§7)
  DistributionSigner        - signs Payment Channel claim authorizations, never pushes funds itself (§8)
  ReserveManager              - liquidity + bad-debt reserve tracking (§6)
  Multisig co-signers (ops)     - required quorum for every fund-moving native transaction
```

`LedgerIndexer` and `YieldAccounting` are the highest-audit-priority
components since they compute the numbers every other module acts on, even
though — unlike an EVM contract — they cannot themselves cryptographically
guarantee correctness; correctness is instead verified by (1) code review/
audit of the operator service, (2) every fund-moving action being a public,
independently-replayable XRPL transaction, and (3) the multisig quorum
acting as a check against any single compromised signer.
