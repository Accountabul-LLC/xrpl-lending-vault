import type { ReactNode } from 'react'
import type { StepId, StepStatus } from '../lib/labWorkflow'
import { STEP_META } from '../lib/labWorkflow'
import type { TxReceipt } from '../lib/xrpl'
import { DEVNET_EXPLORER_TX } from '../lib/xrpl'
import type { ErrorGuidance } from '../lib/xrplErrors'

export function StatusBadge({ status }: { status: StepStatus }) {
  const color: Record<StepStatus, string> = {
    'NOT READY': 'bg-slate-800 text-slate-400 border-slate-700',
    READY: 'bg-sky-950 text-sky-300 border-sky-700',
    SUBMITTING: 'bg-amber-950 text-amber-300 border-amber-700',
    VALIDATING: 'bg-amber-950 text-amber-200 border-amber-600',
    COMPLETE: 'bg-emerald-950 text-emerald-300 border-emerald-700',
    FAILED: 'bg-rose-950 text-rose-300 border-rose-700'
  }
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${color[status]}`}
    >
      {status}
    </span>
  )
}

export function ProgressBar({
  statuses
}: {
  statuses: Record<StepId, StepStatus>
}) {
  const ids = [1, 2, 3, 4, 5, 6, 7, 8] as StepId[]
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 sm:p-4">
      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-2">
        DevNet Lab Progress
      </div>
      <ol className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2">
        {ids.map((id) => {
          const st = statuses[id]
          const mark = st === 'COMPLETE' ? '✓' : st === 'FAILED' ? '✗' : st === 'READY' ? '●' : '○'
          return (
            <li key={id} className="min-w-0 rounded-lg border border-slate-800 px-2 py-1.5">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] text-slate-500">{id}</span>
                <span
                  className={
                    st === 'COMPLETE'
                      ? 'text-emerald-400'
                      : st === 'FAILED'
                        ? 'text-rose-400'
                        : st === 'READY' || st === 'SUBMITTING' || st === 'VALIDATING'
                          ? 'text-sky-300'
                          : 'text-slate-600'
                  }
                >
                  {mark}
                </span>
              </div>
              <div className="text-[10px] font-medium text-slate-300 leading-tight truncate">
                {STEP_META[id].short}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export function ErrorBox({
  guidance
}: {
  guidance: (ErrorGuidance & { whatFailed: string; raw?: string }) | null
}) {
  if (!guidance) return null
  return (
    <div className="rounded-lg border border-rose-800 bg-rose-950/40 p-3 space-y-1 text-sm">
      <div className="font-semibold text-rose-200">WHAT FAILED? {guidance.whatFailed}</div>
      <div>
        <span className="text-slate-500">WHY? </span>
        <code className="text-rose-300">{guidance.code}</code>
      </div>
      <div>
        <span className="text-slate-500">WHAT DOES THAT MEAN? </span>
        {guidance.meaning}
      </div>
      <div>
        <span className="text-slate-500">HOW DO I FIX IT? </span>
        {guidance.fix}
      </div>
    </div>
  )
}

export function TxDetails({ receipt }: { receipt?: TxReceipt | null }) {
  if (!receipt) return null
  return (
    <details className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
      <summary className="cursor-pointer text-xs font-medium text-slate-300">
        View Technical Details
      </summary>
      <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-slate-500">Transaction Type</dt>
          <dd className="font-mono">{receipt.transactionType}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Submitting Account</dt>
          <dd className="font-mono break-all">{receipt.account}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-slate-500">Transaction Hash</dt>
          <dd className="font-mono break-all">
            {receipt.hash ? (
              <a
                className="text-indigo-300 hover:underline"
                href={`${DEVNET_EXPLORER_TX}${receipt.hash}`}
                target="_blank"
                rel="noreferrer"
              >
                {receipt.hash}
              </a>
            ) : (
              '—'
            )}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Ledger Index</dt>
          <dd className="font-mono">{receipt.ledgerIndex ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">XRPL Result Code</dt>
          <dd className="font-mono">{receipt.resultCode}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Validated</dt>
          <dd>{receipt.validated ? 'Yes' : 'No'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Affected Objects</dt>
          <dd className="font-mono break-all">
            {receipt.affectedObjects.length
              ? receipt.affectedObjects.map((o) => `${o.action} ${o.type}`).join(', ')
              : '—'}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-slate-500">Transaction JSON</dt>
          <dd>
            <pre className="mt-1 max-h-48 overflow-auto rounded bg-slate-900 p-2 text-[10px] text-slate-400">
              {JSON.stringify(receipt.txJson, null, 2)}
            </pre>
          </dd>
        </div>
      </dl>
    </details>
  )
}

export function PrereqList({
  checks
}: {
  checks: { id: string; label: string; met: boolean; detail?: string }[]
}) {
  return (
    <ul className="space-y-1 text-xs">
      {checks.map((c) => (
        <li key={c.id} className="flex gap-2 min-w-0">
          <span className={c.met ? 'text-emerald-400' : 'text-rose-400'}>{c.met ? '✓' : '✗'}</span>
          <span className="text-slate-300">
            {c.label}
            {c.detail ? <span className="text-slate-500"> — {c.detail}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  )
}

export function StepCard({
  id,
  status,
  wallet,
  children
}: {
  id: StepId
  status: StepStatus
  wallet: string
  children: ReactNode
}) {
  const meta = STEP_META[id]
  return (
    <section
      id={`lab-step-${id}`}
      className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3 min-w-0"
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-100">
            {id}. {meta.name}
          </h2>
          <p className="text-xs text-slate-400 mt-1">{meta.explanation}</p>
        </div>
        <StatusBadge status={status} />
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div>
          <div className="text-slate-500">Responsible wallet</div>
          <div className="text-slate-200">{wallet}</div>
        </div>
        <div>
          <div className="text-slate-500">XRPL transaction</div>
          <div className="font-mono text-slate-200">{meta.txType}</div>
        </div>
      </div>
      {children}
    </section>
  )
}

export function Kv({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="font-mono text-sm text-slate-100 break-all">{value ?? '—'}</div>
    </div>
  )
}

export function Tip({ text }: { text: string }) {
  return (
    <span className="ml-1 text-slate-500 cursor-help" title={text} aria-label={text}>
      ⓘ
    </span>
  )
}

export function ActionButton({
  disabled,
  busy,
  onClick,
  children,
  requires
}: {
  disabled?: boolean
  busy?: boolean
  onClick: () => void
  children: ReactNode
  requires?: { label: string; met: boolean }[]
}) {
  const blocked = Boolean(disabled || busy)
  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={blocked}
        onClick={onClick}
        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition"
      >
        {busy ? 'Working…' : children}
      </button>
      {blocked && requires && requires.length > 0 && (
        <div className="text-xs text-slate-400">
          <div className="mb-1">Requires:</div>
          <PrereqList checks={requires.map((r, i) => ({ id: String(i), ...r }))} />
        </div>
      )}
    </div>
  )
}
