import { useEffect, useRef, useState } from 'react'
import { Btn } from '../../ui'
import { lessonStepRange, STORY_STEPS } from '../experience/story'
import { useSimulation } from '../simulation/SimulationContext'

export function StepControls({
  lesson,
  reducedMotion
}: {
  lesson: number
  reducedMotion: boolean
}) {
  const sim = useSimulation()
  const simRef = useRef(sim)
  simRef.current = sim
  const [min, max] = lessonStepRange(lesson)
  const step = Math.max(min, Math.min(max, sim.state.currentStep))
  const meta = STORY_STEPS[step - 1]
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    setPlaying(false)
  }, [lesson])

  useEffect(() => {
    if (!playing) return
    const wait = reducedMotion ? 900 : 2600
    const id = window.setInterval(() => {
      const api = simRef.current
      const current = api.state.currentStep
      if (current >= max) {
        setPlaying(false)
        return
      }
      api.goToStep(current + 1, !reducedMotion, lesson)
    }, wait)
    return () => window.clearInterval(id)
  }, [playing, reducedMotion, lesson, max])

  function restart() {
    setPlaying(false)
    sim.setLessonPreset(lesson)
    sim.goToStep(min, !reducedMotion, lesson)
  }

  function play() {
    if (sim.state.currentStep >= max) {
      sim.setLessonPreset(lesson)
      sim.goToStep(min, !reducedMotion, lesson)
    } else if (sim.state.pendingAnimations.length === 0) {
      sim.goToStep(sim.state.currentStep, !reducedMotion, lesson)
    }
    setPlaying(true)
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2.5 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wide text-indigo-300">
            Step {step} of 10
          </div>
          <div className="text-sm font-semibold text-slate-100 truncate">{meta?.title}</div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Btn
            className="bg-slate-700 hover:bg-slate-600"
            disabled={step <= min}
            onClick={() => {
              setPlaying(false)
              sim.goToStep(step - 1, false, lesson)
            }}
          >
            Previous
          </Btn>
          <Btn onClick={play} disabled={playing}>
            Play
          </Btn>
          <Btn className="bg-slate-700 hover:bg-slate-600" onClick={() => setPlaying(false)}>
            Pause
          </Btn>
          <Btn className="bg-slate-700 hover:bg-slate-600" onClick={restart}>
            Restart
          </Btn>
          <Btn
            className="bg-slate-700 hover:bg-slate-600"
            disabled={step >= max}
            onClick={() => {
              setPlaying(false)
              sim.goToStep(step + 1, !reducedMotion, lesson)
            }}
          >
            Next
          </Btn>
        </div>
      </div>
      <div className="mt-2 flex gap-1" aria-hidden>
        {STORY_STEPS.map((s) => (
          <button
            key={s.id}
            type="button"
            title={`Step ${s.id}: ${s.title}`}
            onClick={() => {
              setPlaying(false)
              if (s.id < min || s.id > max) return
              sim.goToStep(s.id, false, lesson)
            }}
            className={
              'h-1.5 flex-1 rounded-full transition ' +
              (s.id < min || s.id > max
                ? 'bg-slate-800/50 cursor-not-allowed'
                : s.id <= step
                  ? 'bg-indigo-500'
                  : 'bg-slate-800 hover:bg-slate-700')
            }
          />
        ))}
      </div>
    </div>
  )
}
