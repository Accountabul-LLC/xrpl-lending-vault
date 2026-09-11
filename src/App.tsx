import { useState } from 'react'
import Academy from './academy/Academy'
import { AccountabulMark } from './chrome/AccountabulMark'
import { GlossaryDrawer } from './chrome/GlossaryDrawer'
import { ThemeProvider, ThemeToggle } from './chrome/Theme'
import DevnetLab from './lab/DevnetLab'

type View = 'academy' | 'lab'

function navClass(active: boolean) {
  return 'px-3 py-1.5 rounded-lg text-sm ' + (active ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300')
}

function Shell() {
  const [view, setView] = useState<View>('academy')
  const [glossaryOpen, setGlossaryOpen] = useState(false)

  return (
    <div className="min-h-screen min-w-0 flex flex-col">
      <nav className="sticky top-0 z-[var(--z-sticky-header)] shrink-0 border-b border-slate-800 bg-slate-950 px-4 lg:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex items-center gap-2.5">
          <AccountabulMark className="h-8 w-8 shrink-0" />
          <div className="min-w-0">
            <div className="font-semibold text-sm lg:text-base truncate">Accountabul XRPL Academy</div>
            <div className="text-[11px] text-slate-500 hidden sm:block">
              Basic and institutional lending
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button type="button" onClick={() => setView('academy')} className={navClass(view === 'academy')}>
            Academy
          </button>
          <button type="button" onClick={() => setView('lab')} className={navClass(view === 'lab')}>
            <span className="sm:hidden">Lab</span>
            <span className="hidden sm:inline">Live Devnet lab</span>
          </button>
          <button
            type="button"
            onClick={() => setGlossaryOpen(true)}
            aria-expanded={glossaryOpen}
            className={navClass(glossaryOpen)}
          >
            Glossary
          </button>
          <ThemeToggle />
        </div>
      </nav>
      <main
        className={
          view === 'academy'
            ? 'flex-1 min-h-0 min-w-0 w-full px-3 py-3 lg:px-4 lg:py-3'
            : 'flex-1 min-w-0 w-full max-w-7xl mx-auto px-4 py-4 sm:px-6 sm:py-6'
        }
      >
        {view === 'academy' ? <Academy /> : <DevnetLab />}
      </main>
      <GlossaryDrawer open={glossaryOpen} onClose={() => setGlossaryOpen(false)} />
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <Shell />
    </ThemeProvider>
  )
}
