import { useState, type ReactNode } from 'react'
import { INST_GLOSSARY } from './glossary'

export function TrackToggle({
  track,
  onChange
}: {
  track: 'basic' | 'institutional'
  onChange: (t: 'basic' | 'institutional') => void
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs uppercase tracking-wide text-slate-500 px-2">JRPU Lending Academy</div>
      <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800">
        <button
          type="button"
          onClick={() => onChange('basic')}
          className={
            'rounded-md px-2 py-1.5 text-xs font-semibold transition ' +
            (track === 'basic' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200')
          }
        >
          Basic
        </button>
        <button
          type="button"
          onClick={() => onChange('institutional')}
          className={
            'rounded-md px-2 py-1.5 text-xs font-semibold transition ' +
            (track === 'institutional'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-400 hover:text-slate-200')
          }
        >
          Institutional
        </button>
      </div>
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'md'
}: {
  value: T
  onChange: (v: T) => void
  options: { id: T; label: string }[]
  size?: 'sm' | 'md'
}) {
  return (
    <div
      className={
        'inline-flex rounded-lg border border-slate-800 bg-slate-950 p-0.5 ' +
        (size === 'sm' ? 'text-[10px]' : 'text-xs')
      }
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={
            'rounded-md px-2.5 py-1 font-medium transition ' +
            (value === o.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200')
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Callout({
  tone = 'info',
  title,
  children
}: {
  tone?: 'info' | 'warn' | 'chain' | 'extra'
  title?: string
  children: ReactNode
}) {
  const cls =
    tone === 'warn'
      ? 'border-amber-700/40 bg-amber-950/20'
      : tone === 'chain'
        ? 'border-indigo-500/40 bg-indigo-950/20'
        : tone === 'extra'
          ? 'border-rose-700/40 bg-rose-950/20'
          : 'border-slate-700 bg-slate-950/50'
  return (
    <div className={`rounded-lg border p-3 text-sm text-slate-300 space-y-1 ${cls}`}>
      {title && <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</div>}
      <div>{children}</div>
    </div>
  )
}

export function LayerBadge({ layer }: { layer: 'xrpl' | 'business' | 'extra' }) {
  if (layer === 'xrpl') {
    return (
      <span className="rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wide bg-indigo-500/20 text-indigo-200 border border-indigo-500/30">
        Native XRPL
      </span>
    )
  }
  if (layer === 'extra') {
    return (
      <span className="rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wide bg-rose-500/15 text-rose-200 border border-rose-500/30">
        Additional layer
      </span>
    )
  }
  return (
    <span className="rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wide bg-slate-800 text-slate-300 border border-slate-600">
      Business layer
    </span>
  )
}

export function GTerm({ name }: { name: keyof typeof INST_GLOSSARY }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-indigo-300 underline decoration-dotted underline-offset-2 hover:text-indigo-200"
      >
        {name}
      </button>
      {open && (
        <span className="absolute z-20 left-0 top-full mt-1 w-72 rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs text-slate-300 shadow-xl">
          {INST_GLOSSARY[name]}
        </span>
      )}
    </span>
  )
}

export function NodeBox({
  title,
  subtitle,
  tone,
  layer,
  active,
  dimmed,
  onClick
}: {
  title: string
  subtitle?: string
  tone: string
  layer: 'xrpl' | 'business' | 'extra'
  active?: boolean
  dimmed?: boolean
  onClick?: () => void
}) {
  const ring =
    {
      vault: 'border-sky-500/50 bg-sky-950/30 text-sky-100',
      broker: 'border-violet-500/50 bg-violet-950/30 text-violet-100',
      depositor: 'border-emerald-500/50 bg-emerald-950/30 text-emerald-100',
      borrower: 'border-amber-500/50 bg-amber-950/30 text-amber-100',
      originator: 'border-sky-400/40 bg-slate-950 text-sky-100',
      underwriter: 'border-cyan-500/40 bg-cyan-950/20 text-cyan-100',
      compliance: 'border-teal-500/40 bg-teal-950/20 text-teal-100',
      guarantor: 'border-orange-500/40 bg-orange-950/20 text-orange-100',
      custodian: 'border-slate-400/40 bg-slate-900 text-slate-100',
      servicer: 'border-fuchsia-500/40 bg-fuchsia-950/20 text-fuchsia-100',
      issuer: 'border-lime-500/30 bg-lime-950/10 text-lime-100',
      admin: 'border-indigo-400/40 bg-indigo-950/20 text-indigo-100',
      auditor: 'border-slate-500/40 bg-slate-950 text-slate-200'
    }[tone] ?? 'border-slate-600 bg-slate-900 text-slate-100'

  const dash = layer !== 'xrpl' ? 'border-dashed' : ''
  const glow = active ? 'inst-glow' : ''
  const fade = dimmed ? 'opacity-35' : ''

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border px-3 py-2.5 text-center transition inst-in ${ring} ${dash} ${glow} ${fade}`}
    >
      <div className="flex justify-center mb-1">
        <LayerBadge layer={layer} />
      </div>
      <div className="text-sm font-semibold leading-tight">{title}</div>
      {subtitle && <div className="text-[11px] text-slate-400 mt-1 leading-snug">{subtitle}</div>}
    </button>
  )
}

export function Arrow({ label }: { label?: string }) {
  return (
    <div className="text-center text-[10px] uppercase tracking-wide text-slate-500 py-0.5">
      <div>↓</div>
      {label && <div className="normal-case tracking-normal text-slate-400">{label}</div>}
    </div>
  )
}

export function FlowFrame({
  label,
  from,
  to,
  amount
}: {
  label: string
  from: string
  to: string
  amount: string
}) {
  return (
    <div className="rounded-xl border border-indigo-500/40 bg-indigo-950/30 px-4 py-5 text-center">
      <div className="text-xs uppercase tracking-wide text-indigo-300">{label}</div>
      <div className="text-xl font-semibold mt-1">
        {from} → {to}
      </div>
      <div className="text-slate-300 mt-1">{amount}</div>
      <div className="flow-dot mx-auto mt-4" />
    </div>
  )
}

export function Legend() {
  return (
    <div className="flex flex-wrap gap-3 text-[10px] text-slate-400">
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm border border-indigo-400 bg-indigo-950" />
        Native XRPL object / account
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm border border-dashed border-slate-400 bg-slate-900" />
        Business / legal role
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm border border-dashed border-rose-400 bg-rose-950" />
        Additional architecture (not built into Loan)
      </span>
    </div>
  )
}

export function GlossaryPanel() {
  const [q, setQ] = useState('')
  const entries = Object.entries(INST_GLOSSARY).filter(
    ([k, v]) => !q || k.toLowerCase().includes(q.toLowerCase()) || v.toLowerCase().includes(q.toLowerCase())
  )
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">Glossary</div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search a term"
        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-sm"
      />
      <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
        {entries.map(([k, v]) => (
          <div key={k}>
            <div className="text-sm font-semibold text-slate-100">{k}</div>
            <p className="text-xs text-slate-400 mt-0.5">{v}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
