# RED TEAM REPORT — JRPU Lending Academy + Live Devnet Lab

Assessment date: 2026-09-08  
Environment: authorized local sandbox (`http://127.0.0.1:4173` production preview, `http://localhost:5175` Vite 5.4.21 dev)  
Application version: `jrpu-lending-dashboard@0.1.0`  
Commit / build tested: `e22714d` (base) + this branch’s documentation-only commits  
Red Team tester: Adaptive Red Team (solo)  
Mode: offensive assessment only — **no application patches**  
Risk tier: 4 (wallet / signing lab shares origin with the Academy)

```text
SECURITY PERSONA
Application:
Educational XRPL lending academy + in-browser Devnet wallet lab
Primary Role:
Application Security Engineer
Specializations:
Wallet Security Researcher
Blockchain Security Researcher
Frontend Security Specialist
Business Logic Tester
Reason:
The SPA persists XRPL family seeds in localStorage, signs vault and loan
transactions in-page, and colocates operator, depositor, and borrower keys
on one origin with no application backend.
Priority:
Seed confidentiality, signing integrity, origin isolation, amount and
object-ID integrity.
```

---

## Executive summary

This repository is not a brochure site. The Academy is an in-memory classroom, but the same SPA is a **self-custodial XRPL signing client**. Three faucet wallets (protocol operator, depositor, borrower) live in one browser origin. Family seeds are stored as plaintext JSON in `localStorage['jrpu-devnet-session']`. There is no application backend, so the browser **is** the security boundary — and it currently does not protect key material, bind vault IDs to the operator wallet, or require a second principal for borrower cosignature.

Authorized impact today is **XRPL Devnet test XRP**, not mainnet. The same code paths are mainnet-portable (`Wallet.fromSeed` is network-agnostic; Devnet WSS is hardcoded). Several findings become CRITICAL if this client is pointed at real funds or if a mainnet seed is written into the same storage key.

No DOM XSS sink was confirmed. Query parameters are coerced to a bounded lesson index / track enum. That is a real control. Missing CSP and successful cross-origin framing mean the **next** script injection or malicious page overlay becomes full wallet compromise.

Custom smart-contract, SQL, JWT, marketplace, and AI tests were not applicable. The design document `JRPU_THREAT_MODEL.md` describes an unbuilt operator-indexer architecture; this assessment attacked **what is implemented**.

---

## Attack surface (implemented)

| Surface | Notes |
| --- | --- |
| `src/lab/DevnetLab.tsx` | Session load/save, faucet fund, all lab actions |
| `src/lib/xrpl.ts` | Autofill, `wallet.sign`, `signLoanSetByCounterparty`, submit to Devnet |
| `localStorage` key `jrpu-devnet-session` | `{ seeds, vaultId, loanBrokerId, loanId }` |
| Main production chunk `dist/assets/index-*.js` (~812 kB) | Eager `xrpl` + Lab + Academy (only Three.js scene is lazy) |
| Vite `server.host: true` | `Network: http://<lan-ip>:5175/` |
| HTTP response headers | No CSP, no `frame-ancestors`, no `X-Frame-Options` |
| `wss://s.devnet.rippletest.net:51233` | Hardcoded — positive control vs mainnet |

Academy classroom (`SimulationContext`) never calls `src/lib/xrpl.ts`. Isolation is modular, not origin-level.

---

## Scope metadata

| Item | Value |
| --- | --- |
| Authorized | Local repo, local Vite, synthetic wallets, Devnet reads |
| Out of scope | Mainnet, live funds, unbounded faucet DoS, unrelated hosts |
| Prior reports | None (`READY_FOR_RETEST.md` absent) |
| Cleanup | Headless Chrome closed (ephemeral `localStorage`). No Devnet submissions. Preview/dev servers stopped. |

---

## Findings

### RT-001 — Family seeds stored in plaintext `localStorage`

- **Severity:** HIGH (CRITICAL if the same pattern is used with real-value keys)
- **Status:** confirmed
- **Component:** `src/lab/DevnetLab.tsx` (`STORAGE_KEY`, `loadSession`, persist `useEffect`)
- **Roles:** protocol operator, depositor, borrower
- **Failed property:** Confidentiality
- **Assets:** ASSET-001, ASSET-002
- **Description:** After wallets exist, the app writes classic family seeds (`sEd…`, length 31) into `localStorage` as JSON. Same-origin script, DevTools, malicious extension, or another user of the browser profile can read them without the UI ever showing the seed.
- **Impact:** Full compromise of every funded lab role. Stolen seeds sign VaultWithdraw, LoanManage, LoanPay, cover movement off-page.
- **Evidence:** Headless Chrome planted three generated seeds, then `localStorage.getItem('jrpu-devnet-session')` returned all three as plaintext (`ownerRedacted: sEd…i8LQ (len=31)`, `plaintextClassicFamilySeed: true`). After opening Live Devnet Lab, truncated addresses matched those wallets; **full seeds were not in the DOM** (positive UI control). Production bundle contains the storage key and `Wallet.fromSeed`.
- **Reproduction:**
  1. Open the app, go to Live Devnet Lab (or plant JSON under `jrpu-devnet-session`).
  2. Fund wallets **or** write `{ seeds: { owner, depositor, borrower } }`.
  3. DevTools → Application → Local Storage → `jrpu-devnet-session`.
- **Data accessed:** synthetic family seeds only (redacted in this report).
- **State before/after:** empty origin storage → JSON session with three seeds. Chrome profile discarded.
- **Cleanup:** browser closed; no ledger txs.
- **Recommended remediation (advisory):** Do not persist raw seeds. Prefer session-only memory, WebCrypto wrapping with a user secret, or an external wallet (WalletConnect / Xaman) so this origin never sees `seed`. If persistence is required for a classroom, use a dedicated origin, short TTL, and `Clear session` on hide.
- **Blue Team priority:** P0
- **Retest:** Storage must not contain a usable family seed or private key after Fund wallet.

### RT-002 — Operator, depositor, and borrower keys colocated on one origin

- **Severity:** HIGH
- **Status:** confirmed
- **Component:** `DevnetLab` `wallets` state; single `STORAGE_KEY`
- **Failed property:** Authorization / administrative isolation
- **Assets:** ASSET-001, ASSET-004, ASSET-006
- **Description:** One `getItem` returns all role seeds. XSS or an extension does not need a second hop to become the borrower *and* the protocol operator.
- **Evidence:** `single_getItem_steals_all_roles.keys = ["owner","depositor","borrower"]`.
- **Reproduction:** Same as RT-001; inspect `seeds` object keys.
- **Cleanup:** none lingering.
- **Recommended remediation:** Separate origins or separate wallet connectors per role; never keep borrower + operator material in one document.
- **Blue Team priority:** P0
- **Retest:** Compromising the Academy document must not yield operator and borrower keys together.

### RT-003 — Vault / loan object IDs are attacker-writable with no wallet binding

- **Severity:** HIGH
- **Status:** confirmed
- **Component:** `loadSession` / persist effect; `handleDeposit` uses `vaultId` from state
- **Failed property:** Integrity / authorization
- **Assets:** ASSET-003, ASSET-005
- **Description:** `vaultId` is stored next to seeds and restored without checking that `wallets.owner` created that vault or that the depositor intends that destination. A storage write (XSS, shared browser, or physical access) steers the next Deposit/Withdraw to an attacker vault.
- **Evidence:** Planted `vaultId` of 64 `A` characters. After Lab mount, UI showed that VaultID (`lab_shows_attacker_vault: true`) and storage still held it (`vaultIdPersisted: true`). Deposit handler is `depositVault(wallets.depositor, vaultId, depositAmount)` with no binding check (`DevnetLab.tsx` `handleDeposit`).
- **Reproduction:**
  1. Set `jrpu-devnet-session.vaultId` to an attacker-controlled Devnet VaultID (keep victim depositor seed).
  2. Open Lab — attacker ID is displayed and used.
  3. (Optional, Devnet) click Deposit — funds credit the attacker vault. **Not executed** in this assessment to avoid moving even test XRP under a fake ID.
- **Cleanup:** ephemeral storage only.
- **Recommended remediation:** Bind IDs to the creating account; show full ID + owner and require explicit confirm; reject restore when `fetchVault` owner ≠ session operator.
- **Blue Team priority:** P0
- **Retest:** Tampered `vaultId` must not remain selected for Deposit without an explicit, informed confirm that names the destination account.

### RT-004 — LoanSet dual-signature collapsed into one in-page function

- **Severity:** HIGH
- **Status:** confirmed (code + bundle); behavioral submit not sent to ledger (no real borrower consent channel exists to test)
- **Component:** `src/lib/xrpl.ts` `createLoan`; `DevnetLab.handleCreateLoan`
- **Failed property:** Authorization / non-repudiation
- **Assets:** ASSET-006, ASSET-002
- **Description:** XLS-66 requires broker + borrower signatures. The client holds both `Wallet` objects and calls `broker.sign` then `signLoanSetByCounterparty(borrower, decoded)` in one function. Originate loan is a single click. XSS or a confused user authorizes **both** sides.
- **Evidence:** `createLoan` in `src/lib/xrpl.ts`; production chunk contains `signLoanSetByCounterparty`. UI copy says both sign; implementation never splits consent.
- **Reproduction:** Read `createLoan`; click Originate loan when owner + borrower wallets exist.
- **Recommended remediation:** Borrower signature must happen in a context that cannot read the operator seed (separate wallet, separate origin, or hardware). Demo mode should still not auto-cosign without a distinct borrower confirm that cannot be fused with the operator click.
- **Blue Team priority:** P0
- **Retest:** Operator click must not be able to apply the borrower signature from keys stored in the same document.

### RT-005 — Missing security headers; SPA is frameable (clickjacking)

- **Severity:** MEDIUM
- **Status:** confirmed
- **Component:** `index.html`, Vite preview/dev responses
- **Failed property:** Integrity of user intent (UI redress)
- **Assets:** ASSET-002, ASSET-004
- **Description:** Preview `curl -sI` returned no `Content-Security-Policy`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, or `X-Content-Type-Options`. Document has no CSP meta. A page on `http://127.0.0.1:4174` loaded the app in an iframe and the framed document requested `/`, the 812 kB signing bundle, CSS, and `SceneMount`.
- **Evidence:** Header dump; clickjack test `framedAppRequests` count 4 including `index-*.js`.
- **Reproduction:** `<iframe src="http://127.0.0.1:4173/">` from another origin.
- **Recommended remediation:** CSP (`default-src 'self'`; connect-src Devnet WSS only; `frame-ancestors 'none'`), `X-Content-Type-Options: nosniff`. Hosting layer (or `vite-plugin-static-copy` / provider headers) must send them in production too.
- **Blue Team priority:** P1
- **Retest:** Framing must fail; CSP present on HTML.

### RT-006 — Dev server binds the signing lab on the LAN

- **Severity:** MEDIUM (development)
- **Status:** confirmed
- **Component:** `vite.config.ts` `server.host: true`
- **Failed property:** Confidentiality of ASSET-001 on the local network
- **Evidence:** Project Vite 5.4.21 log `Network: http://172.30.0.2:5175/`; `curl` to that address returned 200.
- **Reproduction:** `npm run dev` on a shared network; visit `http://<host-lan-ip>:5175/` from another machine.
- **Recommended remediation:** Default `host: '127.0.0.1'`; opt-in LAN bind. Do not reintroduce historical `allowedHosts: true`.
- **Blue Team priority:** P1
- **Retest:** Default `npm run dev` must not advertise a Network URL; LAN curl should fail.

### RT-007 — Unvalidated amounts and rates enter the signing path

- **Severity:** MEDIUM
- **Status:** confirmed
- **Component:** `DevnetLab` inputs; `xrpToDrops` / `parseFloat(aprPercent) * 1000` / `parseInt(paymentTotal)`
- **Failed property:** Transaction correctness / input validation
- **Evidence (Node, `xrpl@4.1.0`):**
  - `xrpToDrops("-1")` → `"-1000000"`
  - `xrpToDrops("1e6")` → `"1000000000000"` (1,000,000 XRP)
  - APR `abc` → packed `"NaN"`; paymentTotal `""` → `"NaN"`
- **Impact:** XSS or a mistaken paste can construct absurd or negative Amounts. Ledger may reject; it may also submit a huge `1e6` deposit if the account has the balance. UI is the last human checkpoint and does not check.
- **Recommended remediation:** Schema: positive decimal, max 6 fractional digits, cap vs known balances; disable submit on invalid.
- **Blue Team priority:** P1
- **Retest:** Negative, `1e6`, empty, and non-numeric values must not call `wallet.sign`.

### RT-008 — Irreversible lab actions have no confirmation

- **Severity:** LOW
- **Status:** confirmed
- **Component:** Default / Withdraw / Re-fund / Originate — no `window.confirm`
- **Evidence:** Headless pass: Withdraw and Fund/Re-fund visible; `windowConfirmInPage: false`. Source has no `confirm(`.
- **Impact:** Accidental Default or Re-fund (orphans previous seed — availability of ASSET-001).
- **Recommended remediation:** Typed confirm for Default, cover withdraw, Re-fund, and dual-sign origination.
- **Blue Team priority:** P2
- **Retest:** Those actions require an extra explicit step.

### RT-009 — Signing stack is eagerly loaded on Academy pages

- **Severity:** MEDIUM
- **Status:** confirmed
- **Component:** `src/App.tsx` static import of `DevnetLab`
- **Evidence:** `dist/assets/index-*.js` (811,866 bytes) contains `jrpu-devnet-session`, `s.devnet.rippletest.net`, `VaultDeposit`, `fundWallet`, `signLoanSetByCounterparty`. Only the Three.js scene is code-split.
- **Impact:** Every Academy visitor downloads a full XRPL signer. Academy XSS inherits `xrpl` without loading Lab.
- **Recommended remediation:** `lazy(() => import('./lab/DevnetLab'))` so the signer is not on the lesson path.
- **Blue Team priority:** P1
- **Retest:** Academy-only visit must not download the `xrpl` signing chunk.

### RT-010 — Development-toolchain CVEs (Vite / esbuild / polyfill elliptic)

- **Severity:** MEDIUM (dev); LOW in production static hosting
- **Status:** confirmed via `npm audit`
- **Evidence:** 8 issues; Vite `<=6.4.2` includes GHSA-fx2h-pf6j-xcff (high, Windows `server.fs.deny` bypass), GHSA-67mh-4wv8-2f99 (esbuild CORS), GHSA-848j-6mx2-7j84 (`elliptic` via `vite-plugin-node-polyfills`). App signing uses `xrpl` / noble curves, not `elliptic`, for XRPL keys — polyfill still ships in the client toolchain.
- **Recommended remediation:** Upgrade Vite to a patched 5.4.x / 6.4.3+ / 8.x as Blue Team chooses; drop or isolate node polyfills if Buffer can be provided more narrowly.
- **Blue Team priority:** P1 (dev), P2 (prod static)
- **Retest:** `npm audit` no longer reports the Vite high advisory on the resolved tree.

### RT-011 — Unthrottled Devnet faucet button

- **Severity:** LOW
- **Status:** confirmed (code). **Not load-tested** (authorization forbids faucet DoS).
- **Component:** `fundRole` → `client.fundWallet()` with no cooldown
- **Impact:** Public host could drain Ripple’s faucet; Re-fund also overwrites seeds (ties to RT-008).
- **Recommended remediation:** Client cooldown; disable Re-fund unless session cleared.
- **Blue Team priority:** P2
- **Retest:** Rapid clicks do not issue parallel fund requests.

### RT-012 — `Wallet.fromSeed` accepts any network’s family seed

- **Severity:** MEDIUM
- **Status:** confirmed
- **Component:** `walletsFromSeeds` → `Wallet.fromSeed(seed)` with no network/tag check
- **Evidence:** Generated unused seed loaded successfully; seeds are network-agnostic. App never talks to mainnet (hardcoded Devnet WSS — **positive control**), but a pasted/malware-inserted mainnet seed would sit in plaintext storage (RT-001) even if submits target Devnet.
- **Recommended remediation:** Refuse restore of seeds not created by this session’s faucet; optional allowlist of addresses funded in-app.
- **Blue Team priority:** P1
- **Retest:** Arbitrary seed in `localStorage` should not become a signing identity without a loud, blocking warning (better: reject).

---

## Tests that did not yield a vulnerability

| Test | Result |
| --- | --- |
| TEST-010 XSS / `?lesson=` / `?track=` | URL coerced to `?lesson=1`; no dialog; no `innerHTML` / `dangerouslySetInnerHTML` |
| Production sourcemaps / `process.env` | No `.map` files; no `process.env` string in main chunk; no hardcoded `sEd` secrets |
| Academy ledger coupling | Only `DevnetLab` and `src/lib/xrpl.ts` import `xrpl` |
| Custom smart contracts / SQL / JWT / IDOR API | Not applicable |

---

## Residual risk

- No XSS today, but one future sink + RT-001 is game over.
- Devnet-only WSS is the main brake against accidental mainnet signing; it does not protect seed confidentiality.
- Design-doc threats (operator indexer, Payment Channels, SignerListSet) remain unbuilt — do not treat this SPA as satisfying `JRPU_THREAT_MODEL.md`.
- Dependency polyfills and Three.js increase XSS/gadget surface over time.

---

## Stop condition

Authorized local attack surface covered. Findings documented. Cleanup complete. Application code **not** modified. Handoff: `RED_TEAM_TO_BLUE_TEAM_HANDOFF.md`.
