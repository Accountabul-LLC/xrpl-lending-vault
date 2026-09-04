import { useState } from 'react'
import { Btn } from '../../ui'
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
    <div className="grid lg:grid-cols-[16rem_1fr] gap-6">
      <aside className="space-y-2 relative z-20">
        <TrackToggle track={track} onChange={setTrack} />
        {INST_LESSONS.map((title, i) => (
          <button
            key={title}
            type="button"
            onClick={() => setLesson(i)}
            className={
              'w-full text-left rounded-lg px-3 py-2 text-sm transition ' +
              (i === lesson ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900')
            }
          >
            <span className="text-xs opacity-70">Lesson {i + 1}</span>
            <div>{title}</div>
          </button>
        ))}
        <label className="mt-4 flex items-center gap-2 px-2 text-xs text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={reduceMotion}
            onChange={(e) => setReduceMotion(e.target.checked)}
            className="rounded border-slate-600"
          />
          Reduce motion
        </label>
      </aside>

      <div className={'space-y-5 min-w-0' + (reduceMotion ? ' motion-safe-off' : '')}>
        <div>
          <p className="text-xs uppercase tracking-wide text-indigo-300">Institutional lending</p>
          <h1 className="text-2xl font-bold mt-1">
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
