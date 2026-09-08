# BLUE TEAM CHANGE LOG

```text
Change ID: BT-CHANGE-001
Source Finding: RT-001
Blue Team Task: BT-001
Files Modified: src/lab/session.ts, src/lab/session.test.ts, src/lab/DevnetLab.tsx, README.md, package.json, package-lock.json, tsconfig.json, vite.config.ts, BLUE_TEAM_REMEDIATION_PLAN.md
Fix Summary: Stop writing family seeds to localStorage; persist public ledger IDs only; purge legacy seeds on load; do not hydrate Wallet.fromSeed from storage.
Tests Added: src/lab/session.test.ts (vitest)
Risk Notes: Refresh no longer restores signing keys (classroom UX change). In-tab memory still holds Wallet objects.
```

```text
Change ID: BT-CHANGE-002
Source Finding: RT-001
Blue Team Task: BT-001
Files Modified: n/a (runtime)
Fix Summary: Browser retest planted synthetic seeds then funded one Devnet faucet wallet.
Tests Added: headless Chrome against preview :4173
Risk Notes: One synthetic faucet wallet created on XRPL Devnet; not reused; keys never written to storage. No cleanup on-ledger required (testnet faucet account).
```
