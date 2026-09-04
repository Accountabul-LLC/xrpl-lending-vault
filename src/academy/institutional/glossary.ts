export const INST_LESSONS = [
  'Meet the Parties',
  'Originate the Loan',
  'Underwrite the Borrower',
  'Fund the Vault',
  'Create the Loan',
  'Service the Loan',
  'Handle Default',
  'Follow the Entire Transaction'
] as const

export type InstLessonTitle = (typeof INST_LESSONS)[number]
export type Complexity = 'simple' | 'professional' | 'institutional'
export type StructureView = 'one' | 'many'
export type Labeling = 'roles' | 'businesses'

/** Reveal layers: 0 three-party → 1 broker → 2 originator/underwriter → 3 guarantee/custody → 4 full desk. */
export function revealForComplexity(c: Complexity): number {
  if (c === 'simple') return 0
  if (c === 'professional') return 2
  return 4
}

export function complexityForReveal(level: number): Complexity {
  if (level <= 1) return 'simple'
  if (level <= 2) return 'professional'
  return 'institutional'
}

export const LAYER_HINTS = [
  'A depositor funds a vault. A borrower receives a loan from that pool.',
  'The Loan Broker is the XRPL object that connects the vault to individual loans.',
  'Someone still has to find the borrower and judge the credit — those are business roles.',
  'A guarantee and collateral custody can sit beside the native uncollateralized loan.',
  'Servicing, credentials, the asset issuer, and reporting complete an institutional desk.'
] as const

export type RoleId =
  | 'compliance'
  | 'originator'
  | 'underwriter'
  | 'broker'
  | 'vault'
  | 'admin'
  | 'depositor'
  | 'borrower'
  | 'guarantor'
  | 'custodian'
  | 'servicer'
  | 'issuer'
  | 'auditor'

export type LayerKind = 'xrpl' | 'business' | 'extra'

export type RoleMeta = {
  id: RoleId
  role: string
  short: string
  oneCompany: string | null
  manyCompany: string
  layer: LayerKind
  minReveal: number
  /** True when this party stays outside the lending company even in one-company view. */
  external: boolean
}

export const ROLE_META: Record<RoleId, RoleMeta> = {
  compliance: {
    id: 'compliance',
    role: 'Credential / Compliance Provider',
    short: 'KYC / KYB credentials for private vaults',
    oneCompany: 'Compliance Department',
    manyCompany: 'Compliance Credentials LLC',
    layer: 'business',
    minReveal: 4,
    external: false
  },
  originator: {
    id: 'originator',
    role: 'Loan Originator',
    short: 'Finds and packages the borrower',
    oneCompany: 'Origination Department',
    manyCompany: 'Origin Capital LLC',
    layer: 'business',
    minReveal: 2,
    external: false
  },
  underwriter: {
    id: 'underwriter',
    role: 'Underwriter',
    short: 'Judges repayment risk off-chain',
    oneCompany: 'Credit / Underwriting Department',
    manyCompany: 'Credit Analytics LLC',
    layer: 'business',
    minReveal: 2,
    external: false
  },
  broker: {
    id: 'broker',
    role: 'Loan Broker',
    short: 'XRPL lending operator tied to the vault',
    oneCompany: 'Loan Operations Department',
    manyCompany: 'JRPU Lending LLC',
    layer: 'xrpl',
    minReveal: 1,
    external: false
  },
  vault: {
    id: 'vault',
    role: 'Single Asset Vault',
    short: 'Pools one asset from one or more depositors',
    oneCompany: 'Treasury / Vault Department',
    manyCompany: 'JRPU Lending LLC',
    layer: 'xrpl',
    minReveal: 0,
    external: false
  },
  admin: {
    id: 'admin',
    role: 'Vault Administrator',
    short: 'Business operator of the vault — not the same as owning depositor funds',
    oneCompany: 'Treasury / Vault Department',
    manyCompany: 'JRPU Lending LLC',
    layer: 'business',
    minReveal: 2,
    external: false
  },
  depositor: {
    id: 'depositor',
    role: 'Depositor / Lender',
    short: 'Supplies capital and receives vault shares',
    oneCompany: null,
    manyCompany: '20 Depositors',
    layer: 'xrpl',
    minReveal: 0,
    external: true
  },
  borrower: {
    id: 'borrower',
    role: 'Borrower / Debtor',
    short: 'Receives proceeds and owes repayment',
    oneCompany: null,
    manyCompany: 'ABC Development LLC',
    layer: 'xrpl',
    minReveal: 0,
    external: true
  },
  guarantor: {
    id: 'guarantor',
    role: 'Guarantor',
    short: 'Optional off-chain promise to cover defined obligations',
    oneCompany: null,
    manyCompany: 'John Doe',
    layer: 'business',
    minReveal: 3,
    external: true
  },
  custodian: {
    id: 'custodian',
    role: 'Collateral Custodian',
    short: 'Holds pledged assets outside the native loan object',
    oneCompany: null,
    manyCompany: 'Custody Services LLC',
    layer: 'extra',
    minReveal: 3,
    external: true
  },
  servicer: {
    id: 'servicer',
    role: 'Loan Servicer',
    short: 'Runs notices, collections, and delinquency workflows',
    oneCompany: 'Servicing Department',
    manyCompany: 'Loan Servicing LLC',
    layer: 'business',
    minReveal: 4,
    external: false
  },
  issuer: {
    id: 'issuer',
    role: 'Asset Issuer',
    short: 'Issues the vault asset (for example RLUSD) — not automatically the lender',
    oneCompany: null,
    manyCompany: 'RLUSD Issuer',
    layer: 'xrpl',
    minReveal: 4,
    external: true
  },
  auditor: {
    id: 'auditor',
    role: 'Auditor / Reporting',
    short: 'Accounting and reporting around the book',
    oneCompany: 'Accounting / Reporting Department',
    manyCompany: 'Reporting Partners LLC',
    layer: 'business',
    minReveal: 4,
    external: false
  }
}

export const INST_GLOSSARY: Record<string, string> = {
  Borrower: 'The party that receives the loan proceeds.',
  Debtor: 'The party legally obligated to repay. Usually the same party as the borrower — not a second person by default.',
  Depositor: 'Supplies assets into the Single Asset Vault and receives vault shares.',
  Lender: 'Economically supplies the capital being used for lending. In this design that is the depositor group, not a bilateral loan from each person to the borrower.',
  Creditor: 'Has a claim connected to the debt or lending arrangement. Vault depositors hold a proportional claim on vault assets via shares.',
  'Loan Originator':
    'Brings the borrower into the system: marketing, applications, documents, and packaging. Does not automatically lend the money or own the vault. Business-layer role — the XRPL protocol does not require a separate originator object.',
  'Loan Broker':
    'XRPL lending-protocol operator connected to the vault. Creates and manages loans, tracks debt, can post first-loss capital, and receives applicable protocol fees. Current architecture: the Vault Owner account and the Loan Broker account are the same XRPL account.',
  Underwriter:
    'Analyzes repayment risk off-chain (identity, cash flow, credit, collateral, guarantor). Produces a recommendation. Does not necessarily control the vault. The current XRPL Lending Protocol relies on this off-chain judgment.',
  Guarantor:
    'Promises to cover defined borrower obligations if required. This is an additional legal agreement. A guarantor is not automatically a native LoanSet counterparty.',
  Servicer:
    'Administers the ongoing loan: notices, collections, records, delinquency, customer service, reporting. On XRPL, payment state lives on the Loan object; the servicer is the operational function around it.',
  Custodian:
    'Holds or controls assets or collateral for another party. Native XRPL loans are uncollateralized; a custodian is additional architecture layered on top.',
  'Vault Owner':
    'The XRPL account that creates and controls the vault object. Control over the object is not the same as personally owning every depositor’s economic interest.',
  'Vault Administrator':
    'Business role that monitors liquidity, deposits, withdrawals, utilization, and operational controls. A person or department may operate the vault without personally owning depositor funds.',
  'Vault shares':
    'Receipts representing a depositor’s proportional interest in vault assets. As the vault’s value changes (interest in, losses out), the exchange rate between shares and the vault asset can change.',
  LoanSet:
    'The XRPL transaction that creates or updates a Loan. Both the Loan Broker and the Borrower sign it.',
  'First-loss capital':
    'Optional Loan Broker capital that can absorb part of a default before remaining loss hits vault / depositor economics. In the current protocol it is deposited by the Loan Broker owner account.',
  'Permissioned Domain':
    'XRPL primitive that can restrict who may participate. Private vaults can require credentials issued into a permissioned domain.',
  Credential:
    'An on-chain attestation that a party has passed a check (for example KYC / KYB). Issued by a credential issuer; used to gate private vault access.',
  Impairment:
    'XRPL lending state when a loan is recognized as troubled before a full default write-down. The protocol supports impair / unimpair / default after grace rules.',
  'Single Asset Vault':
    'Pools one asset (XRP, a trust-line token, or an MPT) from one or more depositors. Holds available assets, total value, shares, caps, withdrawal policy, and public/private status.',
  'Asset Issuer':
    'If the vault holds an issued asset, that issuer is a separate ecosystem participant. Freeze or clawback on the asset can affect lending operations. The issuer is not automatically the lender.',
  Principal: 'Amount borrowed.',
  'Interest Rate': 'Cost of borrowing, expressed as an annual rate on this teaching example.',
  'Origination Fee': 'Fee related to creating the loan. Who earns it depends on the business arrangement.',
  'Service Fee': 'Fee associated with ongoing payments.',
  'Late Fee': 'Additional cost caused by late payments.',
  'Early Payment Fee': 'Fee that may apply if the borrower repays ahead of schedule, when configured.',
  APY: 'Annual Percentage Yield — an annualized, compounding measure. It is not a daily cash coupon. Whether a product pays out daily, weekly, or monthly is a distribution policy, not the definition of APY.',
  'Exchange rate':
    'Vault asset value relative to outstanding vault shares. Interest that increases vault value can make each share redeemable for more of the asset, without a separate cash paycheck to every depositor after each borrower payment.'
}

export const SAMPLE = {
  asset: 'RLUSD',
  vaultTotal: 1_000_000,
  depositorCount: 20,
  outstandingLoans: 600_000,
  available: 400_000,
  firstLoss: 50_000,
  outstandingDebtExample: 500_000,
  managementFee: '2%',
  debtMaximum: 800_000,
  minFirstLoss: 50_000,
  loan: {
    borrower: 'ABC Development LLC',
    wallet: 'rABC…',
    principal: 100_000,
    apr: 10,
    lateApr: 14,
    termMonths: 24,
    interval: 'Monthly',
    originationFeePct: 1,
    serviceFee: 25,
    graceDays: 10,
    guarantor: 'John Doe',
    collateral: 'Commercial Property Note'
  },
  parties: {
    originator: 'Origin Capital LLC',
    underwriter: 'Credit Analytics LLC',
    broker: 'JRPU Lending LLC',
    vaultOperator: 'JRPU Lending LLC',
    custodian: 'Custody Services LLC',
    servicer: 'Loan Servicing LLC',
    borrower: 'ABC Development LLC',
    guarantor: 'John Doe'
  },
  oneCompany: 'JRPU FINANCIAL',
  depositors: [
    { name: 'Depositor A', amount: 100_000 },
    { name: 'Depositor B', amount: 250_000 },
    { name: 'Depositor C', amount: 150_000 }
  ]
}

export const UNDERWRITE_RESULT = {
  grade: 'B+',
  requested: 100_000,
  approved: 80_000,
  apr: 11,
  termMonths: 24,
  guarantor: 'Required',
  collateral: 'Required',
  maxExposure: 80_000
}

export function usd(n: number) {
  return '$' + n.toLocaleString('en-US')
}

export function captions(meta: RoleMeta, structure: StructureView, labeling: Labeling) {
  const company =
    structure === 'one'
      ? meta.external
        ? meta.manyCompany
        : meta.oneCompany ?? SAMPLE.oneCompany
      : meta.manyCompany
  if (labeling === 'roles') {
    return { title: meta.role, subtitle: company }
  }
  return { title: company, subtitle: meta.role }
}
