import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BASIC_GLOSSARY } from '../academy/experience/terms'
import { INST_GLOSSARY } from '../academy/institutional/glossary'

const SECTIONS = [
  { title: 'Lending vault', entries: BASIC_GLOSSARY },
  { title: 'Institutional desk', entries: INST_GLOSSARY }
] as const

export function GlossaryDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const q = query.trim().toLowerCase()

  const sections = useMemo(
    () =>
      SECTIONS.map((section) => ({
        title: section.title,
        entries: Object.entries(section.entries).filter(
          ([term, meaning]) =>
            !q || term.toLowerCase().includes(q) || meaning.toLowerCase().includes(q)
        )
      })).filter((section) => section.entries.length > 0),
    [q]
  )

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const id = window.setTimeout(() => searchRef.current?.focus(), 20)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(id)
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-start justify-center p-3 sm:p-6">
      <button
        type="button"
        aria-label="Close glossary"
        className="absolute inset-0 bg-slate-950/70"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="glossary-title"
        className="relative z-[1] mt-8 w-full max-w-2xl max-h-[min(80vh,720px)] flex flex-col rounded-xl border border-slate-800 bg-slate-950 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-800">
          <div className="min-w-0">
            <h2 id="glossary-title" className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Glossary
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Lending vault and institutional terms</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-sm bg-slate-800 text-slate-300 hover:bg-slate-700"
          >
            Close
          </button>
        </div>
        <div className="px-4 pt-3">
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a term"
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-sm"
          />
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-5">
          {sections.length === 0 ? (
            <p className="text-sm text-slate-400">No matching terms.</p>
          ) : (
            sections.map((section) => (
              <section key={section.title}>
                <h3 className="text-[10px] uppercase tracking-wide text-slate-500 mb-2">{section.title}</h3>
                <div className="space-y-3">
                  {section.entries.map(([term, meaning]) => (
                    <div key={term}>
                      <div className="text-sm font-semibold text-slate-100">{term}</div>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{meaning}</p>
                    </div>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
