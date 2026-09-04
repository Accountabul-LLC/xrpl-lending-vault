import { useState } from 'react'
import { Btn } from '../../ui'
import { LessonNav } from '../components/LessonNav'
import {
  complexityForReveal,
  INST_LESSONS,
  revealForComplexity,
  type Complexity,
  type Labeling,
  type StructureView
} from './glossary'
import { InstLessonBody } from './Lessons'
import { TrackToggle } from './shared'

export default function Institutional({
  onOpenLab,
  track,
  setTrack,
  lesson,
  setLesson,
  reduceMotion,
  setReduceMotion
}: {
  onOpenLab: () => void
  track: 'basic' | 'institutional'
  setTrack: (t: 'basic' | 'institutional') => void
  lesson: number
  setLesson: (n: number | ((p: number) => number)) => void
  reduceMotion: boolean
  setReduceMotion: (v: boolean) => void
}) {
  const [complexity, setComplexity] = useState<Complexity>('simple')
  const [revealLevel, setRevealLevel] = useState(0)
  const [structure, setStructure] = useState<StructureView>('many')
  const [labeling, setLabeling] = useState<Labeling>('roles')

  function applyComplexity(c: Complexity) {
    setComplexity(c)
    setRevealLevel(revealForComplexity(c))
  }

  function applyReveal(n: number) {
    setRevealLevel(n)
    setComplexity(complexityForReveal(n))
  }

  return (
    <div className="academy-shell min-w-0 grid grid-cols-1 lg:grid-cols-[minmax(200px,240px)_minmax(0,1fr)] gap-3 lg:gap-4">
      <aside className="relative z-[var(--z-sticky-sidebar)] min-w-0 flex flex-col gap-1 lg:sticky lg:top-16 lg:self-start">
        <div className="pb-1">
          <TrackToggle track={track} onChange={setTrack} />
        </div>
        <LessonNav lessons={INST_LESSONS} lesson={lesson} onSelect={setLesson} />
        <label className="mt-2 flex items-center gap-2 px-2 text-[11px] text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={reduceMotion}
            onChange={(e) => setReduceMotion(e.target.checked)}
            className="rounded border-slate-600"
          />
          Reduce motion
        </label>
      </aside>

      <div className={'space-y-4 min-w-0' + (reduceMotion ? ' motion-safe-off' : '')}>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-indigo-300 leading-none">
            Institutional lending
          </p>
          <h1 className="text-xl lg:text-2xl font-bold mt-0.5 leading-tight break-words">
            Lesson {lesson + 1}: {INST_LESSONS[lesson]}
          </h1>
        </div>
        <InstLessonBody
          n={lesson}
          controls={{
            complexity,
            revealLevel,
            structure,
            labeling,
            setComplexity: applyComplexity,
            setReveal: applyReveal,
            setStructure,
            setLabeling
          }}
        />
        <div className="flex flex-wrap gap-2 pt-2">
          <Btn
            className="bg-slate-700 hover:bg-slate-600"
            disabled={lesson === 0}
            onClick={() => setLesson((n) => n - 1)}
          >
            Previous lesson
          </Btn>
          {lesson < INST_LESSONS.length - 1 ? (
            <Btn onClick={() => setLesson((n) => n + 1)}>Next lesson</Btn>
          ) : (
            <Btn onClick={onOpenLab}>Open the live Devnet lab</Btn>
          )}
        </div>
      </div>
    </div>
  )
}
