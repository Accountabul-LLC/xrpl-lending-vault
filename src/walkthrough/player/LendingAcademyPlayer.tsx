import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { LabWorkbench } from '../../lab/LabWorkbench'
import type { LabViewHandlers } from '../../lab/types'
import scenesDoc from '../scenes.json'
import { applySceneChrome, SNAPSHOTS } from '../demoState'
import { WalkthroughDiagram } from '../diagrams'
import { CaptionBar, Cursor, MoneyFlow } from '../overlays'
import { CHAPTERS, DESIGN_H, DESIGN_W } from './chapters'
import { getAcademyPlayer } from './playerController'
import { fitSceneToCamera, useViewportFit } from './fitCamera'
import { PlayerControls } from './PlayerControls'

const NOOP: LabViewHandlers = {
  onFundRole: () => undefined,
  onFundAll: () => undefined,
  onReset: () => undefined,
  onCreateVault: () => undefined,
  onRefreshVault: () => undefined,
  onDeposit: () => undefined,
  onWithdraw: () => undefined,
  onCreateLoanBook: () => undefined,
  onDepositCover: () => undefined,
  onWithdrawCover: () => undefined,
  onCreateLoan: () => undefined,
  onPayLoan: () => undefined,
  onPayFull: () => undefined,
  onToggleTechnical: () => undefined,
  onAssetsMaximum: () => undefined,
  onDepositAmount: () => undefined,
  onWithdrawAmount: () => undefined,
  onCoverAmount: () => undefined,
  onCoverWithdrawAmount: () => undefined,
  onPrincipal: () => undefined,
  onAprPercent: () => undefined,
  onPaymentTotal: () => undefined,
  onPaymentAmount: () => undefined
}

type Scene = (typeof scenesDoc.scenes)[number]

function sceneById(id: string): Scene {
  return scenesDoc.scenes.find((s) => s.id === id) ?? scenesDoc.scenes[0]
}

export default function LendingAcademyPlayer({
  record = false,
  onExit
}: {
  record?: boolean
  onExit?: () => void
}) {
  const player = getAcademyPlayer()
  const snap = useSyncExternalStore(player.subscribe, player.getSnapshot, player.getSnapshot)
  const viewportRef = useRef<HTMLDivElement>(null)
  const worldRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<HTMLDivElement>(null)
  const fitScale = useViewportFit(viewportRef)
  const [cam, setCam] = useState({ x: 0, y: 0, scale: 0.92 })
  const [cursor, setCursor] = useState({ x: 800, y: 450, visible: false })
  const [chaptersOpen, setChaptersOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [showChrome, setShowChrome] = useState(true)
  const [compact, setCompact] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const hideTimer = useRef<number | null>(null)
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  const scene = sceneById(snap.currentSceneId)
  const snapshot = SNAPSHOTS[scene.snapshot] ?? SNAPSHOTS.empty
  const labState = applySceneChrome(snapshot, {
    highlight: scene.highlight,
    pressed: scene.pressed,
    txPhase: (scene.txPhase as any) ?? snapshot.txPhase
  })
  const chapter = CHAPTERS.find((c) => c.n === snap.currentChapter) ?? CHAPTERS[0]
  const interactiveAction = snap.mode === 'interactive' ? chapter : null

  useEffect(() => {
    if (record) player.setMode('watch')
    void player.loadTimeline()
    return () => {
      if (!record) player.pause()
    }
  }, [player, record])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReducedMotion(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (record && snap.ready && !snap.playing && !snap.complete) player.play()
  }, [record, snap.ready, snap.playing, snap.complete, player])

  useLayoutEffect(() => {
    const world = worldRef.current
    if (!world) return
    const letterbox = scene.diagram === 'title' || scene.diagram === 'recap'
    if (letterbox) {
      setCam({ x: 0, y: 0, scale: 1 })
      return
    }
    const target = scene.highlight
      ? world.querySelector(`[data-lab="${scene.highlight}"]`)
      : world.querySelector('[data-lab="workbench"]')
    setCam(fitSceneToCamera(world, target, reducedMotion))
  }, [scene.highlight, scene.diagram, scene.id, snap.currentSceneId, reducedMotion, labState.vaultId, labState.error])

  useLayoutEffect(() => {
    const world = worldRef.current
    const viewport = viewportRef.current
    if (!world || !viewport || !scene.cursor) {
      setCursor((c) => ({ ...c, visible: false }))
      return
    }
    const el = world.querySelector(`[data-lab="${scene.cursor}"]`)
    if (!el) {
      setCursor((c) => ({ ...c, visible: false }))
      return
    }
    const vr = viewport.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    setCursor({
      x: r.left - vr.left + r.width / 2,
      y: r.top - vr.top + r.height / 2,
      visible: true
    })
  }, [scene.cursor, scene.id, cam, fitScale])

  useEffect(() => {
    const node = playerRef.current
    if (!node) return
    const ro = new ResizeObserver(() => setCompact(node.clientWidth < 720))
    ro.observe(node)
    setCompact(node.clientWidth < 720)
    return () => ro.disconnect()
  }, [])

  function bumpChrome() {
    setShowChrome(true)
    if (hideTimer.current) window.clearTimeout(hideTimer.current)
    if (snap.playing && !snap.interactiveHold) {
      hideTimer.current = window.setTimeout(() => setShowChrome(false), 2400)
    }
  }

  useEffect(() => {
    bumpChrome()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap.playing, snap.interactiveHold])

  useEffect(() => {
    const root = playerRef.current
    if (!root) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable) {
        return
      }
      if (e.key === ' ' || e.code === 'Space') {
        if (t.closest('button, input, select, textarea, a')) return
        e.preventDefault()
        player.toggle()
      } else if (e.key === 'm' || e.key === 'M') {
        player.toggleMute()
      } else if (e.key === 'ArrowLeft') {
        player.skip(-5)
      } else if (e.key === 'ArrowRight') {
        player.skip(5)
      } else if (e.key === 'f' || e.key === 'F') {
        if (document.fullscreenElement) void document.exitFullscreen()
        else void root.requestFullscreen()
      }
    }
    const onFs = () => setFullscreen(document.fullscreenElement === root)
    root.addEventListener('keydown', onKey)
    document.addEventListener('fullscreenchange', onFs)
    return () => {
      root.removeEventListener('keydown', onKey)
      document.removeEventListener('fullscreenchange', onFs)
    }
  }, [player])

  const chromeVisible = !record && (showChrome || !snap.playing || snap.interactiveHold)
  const showError = scene.id === 'error' && Boolean(labState.error) && snap.mode === 'interactive'

  const handlers = useMemo(() => {
    if (snap.mode !== 'interactive') return NOOP
    return {
      ...NOOP,
      onFundAll: () => player.clearHold(),
      onCreateVault: () => player.clearHold(),
      onDeposit: () => player.clearHold(),
      onCreateLoanBook: () => player.clearHold(),
      onCreateLoan: () => player.clearHold(),
      onPayLoan: () => player.clearHold(),
      onWithdraw: () => player.clearHold(),
      onToggleTechnical: () => player.clearHold()
    }
  }, [snap.mode, player])

  return (
    <div
      className={record ? 'academy-record' : 'academy-page'}
      data-walkthrough-complete={snap.complete ? 'true' : 'false'}
      data-walkthrough-ready={snap.ready ? 'true' : 'false'}
    >
      {!record && (
        <header className="academy-page-head">
          <div>
            <h1 className="text-lg font-semibold">JRPU Live DevNet Lab</h1>
            <p className="text-xs text-slate-400">Learn the XRPL lending lifecycle</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg bg-slate-800 p-0.5 text-xs">
              <button
                type="button"
                className={'rounded-md px-2 py-1 ' + (snap.mode === 'watch' ? 'bg-indigo-600' : '')}
                onClick={() => player.setMode('watch')}
              >
                Watch
              </button>
              <button
                type="button"
                className={'rounded-md px-2 py-1 ' + (snap.mode === 'interactive' ? 'bg-indigo-600' : '')}
                onClick={() => player.setMode('interactive')}
              >
                Interactive
              </button>
            </div>
            {onExit && (
              <button type="button" className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm" onClick={onExit}>
                Back to Lab
              </button>
            )}
          </div>
        </header>
      )}

      <div
        ref={playerRef}
        className={'academy-player' + (reducedMotion ? ' motion-safe-off' : '') + (snap.playing ? '' : ' is-paused')}
        tabIndex={0}
        onMouseMove={bumpChrome}
        onTouchStart={bumpChrome}
        onFocus={bumpChrome}
      >
        <div ref={viewportRef} className="academy-viewport">
          <div
            className="academy-design"
            style={{
              width: DESIGN_W,
              height: DESIGN_H,
              transform: `translate(-50%, -50%) scale(${fitScale})`
            }}
          >
            <div
              className="academy-cam"
              style={{
                transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.scale})`,
                transition: reducedMotion ? 'none' : 'transform 0.85s cubic-bezier(0.22, 1, 0.36, 1)'
              }}
            >
              <div ref={worldRef} className="academy-world">
                <LabWorkbench state={labState} handlers={handlers} compact />
              </div>
            </div>
            <WalkthroughDiagram kind={scene.diagram} />
            <MoneyFlow kind={scene.flow} />
            <div className="academy-hud pointer-events-none">
              <div className="text-[13px] font-semibold tracking-[0.14em] text-indigo-200">
                {scene.step
                  ? `STEP ${scene.step.n} OF ${scene.step.of} — ${scene.step.title.toUpperCase()}`
                  : 'ACCOUNTABUL LENDING PROTOCOL'}
              </div>
              <span className="rounded-full border border-sky-400/40 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-[0.16em] text-sky-300">
                XRPL DEVNET
              </span>
            </div>
            {snap.captionsEnabled && <CaptionBar text={scene.caption} />}
          </div>
          <Cursor x={cursor.x} y={cursor.y} visible={cursor.visible} />
        </div>

        {showError && (
          <div className="academy-error" role="alert">
            <div className="text-xs uppercase tracking-wide text-rose-300">Transaction failed</div>
            <div className="text-lg font-semibold">VaultDeposit</div>
            <div className="font-mono text-rose-100">{labState.error?.code}</div>
            <p className="text-sm text-slate-200">
              <span className="block text-xs uppercase tracking-wide text-rose-200/80">What happened</span>
              {labState.error?.meaning}
            </p>
            <p className="text-sm text-slate-400">
              <span className="block text-xs uppercase tracking-wide text-rose-200/80">How to fix it</span>
              {labState.error?.action}
            </p>
            <div className="mt-3 flex gap-2">
              <button type="button" className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm" onClick={() => player.retryError()}>
                Retry
              </button>
              <button
                type="button"
                className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm"
                onClick={() => player.continuePastError()}
              >
                Continue explanation
              </button>
            </div>
          </div>
        )}

        {snap.interactiveHold && interactiveAction && !showError && (
          <div className="academy-hold">
            <div className="text-xs uppercase tracking-wide text-indigo-300">
              Step {interactiveAction.n}
            </div>
            <div className="text-xl font-semibold">{interactiveAction.title}</div>
            <p className="text-sm text-slate-300">{interactiveAction.happening}</p>
            <button
              type="button"
              className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium"
              onClick={() => player.clearHold()}
            >
              {interactiveAction.actionLabel}
            </button>
          </div>
        )}

        {snap.resumeAvailable && !record && (
          <div className="academy-resume">
            <div className="font-semibold">You stopped at</div>
            <div className="text-sm text-slate-300">
              Step {snap.resumeAvailable.chapter} — {formatChapter(snap.resumeAvailable.chapter)} ·{' '}
              {Math.floor(snap.resumeAvailable.time / 60)}:
              {String(Math.floor(snap.resumeAvailable.time % 60)).padStart(2, '0')}
            </div>
            <div className="mt-3 flex gap-2">
              <button type="button" className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm" onClick={() => player.resumeSaved()}>
                Resume
              </button>
              <button type="button" className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm" onClick={() => player.dismissResume()}>
                Start over
              </button>
            </div>
          </div>
        )}

        {chaptersOpen && (
          <aside className="academy-chapters-flyout" aria-label="Chapters">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Chapters</div>
            {CHAPTERS.map((ch) => {
              const done = snap.currentTime >= (player.chapterStart(ch.n) ?? 0) && snap.currentChapter !== ch.n
              const current = snap.currentChapter === ch.n
              return (
                <button
                  key={ch.n}
                  type="button"
                  className={'academy-chapter-item ' + (current ? 'is-current' : '')}
                  onClick={() => {
                    player.jumpChapter(ch.n)
                    setChaptersOpen(false)
                  }}
                >
                  <span>{current ? '●' : done ? '✓' : '○'}</span>
                  <span>
                    {ch.n}. {ch.title}
                  </span>
                </button>
              )
            })}
          </aside>
        )}

        <div className={'academy-chrome' + (chromeVisible ? ' is-on' : ' is-off')}>
          <PlayerControls
            player={player}
            snap={snap}
            chaptersOpen={chaptersOpen}
            onToggleChapters={() => setChaptersOpen((v) => !v)}
            moreOpen={moreOpen}
            onToggleMore={() => setMoreOpen((v) => !v)}
            compact={compact}
            fullscreen={fullscreen}
          />
        </div>
      </div>

      {!record && (
        <section className="academy-below">
          <aside>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Chapters</h2>
            <ol className="mt-2 space-y-1">
              {CHAPTERS.map((ch) => (
                <li key={ch.n}>
                  <button
                    type="button"
                    className={
                      'w-full rounded-lg px-2 py-1.5 text-left text-sm ' +
                      (snap.currentChapter === ch.n ? 'bg-indigo-600/30 text-indigo-100' : 'text-slate-300 hover:bg-slate-800')
                    }
                    onClick={() => player.jumpChapter(ch.n)}
                  >
                    {ch.n}. {ch.title}
                  </button>
                </li>
              ))}
            </ol>
          </aside>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Current step details</h2>
            <h3 className="mt-2 text-base font-semibold">
              {chapter.n}. {chapter.title}
            </h3>
            <dl className="mt-3 space-y-2 text-sm text-slate-300">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">What is happening</dt>
                <dd>{chapter.happening}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Who is involved</dt>
                <dd>{chapter.who}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Why it matters</dt>
                <dd>{chapter.why}</dd>
              </div>
            </dl>
          </div>
        </section>
      )}
    </div>
  )
}

function formatChapter(n: number) {
  return CHAPTERS.find((c) => c.n === n)?.title ?? 'Lesson'
}
