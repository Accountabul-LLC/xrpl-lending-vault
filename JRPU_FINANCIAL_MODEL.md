# JRPU Financial Sustainability Model

Status: DESIGNING, targeting **XRPL Devnet** for testing (see
`JRPU_PROTOCOL_ARCHITECTURE.md` §0). All figures illustrative pending real
strategy/borrower data — this model exists to prove or disprove feasibility
of the 25% APY target before any code, devnet parameter, or eventual
marketing claim is made.

## 1. Periodic Rate Table (from Protocol Architecture §2)

APY = 25%. `periodicRate = (1+APY)^(1/n) - 1`

| Frequency | n | Periodic rate | On $10,000 principal |
|---|---|---|---|
| Daily | 365 | 0.06119% | $6.12/day |
| Weekly | 52 | 0.4284% | $42.84/week |
| Monthly | 12 | 1.8773% | $187.73/month |

All three converge to the same $2,500/year (25% of $10,000) — frequency
only changes payout cadence, never the annualized amount.

## 2. Capacity & Reserve Scenarios

Base case: $250,000 max vault capacity.

| Reserve % | Liquid | Lendable | Notes |
|---|---|---|---|
| 10% | $25,000 | $225,000 | Aggressive; thin liquidity/default buffer |
| 20% | $50,000 | $200,000 | **Recommended starting point** |
| 25% | $62,500 | $187,500 | Conservative; strongest liquidity story |

## 3. Required Borrower Rate to Sustain 25% Depositor APY

At full $250,000 capacity, 20% reserve (→ $200,000 lendable), targeting
$62,500/year total depositor yield (25% × $250,000):

```
Required interest income on lendable capital
  = target depositor yield + protocol opex + protocol fee target + expected bad debt

Assume (illustrative, must be replaced with real underwriting data):
  target depositor yield        = $62,500
  protocol fee (2% of vault)    = $5,000
  opex (1% of vault)            = $2,500
  expected default rate (3%
    of lendable, i.e. of $200k) = $6,000

  Total required interest income = $62,500 + $5,000 + $2,500 + $6,000
                                  = $76,000

Required borrower APR on $200,000 lendable
  = $76,000 / $200,000 = 38%
```

**This protocol requires borrowers to pay roughly high-30s% APR for the
depositor side to net a real 25% APY**, given 20% reserve, 3% default
assumption, and the fee/opex load above. That is a high-yield private-credit
rate, not a conventional lending rate — the borrower pool and use of funds
must genuinely support that pricing (e.g., short-term bridge lending,
revenue-based financing) or the depositor target must come down.

### Sensitivity table (reserve vs. required borrower APR)

| Reserve | Lendable | Required borrower APR* |
|---|---|---|
| 10% | $225,000 | ~34% |
| 20% | $200,000 | ~38% |
| 25% | $187,500 | ~41% |

*Holding fee/opex/default assumptions constant; higher reserve → less
capital working → higher rate needed on what remains lent to hit the same
depositor target.

**Action item before launch: replace the 3% default-rate and fee/opex
assumptions with real numbers from the actual lending strategy/borrower
pipeline. If sustainable borrower demand at ~35–40% APR does not exist, the
25% depositor APY target is not currently fundable and must be revised
downward or the strategy redesigned (e.g., higher utilization, lower opex,
different asset class).**

## 4. Break-Even / Shortfall Handling

If realized revenue in a period is less than the periodic accrual owed to
depositors:

- Distribute only `AVAILABLE_DISTRIBUTABLE_YIELD` (see Protocol
  Architecture §5).
- Carry the shortfall forward as `outstandingYield` per position (not lost,
  just delayed) — unless/until reserve or subsequent revenue covers it.
- Surface a visible "distribution partially funded" state on the dashboard
  for transparency; never silently pay out unbacked amounts.

## 5. Growth / Utilization Path

Recommend not offering 25% at $0 vault size — model utilization ramping
with vault size:

| Vault size | Reserve (20%) | Lendable | Realistic near-term borrower demand? |
|---|---|---|---|
| $25,000 | $5,000 | $20,000 | Small, easier to fully deploy — validate strategy at low stakes first |
| $100,000 | $20,000 | $80,000 | Mid — confirm underwriting pipeline scales |
| $250,000 (cap) | $50,000 | $200,000 | Full cap — requires proven borrower demand at ~38% APR |

Recommend launching with a lower effective cap (or soft cap) below
$250,000 until the borrower pipeline is proven at the required rate, then
raising toward the $250,000 hard cap.

## 6. Open Financial Questions (require real data before launch)

1. Who are the actual borrowers, and can they sustainably service ~35–40%
   APR? What's the realistic addressable demand at $200k lendable?
2. What's a defensible expected default rate for this borrower segment
   (not a guess — underwriting-based)?
3. What are actual opex costs (audits, infra, admin, legal, compliance)?
4. Should protocol fee scale with performance (e.g., fee only on realized
   yield above a hurdle) rather than flat % of vault?
5. Should the 25% APY target itself be variable/algorithmic based on
   realized utilization and borrower rates, rather than a fixed marketed
   number? (Reduces the risk of ever advertising an unfunded rate.)
