# RED TEAM TEST PLAN — JRPU Academy + Devnet Lab

Environment: local Vite (`http://127.0.0.1:5173`) and static build inspection. XRPL Devnet used only for synthetic faucet wallets and read-only ledger_entry checks. No mainnet. No unbounded faucet spam.

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
object-ID integrity, irreversible lab actions.
```

---

## Critical

TEST-001 Seed persistence in plaintext localStorage  
Priority: Critical  
Reason: ASSET-001. Confirm `jrpu-devnet-session` stores family seeds after fund, survives reload, and is readable by same-origin script.

TEST-002 Cross-role key colocation  
Priority: Critical  
Reason: One origin holds operator + depositor + borrower. Prove a single `localStorage.getItem` returns all roles.

TEST-003 Same-origin script can sign without UI  
Priority: Critical  
Reason: ASSET-002. Using a funded synthetic wallet, call `Wallet.fromSeed` + inspect that `src/lib/xrpl.ts` signs entirely in the browser (no hardware / no second factor).

TEST-004 Object-ID substitution  
Priority: Critical  
Reason: ASSET-003. Tamper `vaultId` in storage/state and show the Deposit path will use the attacker-supplied ID with no owner binding.

TEST-005 Dual-key LoanSet in one function  
Priority: Critical  
Reason: ASSET-006. Static + runtime proof that `createLoan(broker, borrower, ...)` applies both signatures in-process.

---

## High Value

TEST-006 Content-Security-Policy and framing headers  
Priority: High Value  
Reason: Missing CSP/`frame-ancestors` turns any XSS or clickjack into key theft (T-01, T-07).

TEST-007 Dev server LAN bind  
Priority: High Value  
Reason: `server.host: true` exposes the signing lab on 0.0.0.0:5173.

TEST-008 Amount / numeric validation  
Priority: High Value  
Reason: UI strings pass to `xrpToDrops` / APR packing with no schema. Probe empty, negative, overflow, extra decimals, `NaN`, hex.

TEST-009 Mainnet seed load path  
Priority: High Value  
Reason: `Wallet.fromSeed` is network-agnostic; app never checks classic address network. Prove a non-faucet seed in storage is accepted. Do **not** use a real mainnet-funded seed — use a generated unused seed.

TEST-010 XSS / DOM sinks  
Priority: High Value  
Reason: Search `dangerouslySetInnerHTML`, `innerHTML`, open URL params. Exercise `?lesson=` and `?track=` for injection.

TEST-011 Click-once irreversible actions  
Priority: High Value  
Reason: Default, withdraw, re-fund have no confirm. Document as authorization UX failure.

TEST-012 Production bundle secrets / source maps  
Priority: High Value  
Reason: `npm run build` then inspect `dist` for seeds, source maps, `process.env` leaks.

---

## Useful

TEST-013 npm audit / lockfile advisories  
Priority: Useful  
Reason: Signing bundle dependencies.

TEST-014 Error leakage  
Priority: Useful  
Reason: `console.error` + activity log on failed `ledger_entry`.

TEST-015 Faucet unthrottled fund button  
Priority: Useful  
Reason: No client rate limit. Prove in code; do not loop-fund.

TEST-016 Restore without key/vault binding  
Priority: Useful  
Reason: Reload restores IDs even if seeds were cleared or mismatched.

TEST-017 Academy simulation not a ledger boundary  
Priority: Useful  
Reason: Confirm classroom actions never call `src/lib/xrpl.ts`.

---

## Low Priority

TEST-018 Verbose WebGL error strings in UI  
Priority: Low Priority  
Reason: `webglError` interpolated into DOM; recon only.

TEST-019 Historical GitHub Pages / `allowedHosts: true`  
Priority: Low Priority  
Reason: Removed in `187bdd0`; residual if an old host is still live.

---

## Not Applicable

TEST-N01 Server authentication / session cookies / JWT  
Status: Not Applicable  
Reason: No application backend or login.

TEST-N02 Object-level API IDOR against private records  
Status: Not Applicable  
Reason: No app API; XRPL ledger_entry data is public by design.

TEST-N03 SQL / NoSQL injection  
Status: Not Applicable  
Reason: No datastore.

TEST-N04 File upload / path traversal / SSRF to internal cloud  
Status: Not Applicable  
Reason: No uploads, no server.

TEST-N05 Smart contract bytecode / proxy admin  
Status: Not Applicable  
Reason: Native XLS-65/66 only; no app-authored contract.

TEST-N06 Marketplace / DRM / AI prompt injection  
Status: Not Applicable  
Reason: Modules not present.

TEST-N07 Live mainnet fund movement  
Status: Not Applicable  
Reason: Out of authorized scope; hardcoded Devnet WSS.

TEST-N08 Unbounded faucet DoS  
Status: Not Applicable as an executed test  
Reason: Authorization forbids uncontrolled resource exhaustion of third-party faucet.
