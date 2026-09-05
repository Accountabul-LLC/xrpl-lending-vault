# JRPU Lending Protocol — XRPL Devnet

The JRPU Lending Academy has two tracks: **Basic** (Depositor → Vault → Borrower) and **Institutional** (originator, underwriter, vault owner vs administrator, loan broker, first-loss, servicing, credentials). Then a live XRPL Devnet lab.

Native [XLS-65](https://xls.xrpl.org/xls/XLS-0065-single-asset-vault.html) + [XLS-66](https://xls.xrpl.org/xls/XLS-0066-lending-protocol.html). No custom smart contract. No real funds.

## Run

```bash
npm install
npm run dev
```

Site: `http://localhost:5173` (Academy first, then **Live DevNet lab**)  
Ledger: `wss://s.devnet.rippletest.net:51233` — the UI banners **NETWORK: XRPL DEVNET**. These are test assets, not Mainnet.

The lab is an 8-step guided workflow: Fund wallets → Create vault → Deposit → Create Loan Broker (initialize the Protocol Loan Book) → Originate loan → Pay → Withdraw → Verify. Buttons stay disabled until prerequisites are met and show **why**. Reset Session clears local browser state only; it does not rewind XRPL DevNet.

DevNet faucet wallets and object IDs persist in `localStorage` so a refresh does not wipe the session. Never paste a mainnet seed.

```bash
npm test              # unit / regression tests
npm run test:devnet   # 20 consecutive live DevNet lifecycle runs
```

## Verified live on Devnet

| Transaction | Notes |
|---|---|
| `VaultCreate` | `Asset: { currency: "XRP" }` is required even for native XRP |
| `VaultDeposit` / `VaultWithdraw` | Share MPT issued by the vault |
| `LoanBrokerSet` | Must be the **vault owner** (`tecNO_PERMISSION` otherwise) |
| `LoanBrokerCoverDeposit` / `Withdraw` | Same owner-only rule |
| `LoanSet` | Broker signs, borrower cosigns (`signLoanSetByCounterparty`) |
| `LoanPay` | Installment floor ~1.007 XRP at 10 XRP / 37% / 12 payments |
| `LoanManage` | Impair / unimpair / default (`tecTOO_SOON` until grace elapses) |
| `LoanDelete` | Only after `PaymentRemaining == 0` |

XLS-66 does **not** allow a separate cover-funder account. First-loss capital is deposited by `LoanBroker.Owner`.

## Design docs

- `JRPU_PROTOCOL_ARCHITECTURE.md` — vault rules, cap, yield, borrowing
- `JRPU_FINANCIAL_MODEL.md` — why 25% depositor APY implies ~37% borrower APR
- `JRPU_THREAT_MODEL.md`
- `JRPU_COMPLIANCE_QUESTIONS.md` — hard gate before any mainnet / real-funds deployment
