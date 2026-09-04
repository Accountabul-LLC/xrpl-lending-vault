import { useState } from 'react'
import Academy from './academy/Academy'
import DevnetLab from './lab/DevnetLab'

type View = 'academy' | 'lab'

export default function App() {
  const [view, setView] = useState<View>('academy')

  return (
    <div className="min-h-screen min-w-0 flex flex-col">
      <nav className="sticky top-0 z-[var(--z-sticky-header)] border-b border-slate-800 bg-slate-950/95 backdrop-blur px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold truncate">JRPU Lending Protocol</div>
          <div className="text-xs text-slate-500 hidden sm:block">Depositor · Borrower · Protocol</div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setView('academy')}
            className={
              'px-3 py-1.5 rounded-lg text-sm ' +
              (view === 'academy' ? 'bg-indigo-600' : 'bg-slate-800 text-slate-300')
            }
          >
            Academy
          </button>
          <button
            type="button"
            onClick={() => setView('lab')}
            className={
              'px-3 py-1.5 rounded-lg text-sm ' +
              (view === 'lab' ? 'bg-indigo-600' : 'bg-slate-800 text-slate-300')
            }
          >
            <span className="sm:hidden">Lab</span>
            <span className="hidden sm:inline">Live Devnet lab</span>
          </button>
        </div>
      </nav>
      <main className="flex-1 min-w-0 w-full max-w-[100rem] mx-auto px-4 py-4 sm:px-6 sm:py-6">
        {view === 'academy' ? <Academy onOpenLab={() => setView('lab')} /> : <DevnetLab />}
      </main>
    </div>
  )
}
