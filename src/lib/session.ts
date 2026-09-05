export const STORAGE_KEY = 'jrpu-devnet-session-v2'
export const LEGACY_STORAGE_KEY = 'jrpu-devnet-session'

export type Role = 'owner' | 'depositor' | 'borrower'

export const ROLES: Role[] = ['owner', 'depositor', 'borrower']

export type Session = {
  seeds: Partial<Record<Role, string>>
  vaultId: string
  loanBrokerId: string
  loanId: string
  loanIds: string[]
  paymentMade: boolean
  withdrawMade: boolean
  depositedXrp: string
  withdrawnXrp: string
}

export function emptySession(): Session {
  return {
    seeds: {},
    vaultId: '',
    loanBrokerId: '',
    loanId: '',
    loanIds: [],
    paymentMade: false,
    withdrawMade: false,
    depositedXrp: '0',
    withdrawnXrp: '0'
  }
}

export function loadSession(): Session {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return emptySession()
    const parsed = JSON.parse(raw)
    return {
      ...emptySession(),
      seeds: parsed.seeds ?? {},
      vaultId: parsed.vaultId ?? '',
      loanBrokerId: parsed.loanBrokerId ?? '',
      loanId: parsed.loanId ?? '',
      loanIds: Array.isArray(parsed.loanIds)
        ? parsed.loanIds
        : parsed.loanId
          ? [parsed.loanId]
          : [],
      paymentMade: Boolean(parsed.paymentMade),
      withdrawMade: Boolean(parsed.withdrawMade),
      depositedXrp: parsed.depositedXrp ?? '0',
      withdrawnXrp: parsed.withdrawnXrp ?? '0'
    }
  } catch {
    return emptySession()
  }
}

export function saveSession(session: Session) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function clearSessionStorage() {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(LEGACY_STORAGE_KEY)
}

export const RESET_DISCLAIMER =
  'Resetting the Lab clears the local test session. It does not undo transactions already validated on XRPL DevNet.'
