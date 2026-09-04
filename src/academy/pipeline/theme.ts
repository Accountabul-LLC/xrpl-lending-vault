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
  protocol: [0, 3.4, 0],
  vault: [0, 0.35, 0],
  depositor: [-4.2, -1.1, 0.4],
  borrower: [4.2, -1.1, 0.4],
  guarantor: [4.2, 1.4, -1.2],
  broker: [-2.2, -2.6, 0.8],
  underwriter: [2.2, 2.2, -0.8],
  servicer: [0, -2.8, 1.2],
  custodian: [-4.2, 1.6, -1]
}

export type CameraPreset = {
  position: [number, number, number]
  lookAt: [number, number, number]
  fov?: number
}

export const LESSON_CAMERAS: Record<number, CameraPreset> = {
  0: { position: [0, 2.2, 11.5], lookAt: [0, 0.4, 0] },
  1: { position: [0.4, 1.4, 7.2], lookAt: [0, 0.5, 0] },
  2: { position: [-3.2, 1.2, 8], lookAt: [-2, -0.2, 0] },
  3: { position: [3.2, 1.2, 8], lookAt: [2, -0.2, 0] },
  4: { position: [0, 1.8, 10], lookAt: [0, 0.2, 0] },
  5: { position: [0, 2.4, 11], lookAt: [0, 0.3, 0] },
  6: { position: [1.5, 2.6, 10.5], lookAt: [0.5, 0, 0] },
  7: { position: [0, 3, 12.5], lookAt: [0, 0.2, 0] }
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
      return ['vault', 'protocol']
    case 2:
      return ['depositor', 'vault']
    case 3:
      return ['vault', 'borrower']
    case 4:
      return ['borrower', 'vault']
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
