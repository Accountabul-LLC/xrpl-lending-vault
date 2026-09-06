export type TxReceipt = {
  hash: string
  ledgerIndex?: number
  type: string
  result: string
  validated: boolean
}

export function receiptFrom(result: any, type: string): TxReceipt {
  const body = result?.result ?? result
  const meta = body?.meta
  const code = typeof meta === 'object' ? meta?.TransactionResult : undefined
  return {
    hash: body?.hash ?? '',
    ledgerIndex: body?.ledger_index,
    type,
    result: code ?? 'tesSUCCESS',
    validated: Boolean(body?.validated ?? true)
  }
}

export type TxPhase = 'preparing' | 'signing' | 'submitting' | 'validating' | 'confirmed'

export const TX_PHASES: TxPhase[] = [
  'preparing',
  'signing',
  'submitting',
  'validating',
  'confirmed'
]
