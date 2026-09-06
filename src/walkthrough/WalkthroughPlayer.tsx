import { useEffect, useMemo, useRef, useState } from 'react'
import { LabWorkbench } from '../lab/LabWorkbench'
import type { LabViewHandlers } from '../lab/types'
import scenesDoc from './scenes.json'
import { applySceneChrome, CAMERAS, SNAPSHOTS, type CameraName } from './demoState'
import { WalkthroughDiagram } from './diagrams'
import { CaptionBar, Cursor, MoneyFlow, ProgressHud } from './overlays'

type Scene = (typeof scenesDoc.scenes)[number]
type Timeline = {
  totalMs: number
  scenes: { id: string; startMs: number; durationMs: number }[]
}

const NOOP_HANDLERS: LabViewHandlers = {
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

function sceneAt(tMs: number, timeline: Timeline | null): Scene {
  const scenes = scenesDoc.scenes
  if (!timeline) return scenes[0]
  let current = scenes[0]
  for (const row of timeline.scenes) {
    if (tMs >= row.startMs) {
      current = scenes.find((s) => s.id === row.id) ?? current
    }
  }
  return current
}

export default function WalkthroughPlayer({
  record = false,
  onExit
}: {
  record?: boolean
  onExit?: () => void
}) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const seekMs = useMemo(() => {
    const n = Number(new URLSearchParams(window.location.search).get('seek') || 0)
    return Number.isFinite(n) ? n * 1000 : 0
  }, [])
  const [timeline, setTimeline] = useState<Timeline | null>(null)
  const [currentMs, setCurrentMs] = useState(seekMs)
  const [playing, setPlaying] = useState(false)
  const [ready, setReady] = useState(false)
  const [complete, setComplete] = useState(false)
  const [cursor, setCursor] = useState({ x: 960, y: 540, visible: false })

  const totalMs = timeline?.totalMs ?? 0
  const scene = useMemo(() => sceneAt(currentMs, timeline), [currentMs, timeline])
  const snapshot = SNAPSHOTS[scene.snapshot] ?? SNAPSHOTS.empty
  const labState = applySceneChrome(snapshot, {
    highlight: scene.highlight,
    pressed: scene.pressed,
    txPhase: (scene.txPhase as any) ?? snapshot.txPhase
  })
  const camera = CAMERAS[(scene.camera as CameraName) ?? 'overview']

  useEffect(() => {
    fetch('/walkthrough/timeline.json')
      .then((r) => r.json())
      .then(setTimeline)
      .catch(() =>
        setTimeline({
          totalMs: scenesDoc.scenes.length * 20_000,
          scenes: scenesDoc.scenes.map((s, i) => ({
            id: s.id,
            startMs: i * 20_000,
            durationMs: 20_000
          }))
        })
      )
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => setCurrentMs(audio.currentTime * 1000)
    const onReady = () => setReady(true)
    const onEnded = () => {
      setPlaying(false)
      setComplete(true)
    }
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('canplaythrough', onReady)
    audio.addEventListener('loadeddata', onReady)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('play', () => setPlaying(true))
    audio.addEventListener('pause', () => {
      if (!audio.ended) setPlaying(false)
    })
    const applySeek = () => {
      if (seekMs > 0) {
        audio.currentTime = seekMs / 1000
        setCurrentMs(seekMs)
      }
    }
    audio.addEventListener('loadeddata', applySeek)
    audio.load()
    const fallback = window.setTimeout(() => setReady(true), 3000)
    return () => {
      window.clearTimeout(fallback)
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('canplaythrough', onReady)
      audio.removeEventListener('loadeddata', onReady)
      audio.removeEventListener('loadeddata', applySeek)
      audio.removeEventListener('ended', onEnded)
    }
  }, [seekMs])

  useEffect(() => {
    if (!record || !ready || !timeline || seekMs > 0) return
    const audio = audioRef.current
    const started = performance.now()
    let raf = 0
    let stopped = false

    const tick = () => {
      if (stopped) return
      const elapsed = performance.now() - started
      if (audio && !audio.paused && !Number.isNaN(audio.currentTime) && audio.currentTime > 0.05) {
        setCurrentMs(audio.currentTime * 1000)
      } else {
        setCurrentMs(elapsed)
      }
      if (elapsed >= timeline.totalMs + 1200) {
        setPlaying(false)
        setComplete(true)
        return
      }
      raf = requestAnimationFrame(tick)
    }

    void audio?.play().catch(() => undefined)
    raf = requestAnimationFrame(tick)
    return () => {
      stopped = true
      cancelAnimationFrame(raf)
    }
  }, [record, ready, timeline, seekMs])

  useEffect(() => {
    if (record || !ready || seekMs > 0) return
    void audioRef.current?.play().catch(() => undefined)
  }, [record, ready, seekMs])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const target = scene.cursor
      ? stage.querySelector(`[data-lab="${scene.cursor}"]`)
      : null
    if (!target) {
      setCursor((c) => ({ ...c, visible: false }))
      return
    }
    const sr = stage.getBoundingClientRect()
    const r = target.getBoundingClientRect()
    setCursor({
      x: r.left - sr.left + r.width / 2,
      y: r.top - sr.top + r.height / 2,
      visible: true
    })
  }, [scene, currentMs])

  function toggle() {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) void audio.play()
    else audio.pause()
  }

  return (
    <div
      className={record ? 'walkthrough-record' : 'walkthrough-shell'}
      data-walkthrough-complete={complete ? 'true' : 'false'}
      data-walkthrough-ready={ready ? 'true' : 'false'}
    >
      <audio
        ref={audioRef}
        src="/walkthrough/narration.mp3"
        preload="auto"
        playsInline
      />

      {!record && (
        <div className="walkthrough-controls">
          <button type="button" onClick={toggle} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-sm">
            {playing ? 'Pause narration' : ready ? 'Play walkthrough with voice' : 'Loading narration…'}
          </button>
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-sm"
            >
              Back to Lab
            </button>
          )}
          <span className="text-xs text-slate-400 self-center">
            {playing ? 'Voice narration is on' : 'This walkthrough has a spoken voiceover — press play to hear it.'}
          </span>
        </div>
      )}

      <div ref={stageRef} className="walkthrough-stage">
        <ProgressHud currentMs={currentMs} totalMs={totalMs} step={scene.step} />

        <div
          className="walkthrough-lab"
          style={{
            transform: `translate(${camera.x}px, ${-camera.y}px) scale(${camera.scale})`
          }}
        >
          <LabWorkbench state={labState} handlers={NOOP_HANDLERS} compact />
        </div>

        <WalkthroughDiagram kind={scene.diagram} />
        <MoneyFlow kind={scene.flow} />
        <Cursor x={cursor.x} y={cursor.y} visible={cursor.visible} />
        <CaptionBar text={scene.caption} />
      </div>
    </div>
  )
}
