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
    new THREE.CircleGeometry(14.5, 64),
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.95,
      metalness: 0.05
    })
  )
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = false
  g.add(floor)

  const outer = new THREE.Mesh(
    new THREE.RingGeometry(13.4, 14.1, 64),
    new THREE.MeshBasicMaterial({ color: 0x1e293b, transparent: true, opacity: 0.75, side: THREE.DoubleSide })
  )
  outer.rotation.x = -Math.PI / 2
  outer.position.y = 0.015
  g.add(outer)

  const deskRing = new THREE.Mesh(
    new THREE.RingGeometry(4.35, 4.55, 64),
    new THREE.MeshBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
  )
  deskRing.rotation.x = -Math.PI / 2
  deskRing.position.y = 0.018
  g.add(deskRing)

  const vaultPad = new THREE.Mesh(
    new THREE.RingGeometry(1.35, 1.72, 48),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.28, side: THREE.DoubleSide })
  )
  vaultPad.rotation.x = -Math.PI / 2
  vaultPad.position.y = 0.02
  g.add(vaultPad)
  return g
}

export function createPerson(opts: {
  clothing: number
  hair?: number
  hold?: 'coins' | 'document' | 'clipboard' | 'none'
  scale?: number
}): THREE.Group {
  const g = new THREE.Group()
  g.userData.kind = 'person'
  g.scale.setScalar(opts.scale ?? 1.32)

  const skin = std(SKIN, { roughness: 0.72, metalness: 0 })
  const cloth = std(opts.clothing, { roughness: 0.48 })
  const hairMat = std(opts.hair ?? 0x1c1917, { roughness: 0.82, metalness: 0 })
  const shoeMat = std(0x0f172a, { roughness: 0.55, metalness: 0.08 })

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.38, 20),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false })
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = 0.012
  g.add(shadow)

  const hips = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.18, 12), cloth)
  hips.position.y = 0.78
  const lLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.5, 4, 10), cloth)
  lLeg.position.set(-0.12, 0.4, 0)
  const rLeg = lLeg.clone()
  rLeg.position.x = 0.12
  const lShoe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.28), shoeMat)
  lShoe.position.set(-0.12, 0.065, 0.05)
  const rShoe = lShoe.clone()
  rShoe.position.x = 0.12
  g.add(hips, lLeg, rLeg, lShoe, rShoe)

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.23, 0.46, 6, 14), cloth)
  torso.position.y = 1.12
  torso.name = 'hit'
  const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.16, 0.26), cloth)
  shoulders.position.y = 1.36
  g.add(torso, shoulders)

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.12, 10), skin)
  neck.position.y = 1.48
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 22, 20), skin)
  head.position.y = 1.68
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.205, 18, 14, 0, Math.PI * 2, 0, Math.PI / 1.65),
    hairMat
  )
  hair.position.y = 1.74
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1e293b })
  const lEye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), eyeMat)
  lEye.position.set(-0.07, 1.7, 0.175)
  const rEye = lEye.clone()
  rEye.position.x = 0.07
  g.add(neck, head, hair, lEye, rEye)

  const armGeom = new THREE.CapsuleGeometry(0.062, 0.42, 4, 10)
  const leftArm = new THREE.Mesh(armGeom, cloth)
  leftArm.position.set(-0.36, 1.14, 0)
  leftArm.rotation.z = 0.2
  const rightArm = new THREE.Mesh(armGeom, cloth)
  rightArm.position.set(0.36, 1.14, 0)
  rightArm.rotation.z = -0.2
  g.add(leftArm, rightArm)

  const hold = opts.hold ?? 'none'
  if (hold === 'coins') {
    const stack = createCoinStack(0.14, COLORS.depositor)
    stack.position.set(0.42, 1.02, 0.2)
    stack.rotation.x = 0.18
    rightArm.rotation.z = -0.72
    rightArm.rotation.x = -0.32
    g.add(stack)
  } else if (hold === 'document') {
    const doc = createDocument(0.58)
    doc.position.set(0.4, 1.12, 0.18)
    doc.rotation.set(-0.38, 0.28, 0.12)
    rightArm.rotation.z = -0.55
    g.add(doc)
  } else if (hold === 'clipboard') {
    const board = createDocument(0.5)
    board.position.set(0.38, 1.12, 0.16)
    board.rotation.set(-0.35, 0.22, 0.1)
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
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.64, 0.03),
    std(0x334155, { roughness: 0.45, metalness: 0.25 })
  )
  const page = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.54, 0.02),
    std(0xf8fafc, { roughness: 0.85, metalness: 0 })
  )
  page.position.z = 0.02
  g.add(board, page)
  const lineMat = new THREE.MeshBasicMaterial({ color: 0x64748b })
  for (let i = 0; i < 5; i++) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.28, i === 0 ? 0.035 : 0.022, 0.005), lineMat)
    line.position.set(0, 0.16 - i * 0.085, 0.032)
    g.add(line)
  }
  const seal = new THREE.Mesh(new THREE.CircleGeometry(0.05, 14), new THREE.MeshBasicMaterial({ color: COLORS.borrower }))
  seal.position.set(0.12, -0.18, 0.034)
  g.add(seal)
  return g
}

export function createContractStand(): THREE.Group {
  const g = new THREE.Group()
  g.userData.kind = 'contract'

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.26, 0.08, 16),
    std(0x1e293b, { metalness: 0.45, roughness: 0.4 })
  )
  base.position.y = 0.04
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.055, 1.15, 10),
    std(0x64748b, { metalness: 0.5, roughness: 0.35 })
  )
  post.position.y = 0.62
  const lectern = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.06, 0.5),
    std(0x334155, { metalness: 0.3, roughness: 0.45 })
  )
  lectern.position.y = 1.18
  lectern.rotation.x = -0.22
  g.add(base, post, lectern)

  const doc = createDocument(1.15)
  doc.position.set(0, 1.28, 0.02)
  doc.rotation.x = -0.28
  g.add(doc)
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

  const door = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.12, 32), goldMat)
  door.rotation.x = Math.PI / 2
  door.position.set(0, 0.95, 0.7)
  g.add(door)

  const doorPlate = new THREE.Mesh(
    new THREE.CylinderGeometry(0.48, 0.48, 0.04, 32),
    std(0x1e293b, { metalness: 0.75, roughness: 0.3 })
  )
  doorPlate.rotation.x = Math.PI / 2
  doorPlate.position.set(0, 0.95, 0.77)
  g.add(doorPlate)

  const dial = new THREE.Mesh(
    new THREE.TorusGeometry(0.26, 0.045, 8, 28),
    std(0xf8fafc, { metalness: 0.75, roughness: 0.22 })
  )
  dial.position.set(0, 0.95, 0.8)
  g.add(dial)

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.1, 12), std(0xe2e8f0, { metalness: 0.85 }))
  hub.rotation.x = Math.PI / 2
  hub.position.set(0, 0.95, 0.82)
  g.add(hub)

  const spokeGeom = new THREE.BoxGeometry(0.42, 0.04, 0.04)
  const spokeMat = std(0xe2e8f0, { metalness: 0.8 })
  for (const angle of [0, Math.PI / 2]) {
    const spoke = new THREE.Mesh(spokeGeom, spokeMat)
    spoke.position.set(0, 0.95, 0.81)
    spoke.rotation.z = angle
    g.add(spoke)
  }

  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.34, 0.07), goldMat)
  handle.position.set(0.28, 0.95, 0.78)
  g.add(handle)
  for (const x of [-1, 1]) {
    for (const z of [-1, 1]) {
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.24), bodyMat)
      foot.position.set(x * 0.68, 0.07, z * 0.5)
      g.add(foot)
    }
  }

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
  const wall = std(0x1e293b, { roughness: 0.48, metalness: 0.22 })
  const accent = std(COLORS.protocol, { roughness: 0.35, metalness: 0.4, emissive: COLORS.protocolEmissive, emissiveIntensity: 0.18 })
  const glass = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.25,
    transparent: true,
    opacity: 0.42,
    metalness: 0.1,
    roughness: 0.18
  })

  const building = new THREE.Mesh(new THREE.BoxGeometry(1.85, 1.7, 1.35), wall)
  building.position.y = 0.95
  building.name = 'hit'
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.12, 1.5), accent)
  roof.position.y = 1.86
  const awning = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.08, 0.42), accent)
  awning.position.set(0, 1.38, 0.82)
  g.add(building, roof, awning)

  for (const x of [-0.42, 0.42]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.44, 0.05), glass)
    w.position.set(x, 1.18, 0.7)
    g.add(w)
  }
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.72, 0.06), std(0x0f172a, { roughness: 0.4 }))
  door.position.set(0, 0.46, 0.7)
  const colL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.55, 10), accent)
  colL.position.set(-0.82, 0.82, 0.62)
  const colR = colL.clone()
  colR.position.x = 0.82
  g.add(door, colL, colR)
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
  sprite.scale.set(2.05, 0.5, 1)
  sprite.position.y = 2.42
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
