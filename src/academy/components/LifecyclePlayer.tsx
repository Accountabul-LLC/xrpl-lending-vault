import { useEffect, useRef, useState } from 'react'
import { Btn } from '../../ui'
import { useSimulation } from '../simulation/SimulationContext'

const STEPS = [
  'Deposit',
  'Vault funding',
  'Borrower request',
  'Approval',
  'Loan funding',
  'Borrower repayment',
  'Interest received',
  'Depositor distribution'
]

export function LifecyclePlayer({ reducedMotion }: { reducedMotion: boolean }) {
  const sim = useSimulation()
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    if (!playing) {
      if (timer.current) window.clearInterval(timer.current)
      return
    }
    timer.current = window.setInterval(() => {
      setStep((s) => {
        const next = s + 1
        if (next >= STEPS.length) {
          setPlaying(false)
          return s
        }
        sim.playLifecycleStep(next, reducedMotion)
        return next
      })
    }, reducedMotion ? 900 : 2200)
    return () => {
      if (timer.current) window.clearInterval(timer.current)
    }
  }, [playing, reducedMotion, sim])

  function restart() {
    setPlaying(false)
    sim.reset()
    setStep(0)
    sim.setLessonPreset(5)
    sim.playLifecycleStep(0, reducedMotion)
  }

  function next() {
    setPlaying(false)
    const nextStep = Math.min(STEPS.length - 1, step + 1)
    setStep(nextStep)
    sim.playLifecycleStep(nextStep, reducedMotion)
  }

  function play() {
    if (step === 0 && !playing) sim.playLifecycleStep(0, reducedMotion)
    setPlaying(true)
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs uppercase tracking-wide text-indigo-300">Following the money</div>
          <div className="text-sm text-slate-200">
            Step {step + 1}/{STEPS.length}: {STEPS[step]}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn onClick={play} disabled={playing}>
            Play
          </Btn>
          <Btn className="bg-slate-700 hover:bg-slate-600" onClick={() => setPlaying(false)}>
            Pause
          </Btn>
          <Btn className="bg-slate-700 hover:bg-slate-600" onClick={restart}>
            Restart
          </Btn>
          <Btn className="bg-slate-700 hover:bg-slate-600" onClick={next}>
            Next Step
          </Btn>
        </div>
      </div>
      <div className="flex gap-1">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={
              'h-1 flex-1 rounded-full ' + (i <= step ? 'bg-indigo-500' : 'bg-slate-800')
            }
          />
        ))}
      </div>
    </div>
  )
}
