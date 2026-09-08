# SECURITY REMEDIATION HANDOFF

Red Team Assessment Date: 2026-09-08  
Environment: authorized local sandbox (Vite preview + project Vite 5.4.21)  
Application Type (from profile): Educational XRPL lending academy + in-browser Devnet wallet lab  
Application Version: 0.1.0  
Commit / Build Tested: base `e22714d`; assessment artifacts on `cursor/red-team-security-review-93c7`  
Red Team Tester: Adaptive Red Team (solo)  
Blue Team Owner: `skills/adaptive-blue-team` (not executed in this engagement)  
Risk Tier: 4  
Selected Red Team Persona: Wallet + blockchain + frontend + business-logic application security engineer  

Do not close findings on code review alone. Independent behavioral retest is required (`READY_FOR_RETEST.md` after Blue Team work).

Full evidence: `RED_TEAM_REPORT.md`. Profile: `APPLICATION_SECURITY_PROFILE.md`. Tests: `RED_TEAM_TEST_PLAN.md`.

---

## BT-001

Source Finding: RT-001  
Severity: HIGH  
Status: OPEN  

Issue:
Classic family seeds for lab wallets are persisted as plaintext JSON in `localStorage['jrpu-devnet-session']`.

Affected Component:
`src/lab/DevnetLab.tsx` persist/`loadSession`

Failed Security Property:
Confidentiality of ASSET-001

Root Cause:
Session convenience stores raw `wallet.seed` with no wrapping, TTL isolation, or external signer.

Required Fix:
Blue Team’s choice: eliminate seed persistence, wrap keys, or move signing to an external wallet so this origin never handles family seeds.

Tests Required:
- Authorized Fund wallet still works for the classroom flow
- After Fund, storage must not contain a usable seed/private key
- Adjacent: Re-fund and Clear session

Expected Result:
Same-origin `localStorage.getItem` cannot reconstruct a signing key.

Regression Test: Required

---

## BT-002

Source Finding: RT-002  
Severity: HIGH  
Status: OPEN  

Issue:
Operator, depositor, and borrower secrets share one document and one storage object.

Affected Component:
`DevnetLab` role map / `STORAGE_KEY`

Failed Security Property:
Authorization / isolation

Root Cause:
Demo UX treats three XRPL principals as tabs in one SPA.

Required Fix:
Separate signing contexts per role (origin, iframe with unique origin, or external wallets).

Tests Required:
- Each role can still complete its Devnet happy path in a classroom setting
- A script in the Academy document cannot read operator and borrower keys together

Expected Result:
Cross-role key colocation is gone.

Regression Test: Required

---

## BT-003

Source Finding: RT-003  
Severity: HIGH  
Status: OPEN  

Issue:
`vaultId` / `loanBrokerId` / `loanId` restore without binding to the session’s operator or user intent. Attacker-supplied VaultID is shown and would be used by Deposit.

Affected Component:
`loadSession`, `handleDeposit` / withdraw / loan actions

Failed Security Property:
Integrity of ASSET-003

Root Cause:
IDs treated as trusted session state.

Required Fix:
Bind objects to creating account; fail closed on mismatch; explicit destination confirm.

Tests Required:
- Honest restore of a vault created in-session still works
- Tampered vaultId is rejected or requires a blocking confirm that displays owner account
- Deposit must not use an unbound ID silently

Expected Result:
Confused-deputy deposit path is denied.

Regression Test: Required

---

## BT-004

Source Finding: RT-004  
Severity: HIGH  
Status: OPEN  

Issue:
`createLoan` applies broker and borrower signatures in one process / one click.

Affected Component:
`src/lib/xrpl.ts` `createLoan`; `handleCreateLoan`

Failed Security Property:
Authorization / non-repudiation

Root Cause:
Classroom dual-key possession.

Required Fix:
Split borrower consent so operator UI cannot supply the counterparty signature from colocated keys.

Tests Required:
- Authorized two-party origination still possible
- Operator-only click cannot finish LoanSet

Expected Result:
Borrower signature is not available to the operator document.

Regression Test: Required

---

## BT-005

Source Finding: RT-005  
Severity: MEDIUM  
Status: OPEN  

Issue:
No CSP / frame-ancestors; app loads inside a cross-origin iframe.

Affected Component:
`index.html` and hosting / Vite headers

Failed Security Property:
UI-intent integrity

Root Cause:
Default Vite HTML/headers.

Required Fix:
CSP + `frame-ancestors 'none'` on all hosted responses (dev, preview, production).

Tests Required:
- App still connects to Devnet WSS
- Cross-origin iframe does not receive the SPA documents

Expected Result:
Clickjack and inline-script gadgets are constrained.

Regression Test: Required

---

## BT-006

Source Finding: RT-006  
Severity: MEDIUM  
Status: OPEN  

Issue:
`server.host: true` publishes the signing lab on the LAN.

Affected Component:
`vite.config.ts`

Failed Security Property:
Confidentiality (dev)

Root Cause:
Convenience bind for demos (historical tunnel `allowedHosts: true` was removed; LAN bind remains).

Required Fix:
Loopback by default.

Tests Required:
- `npm run dev` works on localhost
- LAN IP does not serve the app unless explicitly enabled

Expected Result:
No `Network: http://<lan-ip>` in default output.

Regression Test: Required

---

## BT-007

Source Finding: RT-007  
Severity: MEDIUM  
Status: OPEN  

Issue:
Amount/APR/payment fields are raw strings; `xrpToDrops("-1")` and `"1e6"` succeed; NaN packing for APR.

Affected Component:
`DevnetLab` inputs + `src/lib/xrpl.ts` helpers

Failed Security Property:
Transaction correctness

Root Cause:
Ledger is treated as the only validator; UI still signs first.

Required Fix:
Client schema before `autofill`/`sign`.

Tests Required:
- Valid 20 XRP deposit still works
- Negative, scientific notation, empty, and non-numeric values never reach `wallet.sign`

Expected Result:
Invalid amounts throw in UI, no signed blob.

Regression Test: Required

---

## BT-008

Source Finding: RT-008  
Severity: LOW  
Status: OPEN  

Issue:
Default, withdraw, Re-fund, origination have no confirmation step.

Affected Component:
`DevnetLab` buttons

Failed Security Property:
Intentional authorization

Root Cause:
Demo click-speed.

Required Fix:
Extra confirm for irreversible / key-rotating actions.

Tests Required:
- Happy path still completable
- First click alone does not Default or Re-fund

Expected Result:
Accidental one-click destructive sign is blocked.

Regression Test: Required

---

## BT-009

Source Finding: RT-009  
Severity: MEDIUM  
Status: OPEN  

Issue:
Academy statically imports DevnetLab; production main chunk includes full `xrpl` signer.

Affected Component:
`src/App.tsx`

Failed Security Property:
Attack-surface minimization / XSS impact

Root Cause:
Eager import.

Required Fix:
Dynamic import of the lab route/view.

Tests Required:
- Academy lessons render without the signing chunk
- Opening Lab still loads and signs

Expected Result:
Network panel on Academy-only visit has no `xrpl` signing payload.

Regression Test: Required

---

## BT-010

Source Finding: RT-010  
Severity: MEDIUM  
Status: OPEN  

Issue:
`npm audit`: Vite/esbuild path-traversal and CORS issues; elliptic via node polyfills.

Affected Component:
`package.json` / lockfile / `vite-plugin-node-polyfills`

Failed Security Property:
Dev-server confidentiality; supply chain

Root Cause:
Vite 5.4.x and polyfill graph.

Required Fix:
Patched Vite; minimize polyfills.

Tests Required:
- `npm run build` and `npm run dev` still work
- Audit no longer lists the Vite high advisory

Expected Result:
Cleaner audit; LAN/dev file disclosure reduced.

Regression Test: Required

---

## BT-011

Source Finding: RT-011  
Severity: LOW  
Status: OPEN  

Issue:
`fundWallet` has no client throttle; Re-fund overwrites seeds.

Affected Component:
`fundRole`

Failed Security Property:
Availability / third-party faucet abuse

Root Cause:
Unbounded button.

Required Fix:
Cooldown; warn before replacing a seed.

Tests Required:
- Single fund still works
- Burst clicks do not fan out N faucet calls

Expected Result:
Rate limited.

Regression Test: Not practical against real faucet (use fake client or spy).

---

## BT-012

Source Finding: RT-012  
Severity: MEDIUM  
Status: OPEN  

Issue:
Arbitrary family seed in storage becomes a signing identity; network is not checked.

Affected Component:
`walletsFromSeeds`

Failed Security Property:
Authentication of wallet origin

Root Cause:
`Wallet.fromSeed` with no session allowlist.

Required Fix:
Only hydrate seeds this app minted, or block with a hard warning.

Tests Required:
- Faucet-funded session restores
- Foreign seed in JSON does not silently sign

Expected Result:
Mainnet-capable material cannot be quietly loaded.

Regression Test: Required

---

## Suggested order

P0: BT-001, BT-002, BT-003, BT-004 (key material and signing intent)  
P1: BT-005, BT-006, BT-007, BT-009, BT-010, BT-012  
P2: BT-008, BT-011  

When implemented, write `READY_FOR_RETEST.md` listing each `RT-###` and the build hash. Red Team retest must reproduce original attack conditions, not only review diffs.
