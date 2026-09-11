import { PROCESS_POSITIONS, processFocus } from '../experience/lendingProcess'
import { STORY_STEPS } from '../experience/story'
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

/** Vault at the origin; desks sit on a permanent ring around it. */
export const ENTITY_POSITIONS = PROCESS_POSITIONS

export type CameraPreset = {
  position: [number, number, number]
  lookAt: [number, number, number]
  fov?: number
}

export const LESSON_CAMERAS: Record<number, CameraPreset> = {
  0: { position: [0.2, 5.8, 13.2], lookAt: [0, 1.1, 0] },
  1: { position: [0.6, 4.8, 11.4], lookAt: [0, 1.15, 0] },
  2: { position: [-2.6, 4.6, 11.2], lookAt: [0, 1.1, 0] },
  3: { position: [-1.8, 4.8, 11.6], lookAt: [0, 1.1, 0] },
  4: { position: [-1.4, 4.4, 10.6], lookAt: [0, 1.15, 0] },
  5: { position: [0.2, 5.9, 13.4], lookAt: [0, 1.1, 0] },
  6: { position: [0.4, 5.2, 12.2], lookAt: [0, 1.1, 0] },
  7: { position: [0.25, 6.0, 13.6], lookAt: [0, 1.1, 0] }
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

export function lessonFocusEntities(lesson: number, advanced = false): EntityId[] {
  switch (lesson) {
    case 0:
      return processFocus(1, advanced)
    case 1:
      return ['administrator', 'vault', ...(advanced ? (['protocol'] as EntityId[]) : [])]
    case 2:
      return ['depositor', 'vault']
    case 3:
      return ['borrower', 'originator', 'underwriter', 'vault', 'administrator']
    case 4:
      return ['borrower', 'agreement', 'vault']
    case 5:
      return processFocus(5, advanced)
    case 6:
      return ['borrower', 'servicer', 'vault', 'depositor']
    default:
      return ['administrator', 'vault', 'depositor', 'borrower', 'originator', 'underwriter', 'custodian', 'servicer']
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
