import { useState } from 'react'
import Academy from './academy/Academy'
import DevnetLab from './lab/DevnetLab'

type View = 'academy' | 'lab'

export default function App() {
  const [view, setView] = useState<View>('academy')

  return (
    <div className="min-h-screen">
      <nav className="border-b border-slate-800 px-6 py-3 flex items-center justify-between gap-4">
        <div>
          <div className="font-semibold">JRPU Lending Protocol</div>
          <div className="text-xs text-slate-500">Basic and institutional lending academy</div>
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
      <main className="p-6 max-w-7xl mx-auto">
        {view === 'academy' ? <Academy onOpenLab={() => setView('lab')} /> : <DevnetLab />}
      </main>
    </div>
  )
}
