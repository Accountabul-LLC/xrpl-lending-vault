import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { EntityPanel } from '../components/EntityPanel'
import { ProcessHud } from '../components/ProcessHud'
import { StepControls } from '../components/StepControls'
import { takeAnimationCallback, useSimulation } from '../simulation/SimulationContext'
import type { EntityId } from '../simulation/types'
import { FallbackPipeline } from './FallbackPipeline'
import { PipelineErrorBoundary } from './PipelineErrorBoundary'
import { WorldLabels } from './WorldLabels'

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
  const [webglOk, setWebglOk] = useState(true)
  const [webglError, setWebglError] = useState<string | null>(null)
  const [sceneAttempt, setSceneAttempt] = useState(0)
  const frameRef = useRef<HTMLDivElement>(null)
  const projectRef = useRef<{ fn: ((id: EntityId) => { x: number; y: number } | null) | null }>({
    fn: null
  })

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

  const showFallback = !webglOk
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
      className="academy-viz theme-locked relative w-full min-h-[280px] rounded-xl border border-slate-800 bg-gradient-to-b from-slate-950 via-[#0b1220] to-slate-950 overflow-hidden"
    >
      {showFallback ? (
        <>
          <FallbackPipeline lesson={lesson} />
          <div className="absolute inset-x-2 top-[5.75rem] z-[var(--z-banner)] flex items-start justify-between gap-2 rounded-lg border border-amber-500/40 bg-slate-950/95 px-3 py-2 text-xs shadow-lg">
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
            <FallbackOnError lesson={lesson} error={error} onFallback={handleWebglFailure} />
          )}
        >
          <Suspense
            fallback={
              <div className="absolute inset-0 grid place-items-center text-slate-500 text-sm">
                Loading lending world…
              </div>
            }
          >
            <SceneLoader
              lesson={lesson}
              reducedMotion={reducedMotion}
              state={sim.state}
              onEntityClick={(id) => sim.selectEntity(id)}
              onAnimationComplete={(id) => sim.clearAnimation(animSafe(id))}
              onAnimationStart={(id) => sim.startAnimation(id)}
              registerProject={(fn) => {
                projectRef.current.fn = fn
              }}
              onWebglFailure={handleWebglFailure}
            />
            <WorldLabels projectRef={projectRef} frameRef={frameRef} enabled={webglOk} />
          </Suspense>
        </PipelineErrorBoundary>
      )}

      <ProcessHud />

      {sim.state.selectedEntity && (
        <div className="absolute left-2 bottom-[4.75rem] sm:bottom-[5.25rem] z-[var(--z-popover)] w-[min(calc(100%-1rem),20rem)] max-h-[min(42%,22rem)] overflow-y-auto">
          <EntityPanel />
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 z-[var(--z-banner)] p-2 pointer-events-none">
        <div className="pointer-events-auto max-w-5xl mx-auto">
          <StepControls lesson={lesson} reducedMotion={reducedMotion} compact />
        </div>
      </div>
    </div>
  )
}

function animSafe(id: string) {
  return id
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
