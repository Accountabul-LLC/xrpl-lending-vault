import type { EntityId, FlowKind } from '../simulation/types'
import { STORY } from './story'

/**
 * Lending-process architecture.
 * The vault is the center. Every visible person is a node in the workflow.
 */
export const LENDING_STAGES = [
  'application',
  'origination',
  'underwriting',
  'approval',
  'collateral',
  'funding',
  'servicing'
] as const

export type LendingStage = (typeof LENDING_STAGES)[number]

export const LENDING_STAGE_LABELS: Record<LendingStage, string> = {
  application: 'Application',
  origination: 'Origination',
  underwriting: 'Underwriting',
  approval: 'Approval',
  collateral: 'Collateral',
  funding: 'Funding',
  servicing: 'Servicing'
}

export type ParticipantMeta = {
  id: EntityId
  label: string
  role: string
  inputs: string[]
  output: string
  /** Shown in Basic process mode. */
  basic: boolean
  tint: string
}

export const PARTICIPANTS: ParticipantMeta[] = [
  {
    id: 'borrower',
    label: 'Borrower',
    role: 'Requests the loan, receives funding, and repays it.',
    inputs: ['Application', 'Property information'],
    output: 'Loan request',
    basic: true,
    tint: '#fcd34d'
  },
  {
    id: 'broker',
    label: 'Loan Broker',
    role: 'Packages the opportunity and moves it into the lending process.',
    inputs: ['Borrower application'],
    output: 'Packaged application',
    basic: false,
    tint: '#c4b5fd'
  },
  {
    id: 'originator',
    label: 'Loan Originator',
    role: 'Takes the application, collects required information, and creates the loan record.',
    inputs: ['Packaged application'],
    output: 'Loan created',
    basic: true,
    tint: '#7dd3fc'
  },
  {
    id: 'underwriter',
    label: 'Underwriter',
    role: 'Reviews borrower, property, and finances, then decides risk and approval.',
    inputs: ['Borrower profile', 'Property', 'Income', 'Credit', 'Collateral'],
    output: 'Approval decision',
    basic: true,
    tint: '#67e8f9'
  },
  {
    id: 'guarantor',
    label: 'Guarantor',
    role: 'Adds credit support when the loan requires a guarantee.',
    inputs: ['Underwriting decision'],
    output: 'Guarantee attached',
    basic: false,
    tint: '#fdba74'
  },
  {
    id: 'custodian',
    label: 'Collateral Custodian',
    role: 'Holds collateral documentation or digital collateral for the facility.',
    inputs: ['Approved collateral'],
    output: 'Collateral secured',
    basic: true,
    tint: '#cbd5e1'
  },
  {
    id: 'servicer',
    label: 'Loan Servicer',
    role: 'Tracks payments, balances, and delinquency after funding.',
    inputs: ['Monthly payment'],
    output: 'Principal / interest posted',
    basic: true,
    tint: '#f0abfc'
  },
  {
    id: 'administrator',
    label: 'Loan Administrator',
    role: 'Oversees the loan record and coordinates the parties.',
    inputs: ['Vault rules', 'Loan status'],
    output: 'System workflow',
    basic: true,
    tint: '#c7d2fe'
  },
  {
    id: 'depositor',
    label: 'Depositor',
    role: 'Supplies capital to the vault. Does not own the vault.',
    inputs: ['Cash'],
    output: 'Vault liquidity',
    basic: true,
    tint: '#6ee7b7'
  },
  {
    id: 'vault',
    label: 'Lending Vault',
    role: 'Central pool that holds capital, funds loans, and records value.',
    inputs: ['Deposits', 'Collateral state', 'Repayments'],
    output: 'Loan funding / yield',
    basic: true,
    tint: '#7dd3fc'
  },
  {
    id: 'protocol',
    label: 'XRPL Ledger',
    role: 'Settlement layer that records the financial transaction.',
    inputs: ['Signed loan instructions'],
    output: 'On-ledger state',
    basic: false,
    tint: '#c7d2fe'
  },
  {
    id: 'agreement',
    label: 'Repayment Agreement',
    role: 'The borrower obligation: principal, rate, term, and schedule.',
    inputs: ['Approved loan terms'],
    output: 'Signed obligation',
    basic: true,
    tint: '#fde68a'
  }
]

export const PARTICIPANT_BY_ID: Record<EntityId, ParticipantMeta> = Object.fromEntries(
  PARTICIPANTS.map((p) => [p.id, p])
) as Record<EntityId, ParticipantMeta>

/**
 * Permanent desk layout. Vault at the origin.
 *
 *                 UNDERWRITER
 *                     ●
 *          BROKER ── VAULT ── ORIGINATOR
 *               /              \
 *        BORROWER              GUARANTOR
 *                     ●
 *              COLLATERAL CUSTODIAN
 *              SERVICER    ADMINISTRATOR
 */
export const PROCESS_POSITIONS: Record<EntityId, [number, number, number]> = {
  vault: [0, 0, 0],
  underwriter: [0, 0, -4.65],
  protocol: [0, 0, -6.45],
  broker: [-4.85, 0, -1.55],
  originator: [4.85, 0, -1.55],
  depositor: [-5.25, 0, -3.45],
  borrower: [-4.75, 0, 2.25],
  guarantor: [4.75, 0, 2.25],
  custodian: [2.35, 0, 4.25],
  servicer: [-4.05, 0, 4.55],
  administrator: [4.35, 0, 4.45],
  agreement: [-2.55, 0, 3.35]
}

export const BASIC_ENTITY_IDS: EntityId[] = PARTICIPANTS.filter((p) => p.basic).map((p) => p.id)
export const ADVANCED_ONLY_IDS: EntityId[] = PARTICIPANTS.filter((p) => !p.basic).map((p) => p.id)

export function isEntityVisible(id: EntityId, advanced: boolean, agreementVisible: boolean): boolean {
  if (id === 'agreement') return agreementVisible
  const meta = PARTICIPANT_BY_ID[id]
  if (!meta) return false
  return meta.basic || advanced
}

/** Map the 10 teaching steps onto the 7-stage loan lifecycle. */
export function lendingStageForStep(step: number): LendingStage | null {
  if (step < 5) return null
  if (step === 5) return 'application'
  if (step === 6) return 'underwriting'
  if (step === 7) return 'funding'
  if (step === 8) return 'funding'
  return 'servicing'
}

export function stageProgress(step: number): Record<LendingStage, 'todo' | 'active' | 'done'> {
  const active = lendingStageForStep(step)
  const order = LENDING_STAGES
  const activeIdx = active ? order.indexOf(active) : -1
  const result = {} as Record<LendingStage, 'todo' | 'active' | 'done'>
  order.forEach((id, i) => {
    if (activeIdx < 0) result[id] = 'todo'
    else if (i < activeIdx) result[id] = 'done'
    else if (i === activeIdx) result[id] = 'active'
    else result[id] = 'todo'
  })
  if (step === 8) {
    LENDING_STAGES.forEach((id) => {
      result[id] = id === 'servicing' ? 'todo' : 'done'
    })
  }
  if (step >= 9) {
    LENDING_STAGES.forEach((id) => {
      result[id] = id === 'servicing' ? 'active' : 'done'
    })
  }
  return result
}

export function faceVaultYaw(x: number, z: number): number {
  return Math.atan2(-x, -z)
}

export type ProcessHop = {
  from: EntityId
  to: EntityId
  kind: FlowKind
  label: string
  amount: number
}

/** Sequential packets that move a loan through the visible desks. */
export function hopsForStep(step: number, advanced: boolean): ProcessHop[] {
  if (step === 3) {
    return [
      {
        from: 'depositor',
        to: 'vault',
        kind: 'deposit',
        label: `$${STORY.deposit.toLocaleString()}`,
        amount: STORY.deposit
      }
    ]
  }
  if (step === 5) {
    if (advanced) {
      return [
        { from: 'borrower', to: 'broker', kind: 'request', label: 'Application', amount: 1 },
        { from: 'broker', to: 'originator', kind: 'request', label: 'Packaged file', amount: 1 }
      ]
    }
    return [{ from: 'borrower', to: 'originator', kind: 'request', label: 'Loan request', amount: 1 }]
  }
  if (step === 6) {
    return [{ from: 'originator', to: 'underwriter', kind: 'request', label: 'Credit file', amount: 1 }]
  }
  if (step === 7) {
    return [
      { from: 'custodian', to: 'vault', kind: 'deposit', label: 'Collateral', amount: 1 },
      {
        from: 'vault',
        to: 'borrower',
        kind: 'loan',
        label: `$${STORY.loan.toLocaleString()}`,
        amount: STORY.loan
      }
    ]
  }
  if (step === 9) {
    return [
      {
        from: 'borrower',
        to: 'servicer',
        kind: 'principal',
        label: `Payment $${STORY.payment.toLocaleString()}`,
        amount: STORY.payment
      },
      {
        from: 'servicer',
        to: 'vault',
        kind: 'principal',
        label: `Principal $${STORY.principalPortion.toFixed(2)}`,
        amount: STORY.principalPortion
      },
      {
        from: 'servicer',
        to: 'vault',
        kind: 'interest',
        label: `Interest $${STORY.interestPortion.toFixed(2)}`,
        amount: STORY.interestPortion
      }
    ]
  }
  if (step === 10) {
    return [
      {
        from: 'vault',
        to: 'depositor',
        kind: 'yield',
        label: `Yield +$${STORY.interestPortion.toFixed(2)}`,
        amount: STORY.interestPortion
      }
    ]
  }
  return []
}

export function processFocus(step: number, advanced: boolean): EntityId[] {
  const hops = hopsForStep(step, advanced)
  const ids = new Set<EntityId>(['vault'])
  hops.forEach((h) => {
    ids.add(h.from)
    ids.add(h.to)
  })
  if (step <= 2) {
    ids.add('administrator')
    if (advanced) ids.add('protocol')
  }
  if (step === 4) ids.add('depositor')
  if (step === 6) {
    ids.add('originator')
    ids.add('underwriter')
    ids.add('administrator')
  }
  if (step === 8) {
    ids.add('borrower')
    ids.add('agreement')
  }
  return [...ids]
}
