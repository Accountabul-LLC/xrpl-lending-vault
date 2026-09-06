import { useLayoutEffect, useState } from 'react'
import { DESIGN_H, DESIGN_W } from './chapters'

export type CameraFit = { x: number; y: number; scale: number }

const PAD = 0.12

export function fitSceneToCamera(
  world: HTMLElement,
  target: Element | null,
  reducedMotion: boolean
): CameraFit {
  const wr = world.getBoundingClientRect()
  if (wr.width < 8) return { x: 24, y: 24, scale: 0.95 }
  const sx = world.offsetWidth / wr.width
  const sy = world.offsetHeight / wr.height
  const source = target ?? world
  const er = source.getBoundingClientRect()
  const rect = {
    x: (er.left - wr.left) * sx,
    y: (er.top - wr.top) * sy,
    w: Math.max(er.width * sx, 160),
    h: Math.max(er.height * sy, 100)
  }
  const usableW = DESIGN_W * (1 - PAD * 2)
  const usableH = DESIGN_H * (1 - PAD * 2)
  const scale = Math.min(usableW / rect.w, usableH / rect.h, reducedMotion ? 1.05 : 1.35)
  const cx = rect.x + rect.w / 2
  const cy = rect.y + rect.h / 2
  return {
    x: DESIGN_W / 2 - cx * scale,
    y: DESIGN_H / 2 - cy * scale,
    scale
  }
}

export function useViewportFit(el: { current: HTMLElement | null }) {
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const node = el.current
    if (!node) return
    const update = () => {
      const w = node.clientWidth
      const h = node.clientHeight
      if (w < 2 || h < 2) return
      setScale(Math.min(w / DESIGN_W, h / DESIGN_H))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(node)
    return () => ro.disconnect()
  }, [el])
  return scale
}
