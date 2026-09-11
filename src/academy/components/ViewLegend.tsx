export function ViewLegend() {
  const items = [
    { gesture: 'Drag', action: 'Orbit' },
    { gesture: 'Scroll', action: 'Zoom' },
    { gesture: 'Right-drag', action: 'Pan' }
  ] as const

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 min-w-0">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <div className="text-[10px] uppercase tracking-wide text-slate-500">View</div>
        {items.map((item) => (
          <div key={item.gesture} className="flex items-center gap-1.5 text-[11px] leading-tight">
            <span className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 font-medium text-slate-200">
              {item.gesture}
            </span>
            <span className="text-slate-400">{item.action}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
