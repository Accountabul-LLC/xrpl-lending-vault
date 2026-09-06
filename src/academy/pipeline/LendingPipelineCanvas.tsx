import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { takeAnimationCallback, useSimulation } from '../simulation/SimulationContext'
import { FallbackPipeline } from './FallbackPipeline'
import { PipelineErrorBoundary } from './PipelineErrorBoundary'
import { LESSON_STEP_UI } from './stepCopy'

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
  const [webglError, setWebglError] = useState<string | null>(null)
  const [sceneAttempt, setSceneAttempt] = useState(0)
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
  const handleWebglFailure = (error: Error) => {
    setWebglError(error.message)
    setWebglOk(false)
  }
  const retryWebgl = () => {
    setWebglError(null)
    setWebglOk(true)
    setSceneAttempt((attempt) => attempt + 1)
  }

  return (
    <div
      ref={frameRef}
      data-viz-frame
      className="relative w-full min-h-[220px] h-[min(48vh,420px)] sm:h-[min(52vh,480px)] lg:min-h-[360px] lg:h-[min(58vh,640px)] rounded-xl border border-slate-800 bg-gradient-to-b from-slate-950 via-[#0b1220] to-slate-950 overflow-hidden"
    >
      {showFallback ? (
        <>
          <FallbackPipeline lesson={lesson} />
          <div className="absolute inset-x-2 top-2 z-[var(--z-banner)] flex items-start justify-between gap-2 rounded-lg border border-amber-500/40 bg-slate-950/95 px-3 py-2 text-xs shadow-lg">
            <div className="min-w-0">
              <div className="font-semibold text-amber-200">Interactive 3D is unavailable</div>
              <div className="mt-0.5 text-slate-400">
                Enable browser hardware acceleration and WebGL, then retry.
                {webglError ? ` ${webglError}` : ''}
              </div>
            </div>
            <button
              type="button"
              onClick={retryWebgl}
              className="shrink-0 rounded-md border border-amber-400/50 px-2 py-1 font-semibold text-amber-100 hover:bg-amber-950"
            >
              Retry 3D
            </button>
          </div>
        </>
      ) : (
        <PipelineErrorBoundary
          key={sceneAttempt}
          fallback={(error) => (
            <FallbackOnError
              lesson={lesson}
              error={error}
              onFallback={handleWebglFailure}
            />
          )}
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
              onWebglFailure={handleWebglFailure}
            />
          </Suspense>
        </PipelineErrorBoundary>
      )}

      {!showFallback && (
        <div
          data-viz-hud
          className="absolute inset-0 z-[var(--z-banner)] pointer-events-none flex flex-col min-w-0 p-2 sm:p-3"
        >
          <div className="flex items-start justify-between gap-2 min-w-0 w-full">
            <div className="min-w-0 flex flex-col gap-1.5">
              {sim.state.statusBanner ? (
                <div className="max-w-full truncate rounded-full border border-indigo-400/40 bg-indigo-950/80 px-3 py-1 text-xs font-semibold tracking-wide text-indigo-100">
                  {sim.state.statusBanner}
                </div>
              ) : null}
              <StepOverlay lesson={lesson} />
            </div>
            <div className="shrink-0 rounded-lg border border-sky-500/40 bg-slate-950/85 px-2.5 py-1.5 text-[10px] font-mono text-slate-300 backdrop-blur-sm shadow-lg">
              <div className="text-[11px] font-semibold font-sans text-sky-200">Lending Vault</div>
              <div className="mt-0.5 grid grid-cols-[auto_auto] gap-x-2">
                <span>Asset</span>
                <span className="text-right">XRP</span>
                <span>Capacity</span>
                <span className="text-right">${Math.round(vault.maxSize).toLocaleString()}</span>
                <span>Available</span>
                <span className="text-right text-emerald-300">
                  ${Math.round(vault.availableLiquidity).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
          <div className="flex-1 min-h-2" />
          <div className="pointer-events-none self-start rounded-full border border-slate-700/70 bg-slate-950/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-slate-400">
            Drag to orbit · Scroll to zoom · Right-drag to pan
          </div>
          {fh === 0 || fh >= 260 ? (
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
          ) : null}
        </div>
      )}
    </div>
  )
}

function StepOverlay({ lesson }: { lesson: number }) {
  const step = LESSON_STEP_UI[lesson] ?? LESSON_STEP_UI[0]
  return (
    <div className="min-w-0 max-w-[min(22rem,calc(100%-7rem))] rounded-lg border border-slate-700/80 bg-slate-950/88 px-2.5 py-2 text-slate-200 shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-semibold tracking-[0.14em] text-indigo-300">
          STEP {step.n} OF 8
        </div>
        <ol className="flex items-center gap-0.5" aria-label="Lesson progress">
          {LESSON_STEP_UI.map((s) => {
            const done = s.n < step.n
            const current = s.n === step.n
            return (
              <li
                key={s.n}
                title={`Step ${s.n}: ${s.title}`}
                className={
                  'h-1.5 w-1.5 rounded-full ' +
                  (current ? 'bg-indigo-300 scale-125' : done ? 'bg-emerald-400' : 'bg-slate-600')
                }
              />
            )
          })}
        </ol>
      </div>
      <div className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-slate-100">{step.title}</div>
      <dl className="mt-1.5 grid grid-cols-[2.4rem_minmax(0,1fr)] gap-x-1 gap-y-0.5 text-[10px] leading-snug">
        <dt className="text-slate-500">WHO</dt>
        <dd className="min-w-0 text-slate-200">{step.who}</dd>
        <dt className="text-slate-500">WHAT</dt>
        <dd className="min-w-0 text-slate-200">{step.what}</dd>
        <dt className="text-slate-500">WHY</dt>
        <dd className="min-w-0 text-slate-400">{step.why}</dd>
      </dl>
    </div>
  )
}

function FallbackOnError({
  lesson,
  error,
  onFallback
}: {
  lesson: number
  error: Error
  onFallback: (error: Error) => void
}) {
  useEffect(() => {
    onFallback(error)
  }, [error, onFallback])
  return <FallbackPipeline lesson={lesson} />
}

export default LendingPipelineCanvas
