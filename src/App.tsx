import { useState } from 'react'
import Academy from './academy/Academy'
import DevnetLab from './lab/DevnetLab'

type View = 'academy' | 'lab'

export default function App() {
  const [view, setView] = useState<View>('academy')

  return (
    <div className="min-h-screen min-w-0 flex flex-col">
      <nav className="sticky top-0 z-[var(--z-sticky-header)] shrink-0 border-b border-slate-800 bg-slate-950 px-4 lg:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-sm lg:text-base truncate">JRPU Lending Protocol</div>
          <div className="text-[11px] text-slate-500 hidden sm:block">
            {view === 'lab' ? 'NETWORK: XRPL DEVNET — test assets only' : 'Basic and institutional lending academy'}
          </div>
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
      <main
        className={
          view === 'academy'
            ? 'flex-1 min-h-0 min-w-0 w-full px-3 py-3 lg:px-4 lg:py-3'
            : 'flex-1 min-w-0 w-full max-w-7xl mx-auto px-4 py-4 sm:px-6 sm:py-6'
        }
      >
        {view === 'academy' ? <Academy onOpenLab={() => setView('lab')} /> : <DevnetLab />}
      </main>
    </div>
  )
}
