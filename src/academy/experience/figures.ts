import * as THREE from 'three'
import { COLORS } from '../pipeline/theme'

const SKIN = 0xe8c4a8

function std(color: number, extra: ConstructorParameters<typeof THREE.MeshStandardMaterial>[0] = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.55,
    metalness: 0.12,
    ...extra
  })
}

export function createGround(): THREE.Group {
  const g = new THREE.Group()
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(9.5, 48),
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.95,
      metalness: 0.05
    })
  )
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = false
  g.add(floor)

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(8.6, 9.2, 48),
    new THREE.MeshBasicMaterial({ color: 0x1e293b, transparent: true, opacity: 0.7, side: THREE.DoubleSide })
  )
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.015
  g.add(ring)
  return g
}

export function createPerson(opts: {
  clothing: number
  hold?: 'coins' | 'document' | 'clipboard' | 'none'
}): THREE.Group {
  const g = new THREE.Group()
  g.userData.kind = 'person'

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.34, 20),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false })
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = 0.012
  g.add(shadow)

  const legMat = std(0x1e293b, { roughness: 0.8 })
  const legGeom = new THREE.CylinderGeometry(0.075, 0.09, 0.52, 10)
  const leftLeg = new THREE.Mesh(legGeom, legMat)
  leftLeg.position.set(-0.11, 0.26, 0)
  const rightLeg = new THREE.Mesh(legGeom, legMat)
  rightLeg.position.set(0.11, 0.26, 0)
  g.add(leftLeg, rightLeg)

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.42, 6, 12), std(opts.clothing, { roughness: 0.45 }))
  torso.position.y = 0.9
  torso.name = 'hit'
  g.add(torso)

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.155, 16, 16), std(SKIN, { roughness: 0.7, metalness: 0 }))
  head.position.y = 1.38
  g.add(head)

  const armGeom = new THREE.CapsuleGeometry(0.055, 0.38, 4, 8)
  const armMat = std(opts.clothing, { roughness: 0.5 })
  const leftArm = new THREE.Mesh(armGeom, armMat)
  leftArm.position.set(-0.3, 0.95, 0)
  leftArm.rotation.z = 0.18
  const rightArm = new THREE.Mesh(armGeom, armMat)
  rightArm.position.set(0.3, 0.95, 0)
  rightArm.rotation.z = -0.18
  g.add(leftArm, rightArm)

  const hold = opts.hold ?? 'none'
  if (hold === 'coins') {
    const stack = createCoinStack(0.16, COLORS.depositor)
    stack.position.set(0.38, 0.82, 0.18)
    stack.rotation.x = 0.2
    rightArm.rotation.z = -0.7
    rightArm.rotation.x = -0.35
    g.add(stack)
  } else if (hold === 'document') {
    const doc = createDocument(0.55)
    doc.position.set(0.36, 0.92, 0.16)
    doc.rotation.set(-0.4, 0.3, 0.15)
    rightArm.rotation.z = -0.55
    g.add(doc)
  } else if (hold === 'clipboard') {
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.38, 0.03),
      std(0xcbd5e1, { roughness: 0.4, metalness: 0.2 })
    )
    board.position.set(0.34, 0.95, 0.14)
    board.rotation.set(-0.35, 0.25, 0.1)
    rightArm.rotation.z = -0.5
    g.add(board)
  }

  return g
}

export function createCoin(color = 0xfbbf24, radius = 0.11, thickness = 0.035): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, thickness, 20),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.25,
      metalness: 0.65,
      roughness: 0.25
    })
  )
  mesh.rotation.x = Math.PI / 2
  return mesh
}

export function createCoinStack(radius = 0.14, color = 0xfbbf24): THREE.Group {
  const g = new THREE.Group()
  for (let i = 0; i < 5; i++) {
    const c = createCoin(color, radius, 0.04)
    c.rotation.set(0, 0, 0)
    c.position.y = i * 0.045
    g.add(c)
  }
  return g
}

export function createDocument(scale = 1): THREE.Group {
  const g = new THREE.Group()
  g.scale.setScalar(scale)
  const page = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.54, 0.02),
    std(0xf8fafc, { roughness: 0.85, metalness: 0 })
  )
  g.add(page)
  const lineMat = new THREE.MeshBasicMaterial({ color: 0x64748b })
  for (let i = 0; i < 4; i++) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.025, 0.005), lineMat)
    line.position.set(0, 0.14 - i * 0.09, 0.012)
    g.add(line)
  }
  const seal = new THREE.Mesh(new THREE.CircleGeometry(0.05, 12), new THREE.MeshBasicMaterial({ color: COLORS.borrower }))
  seal.position.set(0.12, -0.18, 0.014)
  g.add(seal)
  return g
}

export function createVault(): THREE.Group {
  const g = new THREE.Group()
  g.userData.kind = 'vault'

  const bodyMat = std(0x334155, { metalness: 0.72, roughness: 0.28 })
  const goldMat = std(COLORS.vault, { metalness: 0.8, roughness: 0.22, emissive: COLORS.vaultEmissive, emissiveIntensity: 0.2 })

  const base = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.16, 1.5), bodyMat)
  base.position.y = 0.08
  g.add(base)

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.55, 1.28), bodyMat)
  body.position.y = 0.93
  body.name = 'hit'
  g.add(body)

  const trim = new THREE.Mesh(new THREE.BoxGeometry(1.78, 1.62, 1.34), goldMat)
  trim.position.y = 0.93
  const trimInner = new THREE.Mesh(
    new THREE.BoxGeometry(1.62, 1.46, 1.22),
    new THREE.MeshBasicMaterial({ color: 0x0b1220 })
  )
  trimInner.position.y = 0.93
  g.add(trim, trimInner)

  const door = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.1, 28), goldMat)
  door.rotation.x = Math.PI / 2
  door.position.set(0, 0.95, 0.68)
  g.add(door)

  const dial = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.035, 8, 24),
    std(0xf8fafc, { metalness: 0.7, roughness: 0.25 })
  )
  dial.position.set(0, 0.95, 0.74)
  g.add(dial)

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.08, 12), std(0xe2e8f0, { metalness: 0.8 }))
  hub.rotation.x = Math.PI / 2
  hub.position.set(0, 0.95, 0.76)
  g.add(hub)

  const fill = new THREE.Mesh(
    new THREE.BoxGeometry(1.15, 1.05, 0.7),
    new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xb45309,
      emissiveIntensity: 0.45,
      metalness: 0.55,
      roughness: 0.35,
      transparent: true,
      opacity: 0.85
    })
  )
  fill.position.set(0, 0.45, 0)
  fill.name = 'fill'
  fill.scale.set(1, 0.08, 1)
  g.add(fill)
  g.userData.fill = fill

  const boltGeom = new THREE.SphereGeometry(0.045, 8, 8)
  const boltMat = std(0x94a3b8, { metalness: 0.8, roughness: 0.2 })
  ;[
    [-0.72, 1.55, 0.62],
    [0.72, 1.55, 0.62],
    [-0.72, 0.32, 0.62],
    [0.72, 0.32, 0.62]
  ].forEach(([x, y, z]) => {
    const b = new THREE.Mesh(boltGeom, boltMat)
    b.position.set(x, y, z)
    g.add(b)
  })

  return g
}

export function createOffice(): THREE.Group {
  const g = new THREE.Group()
  const wall = std(0x312e81, { roughness: 0.6, metalness: 0.15 })
  const building = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.15, 1.1), wall)
  building.position.y = 0.58
  building.name = 'hit'
  g.add(building)

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(1.25, 0.45, 4),
    std(0x1e1b4b, { roughness: 0.5, metalness: 0.2 })
  )
  roof.position.y = 1.38
  roof.rotation.y = Math.PI / 4
  g.add(roof)

  const windowMat = new THREE.MeshBasicMaterial({ color: 0xa5b4fc, transparent: true, opacity: 0.85 })
  for (const x of [-0.38, 0.38]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 0.04), windowMat)
    w.position.set(x, 0.62, 0.56)
    g.add(w)
  }

  const door = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.48, 0.04), std(0x0f172a, { roughness: 0.4 }))
  door.position.set(0, 0.32, 0.56)
  g.add(door)
  return g
}

export function createPathStrip(
  from: [number, number, number],
  to: [number, number, number],
  color: number
): THREE.Mesh {
  const a = new THREE.Vector3(...from)
  const b = new THREE.Vector3(...to)
  const len = a.distanceTo(b)
  const mid = a.clone().lerp(b, 0.5)
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(len, 0.03, 0.22),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.15,
      transparent: true,
      opacity: 0.35,
      roughness: 0.6
    })
  )
  mesh.position.set(mid.x, 0.03, mid.z)
  mesh.lookAt(b.x, 0.03, b.z)
  mesh.rotateY(Math.PI / 2)
  mesh.userData.baseOpacity = 0.35
  return mesh
}

export function createNameSprite(text: string, tint = '#e2e8f0'): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 128
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, 512, 128)
  roundRect(ctx, 16, 24, 480, 80, 18)
  ctx.fillStyle = 'rgba(2, 6, 23, 0.82)'
  ctx.fill()
  ctx.strokeStyle = tint
  ctx.lineWidth = 4
  ctx.stroke()
  ctx.fillStyle = tint
  ctx.font = 'bold 42px ui-sans-serif, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 256, 64)
  const map = new THREE.CanvasTexture(canvas)
  map.colorSpace = THREE.SRGBColorSpace
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map, transparent: true, depthTest: true })
  )
  sprite.scale.set(1.85, 0.46, 1)
  sprite.position.y = 1.85
  sprite.userData.texture = map
  return sprite
}

export function createAmountSprite(text: string, tint = '#fde68a'): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 128
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, 512, 128)
  ctx.fillStyle = tint
  ctx.font = 'bold 54px ui-sans-serif, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 256, 64)
  const map = new THREE.CanvasTexture(canvas)
  map.colorSpace = THREE.SRGBColorSpace
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthTest: false }))
  sprite.scale.set(1.4, 0.35, 1)
  sprite.userData.texture = map
  return sprite
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export function disposeObject3D(root: THREE.Object3D) {
  root.traverse((obj) => {
    const sprite = obj as THREE.Sprite
    if (sprite.isSprite) {
      const tex = sprite.userData.texture as THREE.Texture | undefined
      tex?.dispose()
      ;(sprite.material as THREE.Material).dispose()
    }
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose()
      const m = obj.material
      if (Array.isArray(m)) m.forEach((x) => x.dispose())
      else m.dispose()
    }
  })
}
