import type { ReactNode } from 'react'

export function ProgressHud({
  currentMs,
  totalMs,
  step
}: {
  currentMs: number
  totalMs: number
  step: { n: number; of: number; title: string } | null
}) {
  const pct = totalMs > 0 ? Math.min(100, (currentMs / totalMs) * 100) : 0
  const label = step
    ? `STEP ${step.n} OF ${step.of} — ${step.title.toUpperCase()}`
    : 'ACCOUNTABUL LENDING PROTOCOL'
  return (
    <div className="walkthrough-hud pointer-events-none">
      <div className="flex items-center justify-between gap-4">
        <div className="text-[13px] font-semibold tracking-[0.14em] text-indigo-200">{label}</div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-sky-400/40 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-[0.16em] text-sky-300">
            XRPL DEVNET
          </span>
          <span className="font-mono text-xs text-slate-400">{fmt(currentMs)} / {fmt(totalMs)}</span>
        </div>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-indigo-400 transition-[width] duration-200" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function CaptionBar({ text }: { text: string }) {
  return (
    <div className="walkthrough-captions">
      <p>{text}</p>
    </div>
  )
}

export function Cursor({ x, y, visible }: { x: number; y: number; visible: boolean }) {
  if (!visible) return null
  return (
    <div className="walkthrough-cursor" style={{ transform: `translate(${x}px, ${y}px)` }}>
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M4 3.5 22 14.2l-8.2 1.6 2.2 8.1L4 3.5Z" fill="#e2e8f0" stroke="#0f172a" strokeWidth="1.2" />
      </svg>
      <span className="walkthrough-cursor-ring" />
    </div>
  )
}

export function Callout({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`walkthrough-callout ${className}`}>{children}</div>
}

export function MoneyFlow({ kind }: { kind: string | null }) {
  if (!kind) return null
  const map: Record<string, { from: string; to: string; mid?: string; sub?: string }> = {
    deposit: { from: 'Depositor', to: 'Vault', sub: '10,000 XRP' },
    shares: { from: 'Vault', to: 'Depositor', sub: 'Vault shares issued' },
    loan: { from: 'Vault', mid: 'Loan', to: 'Borrower', sub: 'Principal 10,000' },
    payment: { from: 'Borrower', mid: 'Loan', to: 'Vault', sub: 'Principal + Interest' },
    withdraw: { from: 'Vault shares', to: 'Depositor', sub: 'Available assets' }
  }
  const flow = map[kind]
  if (!flow) return null
  return (
    <div className="walkthrough-flow">
      <span className="walkthrough-flow-node">{flow.from}</span>
      <span className="walkthrough-flow-arrow" />
      {flow.mid && (
        <>
          <span className="walkthrough-flow-node">{flow.mid}</span>
          <span className="walkthrough-flow-arrow" />
        </>
      )}
      <span className="walkthrough-flow-node">{flow.to}</span>
      {flow.sub && <span className="walkthrough-flow-sub">{flow.sub}</span>}
    </div>
  )
}

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}
