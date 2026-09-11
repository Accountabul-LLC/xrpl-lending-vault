import type { EntityId, FlowKind, LifecycleStage, SimulationState } from '../simulation/types'
import { STORY_STEPS } from '../experience/story'

export const COLORS = {
  bg: 0x0b1220,
  protocol: 0x818cf8,
  protocolEmissive: 0x4338ca,
  vault: 0x38bdf8,
  vaultEmissive: 0x0ea5e9,
  depositor: 0x34d399,
  depositorEmissive: 0x059669,
  borrower: 0xfbbf24,
  borrowerEmissive: 0xd97706,
  administrator: 0xa5b4fc,
  risk: 0xf43f5e,
  interest: 0xa78bfa,
  yield: 0x6ee7b7,
  principal: 0xfbbf24,
  pipe: 0x334155,
  pipeActive: 0x64748b,
  admin: 0x6366f1,
  white: 0xe2e8f0
} as const

/**
 * Shared world layout (ground plane y=0):
 *
 *                 PROTOCOL OFFICE
 *                      │
 *               Administrator
 *                      │
 *                      ▼
 * Depositor ──────→ LENDING VAULT ──────→ Borrower
 *                       ▲                       │
 *                       └──── Repayment ────────┘
 */
export const ENTITY_POSITIONS: Record<EntityId, [number, number, number]> = {
  protocol: [0, 0, -3.85],
  administrator: [1.45, 0, -2.25],
  vault: [0, 0, 0.35],
  depositor: [-3.35, 0, 0.55],
  borrower: [3.35, 0, 0.55],
  agreement: [2.05, 0, 1.45],
  originator: [2.85, 0, -1.75],
  underwriter: [0.25, 0, -2.45],
  broker: [3.35, 0, 2.05],
  guarantor: [4.45, 0, -0.95],
  custodian: [-4.25, 0, -1.05],
  servicer: [0, 0, 2.45]
}

export type CameraPreset = {
  position: [number, number, number]
  lookAt: [number, number, number]
  fov?: number
}

export const LESSON_CAMERAS: Record<number, CameraPreset> = {
  0: { position: [0.2, 2.45, 8.2], lookAt: [0, 1.15, 0.2] },
  1: { position: [1.5, 2.25, 6.1], lookAt: [0.35, 1.2, -1.2] },
  2: { position: [-2.4, 2.05, 6.6], lookAt: [-1.1, 1.05, 0.25] },
  3: { position: [2.4, 2.05, 6.6], lookAt: [1.1, 1.05, 0.25] },
  4: { position: [2.55, 2.1, 6.2], lookAt: [1.85, 1.2, 0.7] },
  5: { position: [0.2, 2.55, 8.4], lookAt: [0, 1.1, 0.15] },
  6: { position: [2.05, 2.2, 7.1], lookAt: [0.75, 1.05, 0.2] },
  7: { position: [0.25, 2.65, 8.6], lookAt: [0, 1.1, 0.1] }
}

export const FLOW_COLORS: Record<FlowKind, number> = {
  deposit: COLORS.depositor,
  loan: COLORS.borrower,
  principal: COLORS.principal,
  interest: COLORS.interest,
  yield: COLORS.yield,
  admin: COLORS.admin,
  request: COLORS.borrower,
  default: COLORS.risk
}

export function lessonFocusEntities(lesson: number): EntityId[] {
  switch (lesson) {
    case 0:
      return ['protocol', 'administrator', 'depositor', 'borrower', 'vault']
    case 1:
      return ['administrator', 'protocol', 'vault']
    case 2:
      return ['depositor', 'vault']
    case 3:
      return ['borrower', 'vault', 'administrator']
    case 4:
      return ['borrower', 'agreement', 'vault']
    case 5:
      return ['depositor', 'vault', 'borrower', 'administrator', 'protocol']
    case 6:
      return ['borrower', 'vault', 'depositor']
    default:
      return ['protocol', 'administrator', 'vault', 'depositor', 'borrower']
  }
}

export function cameraForStep(step: number, lesson: number): CameraPreset {
  if (lesson === 0 || lesson === 5 || lesson === 7) {
    return LESSON_CAMERAS[lesson] ?? LESSON_CAMERAS[0]
  }
  const story = STORY_STEPS[step - 1]
  if (story) return story.camera
  return LESSON_CAMERAS[lesson] ?? LESSON_CAMERAS[0]
}

export function stageHighlight(stage: LifecycleStage): { from: EntityId; to: EntityId } | null {
  switch (stage) {
    case 'configure':
      return { from: 'administrator', to: 'vault' }
    case 'create':
      return { from: 'administrator', to: 'vault' }
    case 'deposit':
      return { from: 'depositor', to: 'vault' }
    case 'available':
      return { from: 'depositor', to: 'vault' }
    case 'request':
      return { from: 'borrower', to: 'administrator' }
    case 'approve':
      return { from: 'administrator', to: 'borrower' }
    case 'fund':
      return { from: 'vault', to: 'borrower' }
    case 'agree':
      return { from: 'borrower', to: 'agreement' }
    case 'repay':
      return { from: 'borrower', to: 'vault' }
    case 'earn':
      return { from: 'vault', to: 'depositor' }
    default:
      return null
  }
}

export function vaultFillRatio(state: SimulationState): number {
  const max = Math.max(state.vault.maxSize * 0.4, state.vault.totalCapital, 1)
  return Math.min(1, state.vault.totalCapital / max)
}

export function utilization(state: SimulationState): number {
  if (state.vault.totalCapital <= 0) return 0
  return state.vault.outstandingLoans / state.vault.totalCapital
}
