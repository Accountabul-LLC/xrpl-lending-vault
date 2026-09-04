import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { takeAnimationCallback, useSimulation } from '../simulation/SimulationContext'
import { FallbackPipeline } from './FallbackPipeline'
import { PipelineErrorBoundary } from './PipelineErrorBoundary'

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

function HudChip({
  tone,
  title,
  detail
}: {
  tone: 'protocol' | 'depositor' | 'borrower'
  title: string
  detail?: string
}) {
  const toneCls =
    tone === 'protocol'
      ? 'border-indigo-500/40 text-indigo-100'
      : tone === 'depositor'
        ? 'border-emerald-500/40 text-emerald-100'
        : 'border-amber-500/40 text-amber-100'
  return (
    <div
      className={`min-w-0 max-w-[min(12rem,calc(50%-4px))] rounded-md border bg-slate-950/85 px-2 py-1 text-[11px] font-medium backdrop-blur-sm ${toneCls}`}
    >
      <div className="truncate">{title}</div>
      {detail ? <div className="truncate text-[10px] font-mono opacity-80">{detail}</div> : null}
    </div>
  )
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
  const [webglOk, setWebglOk] = useState(true)
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
  const { h: fh } = frameSize
  const showProtocolChip = fh === 0 || fh >= 280

  return (
    <div
      ref={frameRef}
      data-viz-frame
      className="relative w-full min-h-[220px] h-[min(48vh,420px)] sm:h-[min(52vh,480px)] lg:min-h-[360px] lg:h-[min(58vh,640px)] rounded-xl border border-slate-800 bg-gradient-to-b from-slate-950 via-[#0b1220] to-slate-950 overflow-hidden"
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
              registerProject={() => {}}
              onWebglFailure={() => setWebglOk(false)}
            />
          </Suspense>
        </PipelineErrorBoundary>
      )}

      {!showFallback && (
        <div
          data-viz-hud
          className="absolute inset-0 z-[var(--z-banner)] pointer-events-none flex flex-col min-w-0 p-2 sm:p-3"
        >
          <div className="flex flex-col items-center gap-1.5 min-w-0 w-full">
            {sim.state.statusBanner ? (
              <div className="max-w-full truncate rounded-full border border-indigo-400/40 bg-indigo-950/80 px-3 py-1 text-xs font-semibold tracking-wide text-indigo-100">
                {sim.state.statusBanner}
              </div>
            ) : null}
            {showProtocolChip ? <HudChip tone="protocol" title="Protocol / Facilitator" /> : null}
            <div className="w-full max-w-[min(16rem,100%)] rounded-lg border border-sky-500/40 bg-slate-950/85 px-3 py-2 text-center backdrop-blur-sm shadow-lg">
              <div className="text-xs font-semibold text-sky-200">JRPU Lending Vault</div>
              <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] font-mono text-slate-300">
                <span className="text-left">Total</span>
                <span className="text-right">${Math.round(vault.totalCapital).toLocaleString()}</span>
                <span className="text-left">Available</span>
                <span className="text-right text-emerald-300">
                  ${Math.round(vault.availableLiquidity).toLocaleString()}
                </span>
                <span className="text-left">Lent</span>
                <span className="text-right text-amber-300">
                  ${Math.round(vault.outstandingLoans).toLocaleString()}
                </span>
                <span className="text-left">Interest</span>
                <span className="text-right text-indigo-300">
                  ${Math.round(vault.interestEarned).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
          <div className="flex-1 min-h-2" />
          <div className="flex items-end justify-between gap-2 min-w-0 w-full">
            <HudChip
              tone="depositor"
              title="Depositor"
              detail={`$${sim.primaryDepositor.deposited.toLocaleString()} in vault`}
            />
            <HudChip
              tone="borrower"
              title="Borrower"
              detail={`$${sim.primaryBorrower.remainingBalance.toLocaleString()} outstanding`}
            />
          </div>
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

export default LendingPipelineCanvas
