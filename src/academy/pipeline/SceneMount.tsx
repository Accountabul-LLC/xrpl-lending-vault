import { useEffect, useRef } from 'react'
import { takeAnimationCallback } from '../simulation/SimulationContext'
import type { EntityId, SimulationState } from '../simulation/types'
import { LendingNetworkScene } from './LendingNetworkScene'

export default function SceneMount({
  lesson,
  reducedMotion,
  state,
  onEntityClick,
  onAnimationComplete,
  onAnimationStart,
  registerProject,
  onWebglFailure
}: {
  lesson: number
  reducedMotion: boolean
  state: SimulationState
  onEntityClick: (id: EntityId) => void
  onAnimationComplete: (id: string) => void
  onAnimationStart: (id: string) => void
  registerProject: (fn: (id: EntityId) => { x: number; y: number } | null) => void
  onWebglFailure?: () => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<LendingNetworkScene | null>(null)
  const clickRef = useRef(onEntityClick)
  const completeRef = useRef(onAnimationComplete)
  const startRef = useRef(onAnimationStart)
  clickRef.current = onEntityClick
  completeRef.current = onAnimationComplete
  startRef.current = onAnimationStart

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    try {
      const scene = new LendingNetworkScene(root, {
        onEntityClick: (id) => clickRef.current(id),
        onAnimationComplete: (id) => completeRef.current(id),
        onAnimationStart: (id) => startRef.current(id),
        takeCallback: takeAnimationCallback
      })
      sceneRef.current = scene
      registerProject((id) => scene.projectEntity(id))
      return () => {
        scene.dispose()
        sceneRef.current = null
      }
    } catch {
      onWebglFailure?.()
      return
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    sceneRef.current?.setReducedMotion(reducedMotion)
  }, [reducedMotion])

  useEffect(() => {
    sceneRef.current?.setLesson(lesson)
  }, [lesson])

  useEffect(() => {
    sceneRef.current?.syncState(state)
  }, [state])

  return <div ref={rootRef} className="absolute inset-0" />
}
