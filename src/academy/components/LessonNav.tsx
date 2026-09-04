export function LessonNav({
  lessons,
  lesson,
  onSelect
}: {
  lessons: readonly string[]
  lesson: number
  onSelect: (index: number) => void
}) {
  return (
    <>
      {/* Phones / tablets: numbered chips so the rail does not push the visualization off-screen */}
      <nav className="lg:hidden flex flex-wrap gap-1" aria-label="Lessons">
        {lessons.map((title, i) => (
          <button
            key={title}
            type="button"
            title={`Lesson ${i + 1}: ${title}`}
            aria-current={i === lesson ? 'page' : undefined}
            onClick={() => onSelect(i)}
            className={
              'h-8 w-8 rounded-lg text-sm transition ' +
              (i === lesson ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800')
            }
          >
            {i + 1}
          </button>
        ))}
      </nav>

      {/* Desktop: compact titled rail, all lessons visible without nested scrolling */}
      <nav className="hidden lg:flex flex-col gap-0.5" aria-label="Lessons">
        {lessons.map((title, i) => (
          <button
            key={title}
            type="button"
            aria-current={i === lesson ? 'page' : undefined}
            onClick={() => onSelect(i)}
            className={
              'w-full text-left rounded-md px-2.5 py-1.5 text-[13px] leading-snug transition ' +
              (i === lesson ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900/80')
            }
          >
            <span className="block text-[10px] opacity-70 leading-none mb-0.5">Lesson {i + 1}</span>
            <span className="block">{title}</span>
          </button>
        ))}
      </nav>
    </>
  )
}
