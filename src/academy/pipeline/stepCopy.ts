export const LESSON_STEP_UI = [
  {
    n: 1,
    title: 'Set up the participants',
    who: 'Administrator, Depositor, Borrower',
    what: 'The administrator prepares the lending environment.',
    why: 'Every action needs funded roles before capital can move.'
  },
  {
    n: 2,
    title: 'Create the vault',
    who: 'Administrator',
    what: 'Rules and maximum capacity define the lending pool.',
    why: 'The vault is where pooled capital is managed — depositors do not buy it.'
  },
  {
    n: 3,
    title: 'Deposit liquidity',
    who: 'Depositor',
    what: 'The depositor supplies capital to the lending vault.',
    why: 'Vault shares are a claim on the pool, not a promised return.'
  },
  {
    n: 4,
    title: 'Initialize lending',
    who: 'Loan Broker',
    what: 'The Protocol Loan Book is the app view of an XRPL LoanBroker.',
    why: 'The broker connects vault capacity to individual loans.'
  },
  {
    n: 5,
    title: 'Originate the loan',
    who: 'Borrower + Loan Broker',
    what: 'The borrower agrees to the loan terms.',
    why: 'The loan cannot proceed until the lending terms are established.'
  },
  {
    n: 6,
    title: 'Fund and repay',
    who: 'Vault and Borrower',
    what: 'Capital moves to the borrower, then principal and interest return.',
    why: 'Interest is the cost of borrowing — not a guaranteed depositor return.'
  },
  {
    n: 7,
    title: 'Risk and missed repayment',
    who: 'Borrower, Vault, Depositor',
    what: 'A missed payment impairs available liquidity.',
    why: 'Assets Total is not the same as Assets Available.'
  },
  {
    n: 8,
    title: 'Run the simulation',
    who: 'Everyone',
    what: 'Manipulate the completed lending world.',
    why: 'The same entities stay on stage for every action.'
  }
] as const
