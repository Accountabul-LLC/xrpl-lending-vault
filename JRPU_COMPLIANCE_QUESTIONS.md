# JRPU Compliance Questions — Requires Qualified Legal Review

Status: DESIGNING. Current scope is **XRPL Devnet testing with test
assets — no real user funds, no public deposits.** These questions do not
block devnet testing, but every one of them is a hard gate before any
mainnet deployment or public real-funds launch. This document identifies
regulatory questions raised by the JRPU design. **It does not answer them.** None of these are resolved by
renaming terms (e.g., calling a deposit a "membership" or yield a "reward")
— legal substance, not labels, controls how regulators classify this
product. Nothing here should be treated as legal advice.

## 1. Securities Law

- Does a pooled deposit that funds a shared lending strategy, with returns
  distributed to depositors, constitute an "investment contract" under the
  Howey test (investment of money, common enterprise, expectation of
  profit, derived from the efforts of others)? On its face, JRPU's design
  (pooled capital, protocol-managed lending strategy, yield to passive
  depositors) has multiple Howey hallmarks and should be reviewed as a
  likely security absent structuring advice from counsel.
- If deemed a security, what registration/exemption applies (Reg D, Reg CF,
  Reg A+, other)? [User's other project already has Reg CF experience per
  Accountabul context — worth involving that same counsel.]
- Does advertising a specific "25% APY target" create securities-marketing
  issues (e.g., prohibited general solicitation, performance-guarantee-like
  claims) independent of the registration question?

## 2. Lending Law

- Is JRPU itself acting as a lender (originating loans to borrowers), and if
  so, does it need state lending licenses (varies by state; some states
  require a license for making loans above certain thresholds/rates)?
- Do the borrower-side interest rates (modeled ~35–40% APR in the Financial
  Model doc) approach or exceed state usury caps? Usury limits vary widely
  by state and by lender type/exemption — this must be checked
  jurisdiction-by-jurisdiction before finalizing borrower pricing.
- Are borrowers consumers or businesses? Consumer lending triggers
  materially more regulation (TILA, state consumer-lending law) than
  commercial/business lending.

## 3. Money Transmission

- Does accepting deposits, custodying pooled funds, and later distributing
  yield/principal constitute money transmission under state law (most
  states have money transmitter licensing requirements) or federal MSB
  registration (FinCEN)?
- Does the answer change based on custody model (protocol/smart-contract
  custody vs. a legal entity holding funds)?

## 4. Custody

- Who has legal and practical custody of depositor funds at each stage —
  the smart contract, the LLC, a third-party custodian? Custody
  arrangements affect both securities and money-transmission analysis and
  also depositor protection/bankruptcy-remoteness questions.
- If real-world (off-chain) collateral or borrowers are involved, how is
  custody of that collateral legally structured (UCC filings, liens,
  escrow)?

## 5. Stablecoins / Supported Assets

- If deposits are made in a stablecoin, does the issuer's terms of service,
  reserve backing, or redemption risk create additional disclosure
  obligations to JRPU depositors?
- Does using a stablecoin change the money-transmission/securities analysis
  versus a native crypto asset or fiat?

## 6. KYC/AML

- Given pooled deposits and yield distribution, does JRPU need a KYC/AML
  program (customer identification, suspicious activity monitoring,
  recordkeeping) — likely yes if any securities or money-transmission
  registration applies, and plausibly yes as general best practice
  regardless.
- Does XRPL-native settlement change practical KYC enforcement (wallet-based
  vs. identity-based) versus obligations that may still apply at the legal
  entity level?

## 7. State-by-State Lending Requirements

- Because deposit/borrower participants could be nationwide, does JRPU need
  a state-by-state analysis of lending, money-transmission, and securities
  requirements, or can it restrict participation to specific states/
  jurisdictions at launch to reduce initial compliance surface? Geofencing
  is a common early-stage risk-reduction strategy worth discussing with
  counsel.

## 8. Marketing / Disclosure

- What disclosures are required before showing "Target APY: 25%" anywhere
  public — must it be paired with risk disclosures (non-guaranteed,
  principal-at-risk, historical-vs-projected distinction)?
- Does the "never represent yield as guaranteed unless contractually
  guaranteed and funded" design principle (already baked into the product
  requirements) need to be mirrored in formal marketing-compliance
  copy/review, not just UI logic?

## 9. Entity Structure

- Should lending activity, deposit custody, and protocol/software
  development sit in the same LLC, or be separated into distinct entities
  to isolate liability (common pattern: a lending entity vs. a technology/
  IP entity)? This is a structuring question for counsel, informed by the
  answers above.

## Summary — What Must Happen Before Any Public Launch

1. Engage securities counsel to assess Howey/investment-contract exposure
   before any public deposit functionality goes live.
2. Engage lending counsel to check usury limits and lending-license
   requirements against the actual modeled borrower APR range.
3. Determine money-transmission/custody posture and whether state MTL or
   FinCEN MSB registration is triggered.
4. Decide initial jurisdictional scope (geofencing) to bound early
   compliance exposure.
5. Build KYC/AML program requirements into the deposit flow design if
   counsel confirms it's required (do not bolt on later).
6. Have all public-facing APY/yield language reviewed by counsel before
   publication, not just by product/marketing.

**No implementation or public launch should proceed past testnet/internal
testing until at least items 1–3 have qualified legal input.**
