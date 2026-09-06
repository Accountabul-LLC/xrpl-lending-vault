const STEPS = [
  'Fund Wallets',
  'Create Vault',
  'Deposit Liquidity',
  'Create Loan Broker',
  'Originate Loan',
  'Make Payment',
  'Withdraw',
  'Verify Ledger'
]

export function WalkthroughDiagram({
  kind
}: {
  kind: string | null
}) {
  if (!kind) return null
  const full = kind === 'title' || kind === 'recap'
  return <aside className={`walkthrough-diagram inst-in${full ? ' is-full' : ''}`}>{render(kind)}</aside>
}

function render(kind: string) {
  switch (kind) {
    case 'title':
      return (
        <div className="text-center space-y-4 px-6">
          <div className="text-[11px] tracking-[0.28em] text-sky-300">XRPL DEVNET</div>
          <h2 className="text-4xl font-bold tracking-tight">Accountabul Lending Protocol</h2>
          <p className="text-xl text-indigo-200">Live XRPL DevNet Lab Walkthrough</p>
          <p className="text-sm text-slate-400">
            From Funding Wallets to Deposits, Loans, Payments and Withdrawals
          </p>
        </div>
      )
    case 'roles':
      return (
        <div className="space-y-3">
          <h3 className="text-xs uppercase tracking-wide text-slate-400">Three roles</h3>
          <Role name="Vault Owner / Loan Broker" tone="indigo" duty="Operate infrastructure" />
          <Role name="Depositor" tone="emerald" duty="Provide liquidity, hold shares" />
          <Role name="Borrower" tone="amber" duty="Receive capital, repay the loan" />
        </div>
      )
    case 'reset':
      return (
        <div className="rounded-xl border border-amber-400/30 bg-amber-950/40 p-4 text-center">
          <div className="text-lg font-semibold text-amber-100">New Session ≠ Erase Ledger</div>
          <p className="mt-2 text-sm text-slate-300">
            Reset clears cached IDs in this browser. Validated DevNet transactions stay on XRPL.
          </p>
        </div>
      )
    case 'vault':
      return (
        <div className="flex items-center gap-4">
          <VaultGlyph />
          <p className="text-sm text-slate-300 max-w-xs">
            A pool for one asset. Depositors put capital in. The vault issues shares. Capacity is a
            hard ceiling.
          </p>
        </div>
      )
    case 'depositor':
      return (
        <p className="text-sm text-slate-300">
          The depositor is moving capital toward the vault — not buying the vault.
        </p>
      )
    case 'shares':
      return (
        <ol className="flex flex-wrap items-center justify-center gap-2 text-sm">
          {['Depositor', 'Assets', 'Vault', 'Vault Shares', 'Depositor'].map((n, i) => (
            <li key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-indigo-300">→</span>}
              <span className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1">{n}</span>
            </li>
          ))}
        </ol>
      )
    case 'loanbook':
      return (
        <div className="grid gap-2 text-sm">
          <div className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Application view</div>
            <div className="font-semibold">Protocol Loan Book</div>
          </div>
          <div className="text-center text-indigo-300">=</div>
          <div className="text-center text-xs text-slate-500">not the same as</div>
          <div className="rounded-lg border border-indigo-400/40 bg-indigo-950/50 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wide text-indigo-300">XRPL protocol object</div>
            <div className="font-semibold">LoanBroker</div>
          </div>
        </div>
      )
    case 'borrower':
      return <p className="text-sm text-amber-100">The borrower enters the lending environment.</p>
    case 'signing':
      return (
        <div className="flex gap-2 text-sm">
          <span className="rounded-full bg-indigo-600 px-3 py-1">1. Loan Broker signs</span>
          <span className="text-slate-500">then</span>
          <span className="rounded-full bg-amber-600 px-3 py-1">2. Borrower signs</span>
        </div>
      )
    case 'payment':
      return (
        <div className="flex gap-3 text-sm">
          <span className="rounded-lg bg-sky-900/80 px-3 py-2">Principal — reduces the balance</span>
          <span className="rounded-lg bg-violet-900/80 px-3 py-2">Interest — cost of borrowing</span>
        </div>
      )
    case 'liquidity':
      return (
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg border border-slate-700 p-3">
            <div className="text-xs text-slate-500">Assets Total</div>
            <div className="font-mono">Includes loans outstanding</div>
          </div>
          <div className="rounded-lg border border-emerald-500/30 p-3">
            <div className="text-xs text-emerald-400">Assets Available</div>
            <div className="font-mono">Can be withdrawn now</div>
          </div>
        </div>
      )
    case 'error':
      return (
        <div className="text-sm text-rose-100">
          Never stop at “Something went wrong.” Show the XRPL code, the meaning, and the fix.
        </div>
      )
    case 'dashboard':
      return (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Dash title="Vault" lines={['ID', 'Total assets', 'Available', 'Max capacity']} />
          <Dash title="Depositor" lines={['Vault shares', 'Deposits', 'Withdrawals']} />
          <Dash title="Loan Broker" lines={['Loan Broker ID', 'Active loans']} />
          <Dash title="Borrower" lines={['Loan ID', 'Outstanding', 'Payments', 'Status']} />
        </div>
      )
    case 'recap':
      return (
        <div className="text-center space-y-5">
          <ol className="mx-auto max-w-sm space-y-1 text-sm">
            {STEPS.map((s, i) => (
              <li key={s} className="flex flex-col items-center">
                <span className="rounded-md bg-slate-900 px-3 py-1 border border-slate-700">
                  {i + 1}. {s}
                </span>
                {i < STEPS.length - 1 && <span className="text-indigo-400">↓</span>}
              </li>
            ))}
          </ol>
          <div>
            <div className="text-3xl font-bold">Accountabul</div>
            <div className="text-indigo-200">Lending Protocol Lab</div>
            <div className="mt-2 text-sm text-slate-400">Learn it. Test it. Verify it on XRPL.</div>
          </div>
        </div>
      )
    default:
      return null
  }
}

function Role({ name, tone, duty }: { name: string; tone: string; duty: string }) {
  const map: Record<string, string> = {
    indigo: 'border-indigo-400/40 bg-indigo-950/50',
    emerald: 'border-emerald-400/40 bg-emerald-950/40',
    amber: 'border-amber-400/40 bg-amber-950/40'
  }
  return (
    <div className={`rounded-lg border px-3 py-2 ${map[tone]}`}>
      <div className="text-sm font-semibold">{name}</div>
      <div className="text-xs text-slate-400">{duty}</div>
    </div>
  )
}

function Dash({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/80 p-2 text-left">
      <div className="font-semibold text-slate-200 mb-1">{title}</div>
      {lines.map((l) => (
        <div key={l} className="text-slate-400">
          {l}
        </div>
      ))}
    </div>
  )
}

function VaultGlyph() {
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" fill="none" aria-hidden>
      <rect x="8" y="18" width="72" height="54" rx="14" fill="#1e1b4b" stroke="#818cf8" strokeWidth="2" />
      <circle cx="44" cy="45" r="12" stroke="#a5b4fc" strokeWidth="2" />
      <path d="M44 39v12M38 45h12" stroke="#c7d2fe" strokeWidth="2" />
      <path d="M22 18V12h44v6" stroke="#6366f1" strokeWidth="2" />
    </svg>
  )
}
