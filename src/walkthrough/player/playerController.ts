import { CHAPTERS } from './chapters'

export type PlayerMode = 'watch' | 'interactive'

export type TimelineRow = {
  id: string
  startMs: number
  durationMs: number
  caption: string
}

export type TimelineDoc = {
  totalMs: number
  scenes: TimelineRow[]
}

export type PlayerSnapshot = {
  playing: boolean
  muted: boolean
  volume: number
  currentTime: number
  duration: number
  playbackRate: number
  captionsEnabled: boolean
  currentChapter: number
  currentSceneId: string
  ready: boolean
  complete: boolean
  mode: PlayerMode
  interactiveHold: boolean
  resumeAvailable: { time: number; chapter: number } | null
}

const PREFS_KEY = 'jrpu-academy-player-prefs'
const PROGRESS_KEY = 'jrpu-academy-player-progress'

type Prefs = {
  volume: number
  muted: boolean
  playbackRate: number
  captionsEnabled: boolean
  mode: PlayerMode
}

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) throw new Error('none')
    const p = JSON.parse(raw)
    return {
      volume: clamp(Number(p.volume) || 1, 0, 1),
      muted: Boolean(p.muted),
      playbackRate: [0.75, 1, 1.25, 1.5, 2].includes(Number(p.playbackRate))
        ? Number(p.playbackRate)
        : 1,
      captionsEnabled: p.captionsEnabled !== false,
      mode: p.mode === 'interactive' ? 'interactive' : 'watch'
    }
  } catch {
    return {
      volume: 1,
      muted: false,
      playbackRate: 1,
      captionsEnabled: true,
      mode: 'watch'
    }
  }
}

function clamp(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n))
}

function emptySnap(prefs: Prefs): PlayerSnapshot {
  return {
    playing: false,
    muted: prefs.muted,
    volume: prefs.volume,
    currentTime: 0,
    duration: 0,
    playbackRate: prefs.playbackRate,
    captionsEnabled: prefs.captionsEnabled,
    currentChapter: 0,
    currentSceneId: 'opening',
    ready: false,
    complete: false,
    mode: prefs.mode,
    interactiveHold: false,
    resumeAvailable: null
  }
}

export class AcademyPlayerController {
  readonly audio: HTMLAudioElement
  timeline: TimelineDoc | null = null
  private listeners = new Set<() => void>()
  private prefs: Prefs
  private snap: PlayerSnapshot
  private clearedGates = new Set<number>()
  private lastEmittedTime = -1
  private progressTimer: number | null = null
  private errorGate = false

  constructor() {
    this.prefs = loadPrefs()
    this.snap = emptySnap(this.prefs)
    this.audio = new Audio('/walkthrough/narration.mp3')
    this.audio.preload = 'auto'
    this.audio.setAttribute('playsinline', 'true')
    this.audio.volume = this.prefs.volume
    this.audio.muted = this.prefs.muted
    this.audio.playbackRate = this.prefs.playbackRate

    this.audio.addEventListener('loadedmetadata', () => this.markReady())
    this.audio.addEventListener('canplaythrough', () => this.markReady())
    this.audio.addEventListener('play', () => this.set({ playing: true, complete: false }))
    this.audio.addEventListener('pause', () => {
      if (!this.audio.ended) this.set({ playing: false })
    })
    this.audio.addEventListener('ended', () => {
      this.set({ playing: false, complete: true, currentTime: this.audio.duration || this.snap.duration })
      localStorage.removeItem(PROGRESS_KEY)
    })
    this.audio.addEventListener('timeupdate', () => this.onTime())
    this.audio.addEventListener('volumechange', () => {
      this.set({ volume: this.audio.volume, muted: this.audio.muted })
      this.savePrefs()
    })
    this.audio.addEventListener('ratechange', () => {
      this.set({ playbackRate: this.audio.playbackRate || 1 })
      this.savePrefs()
    })

    try {
      const raw = localStorage.getItem(PROGRESS_KEY)
      if (raw) {
        const p = JSON.parse(raw)
        if (typeof p.time === 'number' && p.time > 8 && p.time < 600) {
          this.snap = {
            ...this.snap,
            resumeAvailable: { time: p.time, chapter: p.chapter ?? 1 }
          }
        }
      }
    } catch {
      /* ignore */
    }
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  getSnapshot = () => this.snap

  async loadTimeline() {
    if (this.timeline) return this.timeline
    try {
      const res = await fetch('/walkthrough/timeline.json')
      this.timeline = (await res.json()) as TimelineDoc
    } catch {
      this.timeline = { totalMs: 612624, scenes: [] }
    }
    const duration = (this.timeline.totalMs || 0) / 1000
    this.set({ duration })
    return this.timeline
  }

  play() {
    if (this.snap.interactiveHold) {
      this.clearedGates.add(this.snap.currentChapter)
      if (this.snap.currentSceneId === 'error') this.errorGate = true
      this.set({ interactiveHold: false })
    }
    const resume = this.snap.resumeAvailable
    if (resume) {
      this.audio.currentTime = resume.time
      this.set({ resumeAvailable: null })
      this.applyTime(resume.time, true)
    }
    void this.audio.play().catch(() => undefined)
  }

  pause() {
    this.audio.pause()
  }

  toggle() {
    if (this.audio.paused) this.play()
    else this.pause()
  }

  restart() {
    this.clearedGates.clear()
    this.errorGate = false
    this.seek(0)
    this.set({ complete: false, interactiveHold: false, resumeAvailable: null })
    localStorage.removeItem(PROGRESS_KEY)
    this.play()
  }

  seek(seconds: number) {
    const d = this.audio.duration || this.snap.duration
    const t = clamp(seconds, 0, Math.max(0, d - 0.05))
    this.audio.currentTime = t
    this.applyTime(t, true)
  }

  skip(delta: number) {
    this.seek((this.audio.currentTime || 0) + delta)
  }

  setVolume(v: number) {
    this.audio.volume = clamp(v, 0, 1)
    if (this.audio.volume > 0 && this.audio.muted) this.audio.muted = false
  }

  setMuted(muted: boolean) {
    this.audio.muted = muted
  }

  toggleMute() {
    this.audio.muted = !this.audio.muted
  }

  setRate(rate: number) {
    this.audio.playbackRate = rate
  }

  setCaptions(on: boolean) {
    this.set({ captionsEnabled: on })
    this.savePrefs()
  }

  setMode(mode: PlayerMode) {
    this.set({ mode, interactiveHold: false })
    this.savePrefs()
  }

  jumpChapter(n: number) {
    const t = this.chapterStart(n)
    if (t == null) return
    if (this.snap.mode === 'interactive' && !this.clearedGates.has(n) && n >= 1) {
      this.seek(t)
      this.pause()
      this.set({ interactiveHold: true, currentChapter: n })
      return
    }
    this.seek(t)
  }

  prevChapter() {
    const n = this.snap.currentChapter
    this.jumpChapter(n <= 1 ? 1 : n - 1)
  }

  nextChapter() {
    this.jumpChapter(Math.min(8, this.snap.currentChapter + 1 || 1))
  }

  clearHold() {
    this.clearedGates.add(this.snap.currentChapter)
    this.set({ interactiveHold: false })
    this.play()
  }

  sceneStart(id: string) {
    const row = this.timeline?.scenes.find((s) => s.id === id)
    return row ? row.startMs / 1000 : null
  }

  retryError() {
    this.errorGate = true
    this.set({ interactiveHold: false })
    const t = this.sceneStart('error') ?? this.audio.currentTime
    this.seek(t)
    this.play()
  }

  continuePastError() {
    this.errorGate = true
    const scenes = this.timeline?.scenes ?? []
    const idx = scenes.findIndex((s) => s.id === 'error')
    const next = idx >= 0 ? scenes[idx + 1] : null
    this.set({ interactiveHold: false })
    this.seek(next ? next.startMs / 1000 : this.audio.currentTime + 0.5)
    this.play()
  }

  resumeSaved() {
    const r = this.snap.resumeAvailable
    this.set({ resumeAvailable: null })
    if (!r) {
      this.play()
      return
    }
    this.seek(r.time)
    this.play()
  }

  dismissResume() {
    this.set({ resumeAvailable: null })
    this.restart()
  }

  chapterStart(n: number) {
    const ch = CHAPTERS.find((c) => c.n === n)
    if (!ch || !this.timeline) return n === 1 ? 0 : null
    const row = this.timeline.scenes.find((s) => s.id === ch.sceneId)
    return row ? row.startMs / 1000 : null
  }

  sceneAt(seconds: number) {
    const scenes = this.timeline?.scenes ?? []
    if (!scenes.length) return 'opening'
    let id = scenes[0].id
    const ms = seconds * 1000
    for (const row of scenes) {
      if (ms >= row.startMs) id = row.id
    }
    return id
  }

  private markReady() {
    const duration = this.audio.duration && isFinite(this.audio.duration) ? this.audio.duration : this.snap.duration
    this.set({ ready: true, duration })
  }

  private onTime() {
    this.applyTime(this.audio.currentTime || 0, false)
  }

  private applyTime(seconds: number, force: boolean) {
    const rounded = Math.round(seconds * 4) / 4
    if (!force && Math.abs(rounded - this.lastEmittedTime) < 0.2 && this.snap.playing) {
      this.maybeHold(seconds)
      return
    }
    this.lastEmittedTime = rounded
    const sceneId = this.sceneAt(seconds)
    const chapter = chapterFromScene(sceneId)
    this.maybeHold(seconds)
    this.maybePauseError(sceneId)
    this.set({
      currentTime: seconds,
      currentSceneId: sceneId,
      currentChapter: chapter,
      duration: this.audio.duration && isFinite(this.audio.duration) ? this.audio.duration : this.snap.duration
    })
    if (this.progressTimer) window.clearTimeout(this.progressTimer)
    this.progressTimer = window.setTimeout(() => {
      if (seconds > 5 && !this.audio.ended) {
        localStorage.setItem(
          PROGRESS_KEY,
          JSON.stringify({ time: seconds, chapter: chapterFromScene(this.sceneAt(seconds)) })
        )
      }
    }, 1200)
  }

  private maybeHold(seconds: number) {
    if (this.snap.mode !== 'interactive' || this.snap.interactiveHold) return
    const chapter = chapterFromScene(this.sceneAt(seconds))
    if (chapter < 1 || this.clearedGates.has(chapter)) return
    const start = this.chapterStart(chapter)
    if (start == null) return
    if (seconds >= start && seconds < start + 0.6 && this.snap.playing) {
      this.audio.pause()
      this.set({ interactiveHold: true, playing: false, currentChapter: chapter })
    }
  }

  private maybePauseError(sceneId: string) {
    if (this.snap.mode !== 'interactive' || this.errorGate || sceneId !== 'error') return
    if (this.snap.interactiveHold) return
    this.audio.pause()
    this.set({ interactiveHold: true, playing: false, currentSceneId: 'error' })
  }

  private savePrefs() {
    this.prefs = {
      volume: this.audio.volume,
      muted: this.audio.muted,
      playbackRate: this.audio.playbackRate || 1,
      captionsEnabled: this.snap.captionsEnabled,
      mode: this.snap.mode
    }
    localStorage.setItem(PREFS_KEY, JSON.stringify(this.prefs))
  }

  private set(partial: Partial<PlayerSnapshot>) {
    this.snap = { ...this.snap, ...partial }
    this.listeners.forEach((fn) => fn())
  }
}

function chapterFromScene(id: string) {
  if (id === 'opening' || id === 'recap') return id === 'recap' ? 8 : 0
  const found = CHAPTERS.find((c) => id.startsWith(`step${c.n}`) || id === c.sceneId)
  if (found) return found.n
  if (id === 'reset') return 1
  if (id === 'error') return 7
  if (id === 'order') return 8
  return 0
}

let singleton: AcademyPlayerController | null = null

export function getAcademyPlayer() {
  if (!singleton) singleton = new AcademyPlayerController()
  return singleton
}
