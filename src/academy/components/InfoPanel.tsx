import { STORY_STEPS } from '../experience/story'
import { useSimulation } from '../simulation/SimulationContext'

export function InfoPanel() {
  const sim = useSimulation()
  const step = Math.max(1, Math.min(10, sim.state.currentStep))
  const meta = STORY_STEPS[step - 1]
  if (!meta) return null

  return (
    <section
      data-info-panel
      className="rounded-xl border border-slate-800 bg-slate-950/85 p-3 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-3"
    >
      <Block kicker="Who is involved" body={meta.who} />
      <Block kicker="What is happening" body={meta.what} />
      <Block kicker="Why it matters" body={meta.why} />
    </section>
  )
}

function Block({ kicker, body }: { kicker: string; body: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wide text-indigo-300">{kicker}</div>
      <p className="mt-1 text-sm text-slate-200 leading-snug">{body}</p>
    </div>
  )
}
