export const STORAGE_KEY = 'jrpu-devnet-session'

export type PersistedLabSession = {
  vaultId: string
  loanBrokerId: string
  loanId: string
}

const SECRET_FIELD_NAMES = new Set([
  'seed',
  'seeds',
  'secret',
  'secrets',
  'privatekey',
  'private_key',
  'mnemonic',
  'familyseed',
  'family_seed'
])

/** Classic XRPL family seed (sEd… / s…). Used only to detect leakage, never to hydrate wallets. */
const FAMILY_SEED_RE = /^s[1-9A-HJ-NP-Za-km-z]{25,}$/

export function emptyPersistedSession(): PersistedLabSession {
  return { vaultId: '', loanBrokerId: '', loanId: '' }
}

function asPublicId(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function publicSessionFromUnknown(value: unknown): PersistedLabSession {
  if (!value || typeof value !== 'object') return emptyPersistedSession()
  const rec = value as Record<string, unknown>
  return {
    vaultId: asPublicId(rec.vaultId),
    loanBrokerId: asPublicId(rec.loanBrokerId),
    loanId: asPublicId(rec.loanId)
  }
}

export function serializePersistedSession(session: PersistedLabSession): string {
  return JSON.stringify({
    vaultId: session.vaultId,
    loanBrokerId: session.loanBrokerId,
    loanId: session.loanId
  })
}

function walkForSecrets(value: unknown, found: string[]): void {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (FAMILY_SEED_RE.test(trimmed)) found.push(trimmed)
    return
  }
  if (!value || typeof value !== 'object') return
  if (Array.isArray(value)) {
    for (const item of value) walkForSecrets(item, found)
    return
  }
  for (const [key, child] of Object.entries(value)) {
    if (SECRET_FIELD_NAMES.has(key.toLowerCase())) found.push(key)
    walkForSecrets(child, found)
  }
}

/** True if a storage payload still contains extractable signing material. */
export function sessionContainsExtractableSecret(raw: string | null): boolean {
  if (!raw) return false
  try {
    const found: string[] = []
    walkForSecrets(JSON.parse(raw), found)
    if (found.length > 0) return true
  } catch {
    if (FAMILY_SEED_RE.test(raw.trim())) return true
  }
  return false
}

export function persistLabSession(storage: Pick<Storage, 'setItem'>, session: PersistedLabSession): void {
  storage.setItem(STORAGE_KEY, serializePersistedSession(session))
}

export function loadLabSession(storage: Pick<Storage, 'getItem' | 'setItem'>): {
  session: PersistedLabSession
  purgedSecrets: boolean
} {
  let parsed: unknown = null
  const raw = storage.getItem(STORAGE_KEY)
  const purgedSecrets = sessionContainsExtractableSecret(raw)
  if (raw) {
    try {
      parsed = JSON.parse(raw)
    } catch {
      parsed = null
    }
  }
  const session = publicSessionFromUnknown(parsed)
  persistLabSession(storage, session)
  return { session, purgedSecrets }
}

export function clearLabSession(storage: Pick<Storage, 'removeItem'>): void {
  storage.removeItem(STORAGE_KEY)
}
