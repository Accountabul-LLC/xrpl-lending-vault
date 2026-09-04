import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { useSimulation } from '../simulation/SimulationContext'
import type { EntityId } from '../simulation/types'

const SceneLoader = lazy(() => import('./SceneMount'))

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

export function LendingPipelineCanvas({
  lesson,
  reduceMotionOverride
}: {
  lesson: number
  reduceMotionOverride: boolean
}) {
  const sim = useSimulation()
  const prefers = usePrefersReducedMotion()
  const reducedMotion = reduceMotionOverride || prefers
  const [positions, setPositions] = useState<Partial<Record<EntityId, { x: number; y: number }>>>({})
  const projectRef = useRef<((id: EntityId) => { x: number; y: number } | null) | null>(null)

  useEffect(() => {
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      if (!projectRef.current) return
      const next: Partial<Record<EntityId, { x: number; y: number }>> = {}
      ;(['protocol', 'vault', 'depositor', 'borrower'] as EntityId[]).forEach((id) => {
        const p = projectRef.current?.(id)
        if (p) next[id] = p
      })
      setPositions(next)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const { vault } = sim.state

  return (
    <div className="relative w-full h-[420px] md:h-[520px] rounded-xl border border-slate-800 bg-gradient-to-b from-slate-950 via-[#0b1220] to-slate-950 overflow-hidden">
      <Suspense
        fallback={
          <div className="absolute inset-0 grid place-items-center text-slate-500 text-sm">
            Loading network visualization…
          </div>
        }
      >
        <SceneLoader
          lesson={lesson}
          reducedMotion={reducedMotion}
          state={sim.state}
          onEntityClick={(id) => sim.selectEntity(id)}
          onAnimationComplete={(id) => sim.clearAnimation(id)}
          onAnimationStart={(id) => sim.startAnimation(id)}
          registerProject={(fn) => {
            projectRef.current = fn
          }}
        />
      </Suspense>

      {/* HTML labels projected over the scene */}
      {positions.protocol && (
        <Label x={positions.protocol.x} y={positions.protocol.y - 48} tone="protocol">
          Protocol / Facilitator
        </Label>
      )}
      {positions.depositor && (
        <Label x={positions.depositor.x} y={positions.depositor.y + 36} tone="depositor">
          Depositor
          <span className="block text-[10px] font-mono text-emerald-200/80">
            ${sim.primaryDepositor.deposited.toLocaleString()} in vault
          </span>
        </Label>
      )}
      {positions.borrower && (
        <Label x={positions.borrower.x} y={positions.borrower.y + 36} tone="borrower">
          Borrower
          <span className="block text-[10px] font-mono text-amber-200/80">
            ${sim.primaryBorrower.remainingBalance.toLocaleString()} outstanding
          </span>
        </Label>
      )}
      {positions.vault && (
        <div
          className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 text-center"
          style={{ left: positions.vault.x, top: positions.vault.y - 70 }}
        >
          <div className="rounded-lg border border-sky-500/40 bg-slate-950/85 px-3 py-2 backdrop-blur-sm shadow-lg">
            <div className="text-xs font-semibold text-sky-200">JRPU Lending Vault</div>
            <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] font-mono text-slate-300">
              <span>Total</span>
              <span className="text-right">${Math.round(vault.totalCapital).toLocaleString()}</span>
              <span>Available</span>
              <span className="text-right text-emerald-300">
                ${Math.round(vault.availableLiquidity).toLocaleString()}
              </span>
              <span>Lent</span>
              <span className="text-right text-amber-300">
                ${Math.round(vault.outstandingLoans).toLocaleString()}
              </span>
              <span>Interest</span>
              <span className="text-right text-indigo-300">
                ${Math.round(vault.interestEarned).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {sim.state.statusBanner && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 rounded-full border border-indigo-400/40 bg-indigo-950/80 px-4 py-1.5 text-xs font-semibold tracking-wide text-indigo-100">
          {sim.state.statusBanner}
        </div>
      )}
    </div>
  )
}

function Label({
  x,
  y,
  tone,
  children
}: {
  x: number
  y: number
  tone: 'protocol' | 'depositor' | 'borrower'
  children: ReactNode
}) {
  const toneCls =
    tone === 'protocol'
      ? 'border-indigo-500/40 text-indigo-100'
      : tone === 'depositor'
        ? 'border-emerald-500/40 text-emerald-100'
        : 'border-amber-500/40 text-amber-100'
  return (
    <div
      className={`absolute pointer-events-none -translate-x-1/2 rounded-md border bg-slate-950/80 px-2 py-1 text-[11px] font-medium backdrop-blur-sm ${toneCls}`}
      style={{ left: x, top: y }}
    >
      {children}
    </div>
  )
}

export default LendingPipelineCanvas
