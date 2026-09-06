import type { ButtonHTMLAttributes, ReactNode } from 'react'

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3 min-w-0">
      {title && (
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">{title}</h2>
      )}
      {children}
    </div>
  )
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-mono text-slate-100 break-all">{value}</div>
    </div>
  )
}

export function Btn(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={
        'px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition ' +
        (props.className ?? '')
      }
    />
  )
}
