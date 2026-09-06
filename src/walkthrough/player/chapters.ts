export type Chapter = {
  n: number
  title: string
  sceneId: string
  happening: string
  who: string
  why: string
  actionLabel: string
}

export const CHAPTERS: Chapter[] = [
  {
    n: 1,
    title: 'Fund Wallets',
    sceneId: 'step1_intro',
    happening: 'Three DevNet accounts are created and funded so they can pay XRPL reserves and fees.',
    who: 'Vault Owner / Loan Broker, Depositor, and Borrower.',
    why: 'Nothing on XRPL can happen until funded accounts exist. Funding is infrastructure, not a deposit.',
    actionLabel: 'Fund All Wallets'
  },
  {
    n: 2,
    title: 'Create Vault',
    sceneId: 'step2_intro',
    happening: 'The operator creates a single-asset lending vault with a maximum capacity ceiling.',
    who: 'Vault Owner / Loan Broker signs VaultCreate.',
    why: 'The vault is the pool. Capacity is a hard limit so deposits cannot overflow it.',
    actionLabel: 'Create Vault'
  },
  {
    n: 3,
    title: 'Deposit Liquidity',
    sceneId: 'step3_intro',
    happening: 'The depositor places XRP into the vault and receives vault shares.',
    who: 'Depositor.',
    why: 'Shares are a claim on the pool — not a promised return and not ownership of the vault.',
    actionLabel: 'Deposit 10,000'
  },
  {
    n: 4,
    title: 'Create Loan Broker',
    sceneId: 'step4_explain',
    happening: 'The Protocol Loan Book UI is created by writing a LoanBroker object on XRPL.',
    who: 'Vault Owner / Loan Broker.',
    why: 'The Loan Broker connects the vault to individual loans. The Loan Book is only the application view.',
    actionLabel: 'Create Loan Broker'
  },
  {
    n: 5,
    title: 'Originate Loan',
    sceneId: 'step5_intro',
    happening: 'Broker and borrower both sign loan terms, then LoanSet is submitted.',
    who: 'Loan Broker and Borrower.',
    why: 'Capital moves from available vault assets to the borrower. Available liquidity falls.',
    actionLabel: 'Originate Loan'
  },
  {
    n: 6,
    title: 'Make Payment',
    sceneId: 'step6_intro',
    happening: 'The borrower pays an installment. Principal reduces the balance; interest is the cost of borrowing.',
    who: 'Borrower.',
    why: 'Interest is not a guaranteed depositor return. The lab re-reads the loan after tesSUCCESS.',
    actionLabel: 'Make Payment'
  },
  {
    n: 7,
    title: 'Withdraw',
    sceneId: 'step7_intro',
    happening: 'The depositor redeems shares for available assets — not assets still out on loan.',
    who: 'Depositor.',
    why: 'Assets Total and Assets Available are different whenever capital is lent.',
    actionLabel: 'Withdraw'
  },
  {
    n: 8,
    title: 'Verify Ledger',
    sceneId: 'step8_dash',
    happening: 'The interface is checked against the validated XRPL objects and transaction receipt.',
    who: 'All parties — proof is the ledger, not the button click.',
    why: 'A hash on a validated ledger is the record. Resetting the Lab does not erase it.',
    actionLabel: 'View Technical Details'
  }
]

export const RATES = [0.75, 1, 1.25, 1.5, 2] as const

export const DESIGN_W = 1600
export const DESIGN_H = 900

export function formatPlayerTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds || 0))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}
