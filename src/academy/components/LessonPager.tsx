import { Btn } from '../../ui'

export function LessonPager({
  lesson,
  lastIndex,
  onPrev,
  onNext,
  onFinish,
  finishLabel = 'Open the live Devnet lab'
}: {
  lesson: number
  lastIndex: number
  onPrev: () => void
  onNext: () => void
  onFinish?: () => void
  finishLabel?: string
}) {
  return (
    <div className="flex flex-wrap gap-2 shrink-0">
      <Btn
        className="bg-slate-700 hover:bg-slate-600"
        disabled={lesson === 0}
        onClick={onPrev}
      >
        Previous lesson
      </Btn>
      {lesson < lastIndex ? (
        <Btn onClick={onNext}>Next lesson</Btn>
      ) : onFinish ? (
        <Btn onClick={onFinish}>{finishLabel}</Btn>
      ) : null}
    </div>
  )
}
