import { useState } from 'react'
import Academy from './academy/Academy'
import DevnetLab from './lab/DevnetLab'

type View = 'academy' | 'lab'

export default function App() {
  const [view, setView] = useState<View>('academy')

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="shrink-0 border-b border-slate-800 px-4 lg:px-6 py-2.5 flex items-center justify-between gap-4">
        <div>
          <div className="font-semibold text-sm lg:text-base">JRPU Lending Protocol</div>
          <div className="text-[11px] text-slate-500">Basic and institutional lending academy</div>
        </div>
        <div className="flex gap-2">
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
            Live Devnet lab
          </button>
        </div>
      </nav>
      <main
        className={
          view === 'academy'
            ? 'flex-1 min-h-0 px-3 py-3 lg:px-4 lg:py-3 w-full'
            : 'flex-1 p-6 max-w-7xl mx-auto w-full'
        }
      >
        {view === 'academy' ? <Academy onOpenLab={() => setView('lab')} /> : <DevnetLab />}
      </main>
    </div>
  )
}
