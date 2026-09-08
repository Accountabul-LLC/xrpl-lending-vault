# APPLICATION SECURITY PROFILE

Assessment date: 2026-09-08  
Target: local repository `Accountabul-LLC/xrpl-lending-vault` (commit `e22714d`) plus authorized local Vite stack  
Environment: operator-owned local sandbox. XRPL Devnet (`wss://s.devnet.rippletest.net:51233`) is in scope only as the client’s configured test ledger. Production, mainnet, live funds, and unrelated third-party systems are out of scope.

---

Application Type:
Educational lending academy (static/interactive classroom) plus in-browser XRPL Devnet wallet and transaction-signing lab

Primary Function:
Teach Basic and Institutional XRPL lending (XLS-65 vault + XLS-66 loans) with a local-only simulation, then let an operator fund faucet wallets and submit real Devnet transactions from the same single-page app.

Highest Value Assets:
1. XRPL secret seeds / private keys for protocol operator, depositor, and borrower (ASSET-001)
2. Transaction signing authority bound to those keys (ASSET-002)
3. Ledger object identifiers that steer deposits, withdrawals, cover, and loan management (ASSET-003)
4. Browser origin that colocates Academy UI and the signing lab (ASSET-004)

Primary Security Properties:
Confidentiality of key material; Integrity of signed transactions (amount, destination, object IDs); Authorization / wallet-ownership binding; Non-repudiation of dual-signed LoanSet; Availability of persisted session keys (loss vs theft)

Risk Tier:
4 — Critical for the Live Devnet Lab (wallets, private keys, transaction signing). Academy classroom money is Tier 1, but it shares origin, bundle, and process with the lab, so the combined SPA is treated as Tier 4.

Most Important Attack Surfaces:
- `src/lab/DevnetLab.tsx` session persistence (`localStorage` key `jrpu-devnet-session`)
- `src/lib/xrpl.ts` client-side autofill + sign + submit path
- Same-origin XSS / script injection / malicious extension / shared-browser access
- Unvalidated amount and identifier fields that become signed XRPL fields
- Vite dev server bind (`host: true` → 0.0.0.0:5173)
- Missing browser isolation headers (CSP, frame-ancestors)
- Public faucet funding loop (third-party Devnet faucet)

Loaded Modules:
CORE (Authentication/Sessions as wallet-seed identity; Authorization as on-ledger signatures; Input validation; Secrets; Frontend exposure; Dependencies; Logging), FINANCIAL (vault deposit/withdraw, cover, loan principal/payment, cap), BLOCKCHAIN (wallets, signatures, XRPL transactions; no custom smart contracts)

Deferred / Not Applicable Modules:
CONTENT (no paid files, DRM, or entitlements); MARKETPLACE (no listings/orders); AI (no models/tools); Smart Contract Security (no application-authored contracts — native XRPL primitives only); Server-side session/JWT/SQL (no application backend)

Unknowns:
- Whether any remaining GitHub Pages / Vercel host still serves a prior build (repo is private; Pages workflow was removed in `187bdd0`)
- Runtime behavior of malformed `xrpToDrops` inputs until Phase 5 proof
- Whether browser extensions in a real operator environment can read `localStorage` on the deployed origin (assumed yes for any origin they are granted)

---

## Architecture inventory

| Area | Present? | Evidence |
| --- | --- | --- |
| Frontend framework | React 18 + Vite 5 + TypeScript + Tailwind + Three.js | `package.json`, `src/main.tsx` |
| Backend / runtime | not present | no server, no API routes |
| API style | XRPL WebSocket JSON-RPC via `xrpl` client | `src/lib/xrpl.ts` `Client(DEVNET_WSS)` |
| Database(s) | not present | |
| Authn system | Wallet seed = identity; faucet-created keys | `DevnetLab` `Wallet.fromSeed` |
| Authz model | XRPL account signatures; UI does not isolate roles | same React state holds owner/depositor/borrower |
| Storage | `localStorage` JSON session | `STORAGE_KEY = 'jrpu-devnet-session'` |
| Caching / queues / workers | not present | |
| Realtime | XRPL WebSocket | `wss://s.devnet.rippletest.net:51233` |
| External APIs | XRPL Devnet + faucet (`client.fundWallet`) | |
| Cloud / hosting | none in current tree; historical GitHub Pages workflow removed | `187bdd0` |
| Blockchain / wallet | XRPL XLS-65 / XLS-66, `xrpl` v4.1.0 | `src/lib/xrpl.ts` |
| Payment providers | not present (Devnet XRP only) | |
| Email / SMS / files / AI / admin IAM | not present | |
| Mobile / desktop clients | browser SPA only | |

## User model (roles that actually exist)

| Role | Supposed to do | Must not do | How distinguished |
| --- | --- | --- | --- |
| Anonymous visitor | View Academy lessons, run in-memory simulation | Sign ledger txs, hold real keys | No wallet; React state only |
| Protocol operator | Create vault, open loan book, post/withdraw cover, originate/manage/delete loans | Spend depositor capital as if it were operator-owned; use mainnet keys | `wallets.owner` seed |
| Depositor | VaultDeposit / VaultWithdraw against the session vault | Originate loans, manage loans, move operator cover | `wallets.depositor` seed |
| Borrower | Cosign LoanSet, LoanPay | Create vault, withdraw others’ vault shares, LoanManage | `wallets.borrower` seed |

Academy characters (Alice, Bob’s Construction LLC, etc.) are demo data, not principals.

## Data classification

| Data | Classification | Location |
| --- | --- | --- |
| Lesson copy, glossary, classroom balances | Public | source / UI |
| XRPL Devnet addresses, VaultID, LoanID, LoanBrokerID | Public on ledger; Internal in UI | UI + localStorage |
| Family seeds / private keys | Authentication Sensitive + Security Sensitive + Financially Sensitive | `localStorage.jrpu-devnet-session.seeds`, JS memory |
| Signed tx blobs | Security Sensitive | in-memory, then public ledger |
| Activity log strings | Internal (may include error codes) | React state |
| Simulation names/wallets | Public fiction | `defaults.ts` |

## Critical assets

| ID | Asset | Rank |
| --- | --- | --- |
| ASSET-001 | Secret seeds for operator, depositor, borrower | 1 |
| ASSET-002 | In-browser signing of Vault*, LoanBroker*, Loan* transactions | 2 |
| ASSET-003 | Session vault / loan-broker / loan IDs that direct fund movement | 3 |
| ASSET-004 | Shared SPA origin (Academy + Lab) | 4 |
| ASSET-005 | Operator first-loss cover and vault available assets (Devnet XRP) | 5 |
| ASSET-006 | Dual-signature LoanSet (broker + borrower keys in one click) | 6 |

## Trust boundaries

```text
Browser JS  →  localStorage (plaintext seeds)
Browser JS  →  XRPL Devnet WebSocket (sign then submit)
Visitor     →  Protocol operator / Depositor / Borrower  (UI tabs, not OS isolation)
Academy DOM →  Lab signing code  (same origin, same bundle)
Operator    →  Depositor capital  (protocol vs ownership — documented, UI still holds both keys)
Application →  Ripple Devnet faucet
Dev server  →  LAN (host: true)
```

## Security properties weighted for this app

Must hold: confidentiality of seeds; integrity of signed fields; wallet-ownership binding; no silent mainnet use.

Secondary: clickjacking resistance, CSP, rate limits on faucet, numeric validation, irreversible-action confirmation.

Not primary: SQL injection, DRM, marketplace IDOR, prompt injection.
