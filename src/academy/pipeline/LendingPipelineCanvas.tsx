import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { takeAnimationCallback, useSimulation } from '../simulation/SimulationContext'
import type { EntityId } from '../simulation/types'
import { FallbackPipeline } from './FallbackPipeline'
import { PipelineErrorBoundary } from './PipelineErrorBoundary'

const SceneLoader = lazy(() => import('./SceneMount'))

function clamp(n: number, min: number, max: number) {
  if (max < min) return min
  return Math.min(Math.max(n, min), max)
}

function clampPoint(x: number, y: number, w: number, h: number, padX: number, padY: number) {
  return {
    x: clamp(x, padX, Math.max(padX, w - padX)),
    y: clamp(y, padY, Math.max(padY, h - padY))
  }
}

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
  const [webglOk, setWebglOk] = useState(true)
  const projectRef = useRef<((id: EntityId) => { x: number; y: number } | null) | null>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const [frameSize, setFrameSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    const update = () => setFrameSize({ w: el.clientWidth, h: el.clientHeight })
    update()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      if (!projectRef.current || !webglOk) return
      const next: Partial<Record<EntityId, { x: number; y: number }>> = {}
      ;(['protocol', 'vault', 'depositor', 'borrower'] as EntityId[]).forEach((id) => {
        const p = projectRef.current?.(id)
        if (p) next[id] = p
      })
      setPositions(next)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [webglOk])

  // When 3D is unavailable, apply queued animation completions immediately so UI still works.
  useEffect(() => {
    if (webglOk) return
    for (const anim of sim.state.pendingAnimations) {
      if (anim.started) continue
      sim.startAnimation(anim.id)
      const cb = takeAnimationCallback(anim.id)
      cb?.()
      sim.clearAnimation(anim.id)
    }
  }, [sim, sim.state.pendingAnimations, webglOk])

  const { vault } = sim.state
  const showFallback = !webglOk
  const { w: fw, h: fh } = frameSize
  const protocolPos =
    positions.protocol && fw && fh
      ? clampPoint(positions.protocol.x, positions.protocol.y - 48, fw, fh, 72, 22)
      : null
  const depositorPos =
    positions.depositor && fw && fh
      ? clampPoint(positions.depositor.x, positions.depositor.y + 36, fw, fh, 64, 28)
      : null
  const borrowerPos =
    positions.borrower && fw && fh
      ? clampPoint(positions.borrower.x, positions.borrower.y + 36, fw, fh, 64, 28)
      : null
  const vaultPos =
    positions.vault && fw && fh
      ? clampPoint(positions.vault.x, positions.vault.y - 70, fw, fh, 96, 48)
      : null

  return (
    <div
      ref={frameRef}
      className="relative w-full min-h-[220px] h-[min(48vh,420px)] sm:h-[min(52vh,480px)] lg:h-[min(56vh,520px)] rounded-xl border border-slate-800 bg-gradient-to-b from-slate-950 via-[#0b1220] to-slate-950 overflow-hidden"
    >
      {showFallback ? (
        <FallbackPipeline lesson={lesson} />
      ) : (
        <PipelineErrorBoundary
          fallback={<FallbackOnError lesson={lesson} onFallback={() => setWebglOk(false)} />}
        >
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
              onWebglFailure={() => setWebglOk(false)}
            />
          </Suspense>
        </PipelineErrorBoundary>
      )}

      {!showFallback && protocolPos && (
        <Label x={protocolPos.x} y={protocolPos.y} tone="protocol">
          Protocol / Facilitator
        </Label>
      )}
      {!showFallback && depositorPos && (
        <Label x={depositorPos.x} y={depositorPos.y} tone="depositor">
          Depositor
          <span className="block text-[10px] font-mono text-emerald-200/80">
            ${sim.primaryDepositor.deposited.toLocaleString()} in vault
          </span>
        </Label>
      )}
      {!showFallback && borrowerPos && (
        <Label x={borrowerPos.x} y={borrowerPos.y} tone="borrower">
          Borrower
          <span className="block text-[10px] font-mono text-amber-200/80">
            ${sim.primaryBorrower.remainingBalance.toLocaleString()} outstanding
          </span>
        </Label>
      )}
      {!showFallback && vaultPos && (
        <div
          className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 text-center max-w-[min(16rem,calc(100%-16px))]"
          style={{ left: vaultPos.x, top: vaultPos.y }}
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
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[var(--z-banner)] max-w-[calc(100%-1.5rem)] truncate rounded-full border border-indigo-400/40 bg-indigo-950/80 px-4 py-1.5 text-xs font-semibold tracking-wide text-indigo-100">
          {sim.state.statusBanner}
        </div>
      )}
    </div>
  )
}

function FallbackOnError({
  lesson,
  onFallback
}: {
  lesson: number
  onFallback: () => void
}) {
  useEffect(() => {
    onFallback()
  }, [onFallback])
  return <FallbackPipeline lesson={lesson} />
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
      className={`absolute pointer-events-none -translate-x-1/2 rounded-md border bg-slate-950/80 px-2 py-1 text-[11px] font-medium backdrop-blur-sm max-w-[min(12rem,calc(100%-16px))] text-center ${toneCls}`}
      style={{ left: x, top: y }}
    >
      {children}
    </div>
  )
}

export default LendingPipelineCanvas
