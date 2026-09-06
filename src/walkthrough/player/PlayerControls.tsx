import { type MouseEvent as ReactMouseEvent, type ReactNode, type TouchEvent } from 'react'
import { CHAPTERS, formatPlayerTime, RATES } from './chapters'
import type { AcademyPlayerController, PlayerSnapshot } from './playerController'

function IconBtn({
  label,
  onClick,
  children,
  className = '',
  pressed,
  expanded
}: {
  label: string
  onClick: () => void
  children: ReactNode
  className?: string
  pressed?: boolean
  expanded?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      aria-expanded={expanded}
      title={label}
      onClick={onClick}
      className={
        'inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-100 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 ' +
        className
      }
    >
      {children}
    </button>
  )
}

export function PlayerControls({
  player,
  snap,
  chaptersOpen,
  onToggleChapters,
  moreOpen,
  onToggleMore,
  compact,
  fullscreen
}: {
  player: AcademyPlayerController
  snap: PlayerSnapshot
  chaptersOpen: boolean
  onToggleChapters: () => void
  moreOpen: boolean
  onToggleMore: () => void
  compact: boolean
  fullscreen: boolean
}) {
  const duration = snap.duration || 0
  const pct = duration > 0 ? (snap.currentTime / duration) * 100 : 0

  function onScrub(e: ReactMouseEvent<HTMLDivElement> | TouchEvent<HTMLDivElement>) {
    const bar = e.currentTarget
    const point = 'touches' in e ? e.touches[0] : e
    const r = bar.getBoundingClientRect()
    const x = Math.min(1, Math.max(0, (point.clientX - r.left) / r.width))
    player.seek(x * duration)
  }

  return (
    <div className="academy-controls">
      <div
        className="academy-timeline"
        role="slider"
        aria-label="Walkthrough timeline"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(snap.currentTime)}
        aria-valuetext={`${formatPlayerTime(snap.currentTime)} of ${formatPlayerTime(duration)}`}
        tabIndex={0}
        onClick={onScrub}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') {
            e.preventDefault()
            player.skip(-5)
          }
          if (e.key === 'ArrowRight') {
            e.preventDefault()
            player.skip(5)
          }
        }}
        onMouseDown={(e) => {
          const bar = e.currentTarget
          onScrub(e)
          const move = (ev: globalThis.MouseEvent) => {
            const r = bar.getBoundingClientRect()
            const x = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width))
            player.seek(x * duration)
          }
          const up = () => {
            window.removeEventListener('mousemove', move)
            window.removeEventListener('mouseup', up)
          }
          window.addEventListener('mousemove', move)
          window.addEventListener('mouseup', up)
        }}
      >
        <div className="academy-timeline-track">
          <div className="academy-timeline-fill" style={{ width: `${pct}%` }} />
          <div className="academy-timeline-thumb" style={{ left: `${pct}%` }} />
        </div>
        {CHAPTERS.map((ch) => {
          const start = player.chapterStart(ch.n)
          if (start == null || duration <= 0) return null
          const left = (start / duration) * 100
          return (
            <button
              key={ch.n}
              type="button"
              className="academy-marker"
              style={{ left: `${left}%` }}
              aria-label={`Step ${ch.n}: ${ch.title}`}
              title={`Step ${ch.n}: ${ch.title}`}
              onClick={(e) => {
                e.stopPropagation()
                player.jumpChapter(ch.n)
              }}
            >
              <span>{ch.n}</span>
            </button>
          )
        })}
      </div>

      <div className="academy-controls-row">
        <IconBtn
          label={snap.playing ? 'Pause walkthrough' : 'Play walkthrough'}
          onClick={() => player.toggle()}
        >
          {snap.playing ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M7 5h4v14H7V5zm6 0h4v14h-4V5z" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M8 5v14l11-7L8 5z" />
            </svg>
          )}
        </IconBtn>
        {!compact && (
          <IconBtn label="Restart lesson" onClick={() => player.restart()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" />
            </svg>
          </IconBtn>
        )}
        {!compact && (
          <>
            <IconBtn label="Previous step" onClick={() => player.prevChapter()}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M11 12 20 6v12l-9-6zm-7 6V6h2v12H4z" />
              </svg>
            </IconBtn>
            <IconBtn label="Next step" onClick={() => player.nextChapter()}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M4 6v12l9-6-9-6zm14 0h2v12h-2V6z" />
              </svg>
            </IconBtn>
          </>
        )}

        <IconBtn
          label={snap.muted ? 'Unmute narration' : 'Mute narration'}
          onClick={() => player.toggleMute()}
        >
          {snap.muted || snap.volume === 0 ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M5 10v4h3l4 3V7L8 10H5zm12.5 6.5-1.4-1.4L18.2 13l-2.1-2.1 1.4-1.4L19.6 11.6l2.1-2.1 1.4 1.4-2.1 2.1 2.1 2.1-1.4 1.4-2.1-2.1-2.1 2.1z" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M5 10v4h3l4 3V7L8 10H5zm11.5 2a3.5 3.5 0 0 0-1.8-3.1v6.2A3.5 3.5 0 0 0 16.5 12zM14 6.1v1.7A6 6 0 0 1 18.5 12 6 6 0 0 1 14 16.2v1.7A7.7 7.7 0 0 0 20.2 12 7.7 7.7 0 0 0 14 6.1z" />
            </svg>
          )}
        </IconBtn>
        {!compact && (
          <label className="academy-volume">
            <span className="sr-only">Volume</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round((snap.muted ? 0 : snap.volume) * 100)}
              onChange={(e) => player.setVolume(Number(e.target.value) / 100)}
              aria-label="Volume"
            />
          </label>
        )}

        <span className="academy-time" aria-live="off">
          {formatPlayerTime(snap.currentTime)} / {formatPlayerTime(duration)}
        </span>

        <div className="ml-auto flex items-center gap-1">
          {!compact && (
            <IconBtn
              label={snap.captionsEnabled ? 'Hide captions' : 'Show captions'}
              pressed={snap.captionsEnabled}
              onClick={() => player.setCaptions(!snap.captionsEnabled)}
              className={snap.captionsEnabled ? 'bg-white/15' : ''}
            >
              <span className="text-[11px] font-bold" aria-hidden>
                CC
              </span>
            </IconBtn>
          )}
          {!compact && (
            <label className="academy-speed">
              <span className="sr-only">Playback speed</span>
              <select
                aria-label="Playback speed"
                value={String(snap.playbackRate)}
                onChange={(e) => player.setRate(Number(e.target.value))}
              >
                {RATES.map((r) => (
                  <option key={r} value={r}>
                    {r}×
                  </option>
                ))}
              </select>
            </label>
          )}
          <IconBtn
            label="Chapters"
            expanded={chaptersOpen}
            onClick={onToggleChapters}
            className={chaptersOpen ? 'bg-white/15' : ''}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M4 6h16v2H4V6zm0 5h10v2H4v-2zm0 5h16v2H4v-2z" />
            </svg>
          </IconBtn>
          {compact && (
            <IconBtn label="More controls" onClick={onToggleMore} className={moreOpen ? 'bg-white/15' : ''}>
              <span aria-hidden>•••</span>
            </IconBtn>
          )}
          <IconBtn
            label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            onClick={() => {
              const root = document.querySelector('.academy-player')
              if (!root) return
              if (document.fullscreenElement) void document.exitFullscreen()
              else void (root as HTMLElement).requestFullscreen()
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
            </svg>
          </IconBtn>
        </div>
      </div>
      {compact && moreOpen && (
        <div className="academy-more">
          <IconBtn label="Restart lesson" onClick={() => player.restart()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" />
            </svg>
          </IconBtn>
          <IconBtn label="Previous step" onClick={() => player.prevChapter()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M11 12 20 6v12l-9-6zm-7 6V6h2v12H4z" />
            </svg>
          </IconBtn>
          <IconBtn label="Next step" onClick={() => player.nextChapter()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M4 6v12l9-6-9-6zm14 0h2v12h-2V6z" />
            </svg>
          </IconBtn>
          <IconBtn
            label={snap.captionsEnabled ? 'Hide captions' : 'Show captions'}
            pressed={snap.captionsEnabled}
            onClick={() => player.setCaptions(!snap.captionsEnabled)}
            className={snap.captionsEnabled ? 'bg-white/15' : ''}
          >
            <span className="text-[11px] font-bold" aria-hidden>
              CC
            </span>
          </IconBtn>
          <label className="academy-volume">
            <span className="text-[11px] text-slate-400">Volume</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round((snap.muted ? 0 : snap.volume) * 100)}
              onChange={(e) => player.setVolume(Number(e.target.value) / 100)}
              aria-label="Volume"
            />
          </label>
          <label className="academy-speed">
            <span className="sr-only">Playback speed</span>
            <select
              aria-label="Playback speed"
              value={String(snap.playbackRate)}
              onChange={(e) => player.setRate(Number(e.target.value))}
            >
              {RATES.map((r) => (
                <option key={r} value={r}>
                  {r}×
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
    </div>
  )
}
