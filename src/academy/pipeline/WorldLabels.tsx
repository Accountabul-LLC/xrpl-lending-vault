import { useEffect, useState, type MutableRefObject } from 'react'
import { isEntityVisible, PARTICIPANTS } from '../experience/lendingProcess'
import { useSimulation } from '../simulation/SimulationContext'
import type { EntityId } from '../simulation/types'

type ProjectFn = (id: EntityId) => { x: number; y: number } | null

type LabelDef = {
  id: EntityId
  text: string
  tint: string
}

const LABEL_H = 26
const HUD_RESERVE = 96

function measureWidth(text: string) {
  return Math.min(176, Math.max(88, text.length * 8 + 22))
}

function overlap(a: { x: number; y: number; w: number }, b: { x: number; y: number; w: number }) {
  return Math.abs(a.x - b.x) < (a.w + b.w) / 2 + 8 && Math.abs(a.y - b.y) < LABEL_H + 6
}

type ProjectHolder = {
  fn: ProjectFn | null
}

function shortLabel(id: EntityId, text: string, width: number) {
  if (width >= 640) return text
  if (id === 'administrator') return 'Admin'
  if (id === 'vault') return 'Vault'
  if (id === 'originator') return 'Originator'
  if (id === 'underwriter') return 'Underwriter'
  if (id === 'custodian') return 'Custodian'
  if (id === 'servicer') return 'Servicer'
  if (id === 'protocol') return 'XRPL'
  return text
}

export function WorldLabels({
  projectRef,
  frameRef,
  enabled
}: {
  projectRef: MutableRefObject<ProjectHolder>
  frameRef: MutableRefObject<HTMLDivElement | null>
  enabled: boolean
}) {
  const sim = useSimulation()
  const [placed, setPlaced] = useState<(LabelDef & { x: number; y: number; w: number })[]>([])
  const advanced = sim.state.showAdvancedRoles || sim.state.advancedReveal > 0
  const agreementVisible = sim.state.agreementAccepted || sim.state.currentStep === 8

  useEffect(() => {
    if (!enabled) {
      setPlaced([])
      return
    }
    let raf = 0
    let last = ''
    const tick = () => {
      const project = projectRef.current.fn
      const root = frameRef.current
      if (project && root) {
        const width = root.clientWidth
        const height = root.clientHeight
        const defs: LabelDef[] = PARTICIPANTS.filter((p) =>
          isEntityVisible(p.id, advanced, agreementVisible)
        ).map((p) => ({ id: p.id, text: p.label, tint: p.tint }))
        const next: (LabelDef & { x: number; y: number; w: number })[] = []
        for (const def of defs) {
          const pt = project(def.id)
          if (!pt) continue
          const text = shortLabel(def.id, def.text, width)
          const w = measureWidth(text)
          next.push({
            ...def,
            text,
            w,
            x: pt.x,
            y: pt.y - 18
          })
        }
        next.sort((a, b) => a.x - b.x)
        for (const label of next) {
          label.x = Math.min(width - label.w / 2 - 8, Math.max(label.w / 2 + 8, label.x))
          label.y = Math.min(height - LABEL_H / 2 - 72, Math.max(HUD_RESERVE + LABEL_H / 2, label.y))
        }
        for (let pass = 0; pass < 4; pass++) {
          for (let i = 0; i < next.length; i++) {
            for (let j = i + 1; j < next.length; j++) {
              const a = next[i]
              const b = next[j]
              if (!overlap(a, b)) continue
              const push = (a.w + b.w) / 2 + 10 - Math.abs(b.x - a.x)
              if (b.x >= a.x) {
                b.x = Math.min(width - b.w / 2 - 8, b.x + push)
                a.x = Math.max(a.w / 2 + 8, a.x - push * 0.25)
              }
              if (overlap(a, b)) {
                a.y = Math.max(HUD_RESERVE + LABEL_H / 2, a.y - (LABEL_H + 8))
              }
            }
          }
        }
        const key = next.map((l) => `${l.id}:${Math.round(l.x)}:${Math.round(l.y)}`).join('|')
        if (key !== last) {
          last = key
          setPlaced(next)
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [enabled, projectRef, frameRef, advanced, agreementVisible, sim.state.currentStep])

  if (!enabled) return null

  return (
    <div className="absolute inset-0 z-[12] pointer-events-none overflow-hidden" aria-hidden={false}>
      {placed.map((label) => (
        <button
          key={label.id}
          type="button"
          onClick={() => sim.selectEntity(label.id)}
          className="absolute pointer-events-auto -translate-x-1/2 -translate-y-1/2 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold leading-tight shadow-lg whitespace-nowrap bg-slate-950/90"
          style={{
            left: label.x,
            top: label.y,
            color: label.tint,
            borderColor: `${label.tint}99`
          }}
        >
          {label.text}
        </button>
      ))}
    </div>
  )
}
