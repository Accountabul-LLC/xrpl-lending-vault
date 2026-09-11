export const BASIC_GLOSSARY: Record<string, string> = {
  'Maximum Vault Size':
    'Hard ceiling on depositor principal the vault will accept. JRPU’s test target is $250,000.',
  'Minimum Deposit': 'Smallest amount a liquidity provider can add in one deposit.',
  'Maximum Deposit': 'Largest single-depositor add, used to limit concentration risk.',
  'Loan Duration': 'How long a borrower has to repay, from first draw to final payment.',
  'Maximum Loan-to-Vault Ratio':
    'Share of vault capital that may be lent at once. The rest stays liquid for withdrawals and buffers.',
  Principal: 'The amount borrowed. Interest is charged on this, not the other way around.',
  APR: 'Annual Percentage Rate — simple yearly cost of the loan, without compounding.',
  APY: 'Annual Percentage Yield — the compounding return a depositor is targeting, not a guarantee.',
  Term: 'The scheduled life of the loan (for example, 12 months).',
  'Payment frequency': 'How often the borrower must pay — monthly in the JRPU teaching example.',
  Collateral: 'An asset pledged to reduce loss if the borrower fails to repay.',
  Default: 'The borrower has not performed under the agreement after any grace period.',
  'Origination fee': 'A one-time fee taken when the loan is created, usually not depositor yield.',
  Points: 'An origination charge expressed as a percent of principal (1 point = 1%).',
  Liquidity:
    'Capital sitting in the vault and available to lend or return to depositors right now.',
  'Liquidity provider':
    'A depositor. They provide capital to the vault; they do not buy or own the vault.',
  Interest: 'The cost of borrowing — the portion of repayment that becomes depositor yield.'
}
