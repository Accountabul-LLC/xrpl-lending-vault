# READY FOR RETEST

Red Team finding: **RT-001**  
Blue Team task: **BT-001**  
Status: READY FOR RETEST (not CLOSED)  
Fix commit: `cc04f3d4c9c8cbe95aa6828de7471406ec318c9d`  
Build: `npm run build` then `npm run preview` (or `npm run dev`)

Independent Red Team must reproduce the **original attack conditions**, not only review the diff.

## Original attack

1. Open Live Devnet Lab and fund one or more roles **or** plant  
   `localStorage['jrpu-devnet-session'] = { seeds: { owner, depositor, borrower }, vaultId, ... }`  
   with classic family seeds (`sEd…`).
2. Read `localStorage.getItem('jrpu-devnet-session')`.
3. Pre-fix: JSON contained usable `seeds.*` values.

## Expected post-fix behavior

- After Fund wallet, `localStorage.getItem('jrpu-devnet-session')` is only  
  `{ vaultId, loanBrokerId, loanId }` — no seed, private key, or `seeds` object.
- Planted legacy `seeds` are stripped on Lab mount; activity log includes  
  `Discarded stored signing keys. Keys are not saved in this browser.`
- Planted seeds do **not** become `Wallet` identities (addresses stay `—` until Fund).
- Public IDs still persist (vault/loan book/loan).
- Authorized Fund wallet still creates a faucet wallet and shows a truncated address.
- Refresh discards signing keys (re-fund required). That is intended.

## Exact retest steps

```text
npm ci
npm test
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

1. Open `http://127.0.0.1:4173/` → Live Devnet lab.
2. Confirm storage JSON has no `seeds` after clicking Fund wallet (one synthetic faucet call is enough).
3. Set a legacy payload with three generated unused seeds (not mainnet-funded) and reload Lab; confirm purge.
4. Confirm `Wallet.fromSeed` is not called with storage contents (no restored addresses from planted seeds).

## Limitations

- In-tab `Wallet` objects remain readable by XSS/extensions (RT-002 class). Out of scope for this retest.
- Do not use real mainnet seeds.
- Do not hammer the Devnet faucet.

## Adjacent coverage in this fix

Hydration from storage (`walletsFromSeeds` / RT-012 persistence path) was removed because it is the same secret-at-rest class. Full RT-012 (arbitrary seed as identity via other channels) is not claimed fixed.
