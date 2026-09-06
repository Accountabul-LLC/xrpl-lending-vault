import type { EntityId, FlowKind, LifecycleStage, SimulationState } from '../simulation/types'

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
  risk: 0xf43f5e,
  interest: 0xa78bfa,
  yield: 0x6ee7b7,
  pipe: 0x334155,
  pipeActive: 0x64748b,
  admin: 0x6366f1,
  white: 0xe2e8f0
} as const

export const ENTITY_POSITIONS: Record<EntityId, [number, number, number]> = {
  protocol: [0, -2.4, -2.2],
  vault: [0, -2.4, 0.2],
  depositor: [-3.65, -2.4, 0.55],
  borrower: [3.65, -2.4, 0.55],
  guarantor: [4.7, -2.4, -1.35],
  broker: [-1.55, -2.4, -2.2],
  underwriter: [1.55, -2.4, -2.2],
  servicer: [0, -2.4, 2.35],
  custodian: [-4.55, -2.4, -1.35]
}

export type CameraPreset = {
  position: [number, number, number]
  lookAt: [number, number, number]
  fov?: number
}

export const LESSON_CAMERAS: Record<number, CameraPreset> = {
  0: { position: [0, 2.6, 10.4], lookAt: [0, -0.55, 0] },
  1: { position: [0.9, 2.15, 7.6], lookAt: [0.25, -0.7, -0.4] },
  2: { position: [-2.7, 2.05, 7.8], lookAt: [-1.5, -0.85, 0.2] },
  3: { position: [2.35, 2.2, 8.1], lookAt: [1.15, -0.65, -0.35] },
  4: { position: [1.85, 2.1, 8.3], lookAt: [1.2, -0.55, 0.05] },
  5: { position: [0, 3.15, 11.1], lookAt: [0, -0.5, 0] },
  6: { position: [1.15, 2.75, 10.2], lookAt: [0.35, -0.6, 0] },
  7: { position: [0, 3.45, 12.1], lookAt: [0, -0.45, 0] }
}

export const FLOW_COLORS: Record<FlowKind, number> = {
  deposit: COLORS.depositor,
  loan: COLORS.borrower,
  principal: COLORS.borrower,
  interest: COLORS.interest,
  yield: COLORS.yield,
  admin: COLORS.admin,
  default: COLORS.risk
}

export function lessonFocusEntities(lesson: number): EntityId[] {
  switch (lesson) {
    case 0:
      return ['protocol', 'depositor', 'borrower', 'vault']
    case 1:
      return ['protocol', 'vault']
    case 2:
      return ['depositor', 'vault']
    case 3:
      return ['protocol', 'vault']
    case 4:
      return ['borrower', 'protocol', 'vault']
    case 5:
      return ['depositor', 'vault', 'borrower', 'protocol']
    case 6:
      return ['borrower', 'vault', 'depositor']
    default:
      return ['protocol', 'vault', 'depositor', 'borrower']
  }
}

export function stageHighlight(stage: LifecycleStage): { from: EntityId; to: EntityId } | null {
  switch (stage) {
    case 'deposit':
      return { from: 'depositor', to: 'vault' }
    case 'request':
    case 'underwrite':
    case 'approve':
      return { from: 'borrower', to: 'vault' }
    case 'fund':
      return { from: 'vault', to: 'borrower' }
    case 'repay':
      return { from: 'borrower', to: 'vault' }
    case 'distribute':
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
