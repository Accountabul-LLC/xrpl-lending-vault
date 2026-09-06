import { useMemo, useState, type ReactNode } from 'react'
import Academy from './academy/Academy'
import DevnetLab from './lab/DevnetLab'
import WalkthroughPlayer from './walkthrough/WalkthroughPlayer'

type View = 'academy' | 'lab' | 'walkthrough'

function initialView(): View {
  const q = new URLSearchParams(window.location.search)
  const v = q.get('view')
  if (v === 'walkthrough' || v === 'lab' || v === 'academy') return v
  return 'academy'
}

export default function App() {
  const [view, setView] = useState<View>(initialView)
  const record = useMemo(
    () => new URLSearchParams(window.location.search).get('record') === '1',
    []
  )

  if (record) {
    return <WalkthroughPlayer record onExit={undefined} />
  }

  return (
    <div className="min-h-screen min-w-0 flex flex-col">
      <nav className="sticky top-0 z-[var(--z-sticky-header)] shrink-0 border-b border-slate-800 bg-slate-950 px-4 lg:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-sm lg:text-base truncate">Accountabul Lending Protocol</div>
          <div className="text-[11px] text-slate-500 hidden sm:block">
            JRPU academy and live XRPL DevNet lab
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <NavBtn active={view === 'academy'} onClick={() => setView('academy')}>
            Academy
          </NavBtn>
          <NavBtn active={view === 'lab'} onClick={() => setView('lab')}>
            <span className="sm:hidden">Lab</span>
            <span className="hidden sm:inline">Live DevNet lab</span>
          </NavBtn>
          <NavBtn active={view === 'walkthrough'} onClick={() => setView('walkthrough')}>
            Walkthrough
          </NavBtn>
        </div>
      </nav>
      <main
        className={
          view === 'academy'
            ? 'flex-1 min-h-0 min-w-0 w-full px-3 py-3 lg:px-4 lg:py-3'
            : view === 'walkthrough'
              ? 'flex-1 min-w-0 w-full max-w-[1680px] mx-auto px-3 py-3 sm:px-5 sm:py-4 overflow-x-clip'
              : 'flex-1 min-w-0 w-full max-w-7xl mx-auto px-4 py-4 sm:px-6 sm:py-6'
        }
      >
        {view === 'academy' ? (
          <Academy onOpenLab={() => setView('lab')} />
        ) : view === 'lab' ? (
          <DevnetLab onOpenWalkthrough={() => setView('walkthrough')} />
        ) : (
          <WalkthroughPlayer onExit={() => setView('lab')} />
        )}
      </main>
    </div>
  )
}

function NavBtn({
  active,
  onClick,
  children
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'px-3 py-1.5 rounded-lg text-sm ' +
        (active ? 'bg-indigo-600' : 'bg-slate-800 text-slate-300')
      }
    >
      {children}
    </button>
  )
}
