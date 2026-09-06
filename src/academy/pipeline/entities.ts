import * as THREE from 'three'
import type { EntityId } from '../simulation/types'
import { COLORS } from './theme'

export type EntityKind = 'person' | 'vault' | 'hub' | 'role'

export type NodeBundle = {
  group: THREE.Group
  body: THREE.Mesh
  glow: THREE.Mesh
  ring?: THREE.Mesh
  fill?: THREE.Mesh
  kind: EntityKind
}

function std(color: number, emissive = 0x000000, extra: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: emissive ? 0.28 : 0,
    metalness: extra.metalness ?? 0.2,
    roughness: extra.roughness ?? 0.5,
    ...extra
  })
}

function labelSprite(text: string, tint: string) {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 64
  const ctx = c.getContext('2d')
  if (ctx) {
    ctx.clearRect(0, 0, 256, 64)
    ctx.fillStyle = 'rgba(7, 11, 20, 0.88)'
    ctx.beginPath()
    ctx.roundRect(8, 10, 240, 44, 10)
    ctx.fill()
    ctx.strokeStyle = tint
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.fillStyle = '#f8fafc'
    ctx.font = '600 22px ui-sans-serif, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 128, 32)
  }
  const map = new THREE.CanvasTexture(c)
  map.colorSpace = THREE.SRGBColorSpace
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false }))
  sprite.scale.set(1.85, 0.46, 1)
  sprite.position.y = 2.25
  sprite.userData.keepOpaque = true
  return sprite
}

function hitBox(id: EntityId, w: number, h: number, d: number, y: number) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshBasicMaterial({ visible: false })
  )
  mesh.position.y = y
  mesh.userData.entityId = id
  return mesh
}

function glowSphere(color: number, radius: number, y: number) {
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 16, 16),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.07,
      depthWrite: false
    })
  )
  glow.position.y = y
  return glow
}

export function createPerson(
  id: EntityId,
  options: {
    cloth: number
    emissive: number
    hair: number
    label: string
    accent: string
    scale?: number
  }
): NodeBundle {
  const group = new THREE.Group()
  group.userData.entityId = id
  group.userData.kind = 'person'
  const s = options.scale ?? 1.15
  group.scale.setScalar(s)

  const skin = std(0xe8c4a8, 0x000000, { roughness: 0.7, metalness: 0.02 })
  const cloth = std(options.cloth, options.emissive, { roughness: 0.48 })
  const hair = std(options.hair, 0x000000, { roughness: 0.8, metalness: 0 })
  const shoe = std(0x1e293b)

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.42, 4, 12), cloth)
  torso.position.y = 1.08
  const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.16, 0.28), cloth)
  shoulders.position.y = 1.32
  const hips = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.2, 12), cloth)
  hips.position.y = 0.78
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.12, 10), skin)
  neck.position.y = 1.42
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 18), skin)
  head.position.y = 1.62
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.205, 16, 14, 0, Math.PI * 2, 0, Math.PI / 1.7), hair)
  hairCap.position.y = 1.68
  const lLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.46, 3, 8), cloth)
  lLeg.position.set(-0.12, 0.38, 0)
  const rLeg = lLeg.clone()
  rLeg.position.x = 0.12
  const lShoe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.28), shoe)
  lShoe.position.set(-0.12, 0.07, 0.05)
  const rShoe = lShoe.clone()
  rShoe.position.x = 0.12
  const lArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.42, 3, 8), cloth)
  lArm.position.set(-0.36, 1.12, 0)
  lArm.rotation.z = 0.22
  const rArm = lArm.clone()
  rArm.position.x = 0.36
  rArm.rotation.z = -0.22

  group.add(torso, shoulders, hips, neck, head, hairCap, lLeg, rLeg, lShoe, rShoe, lArm, rArm)
  group.add(labelSprite(options.label, options.accent))

  const body = hitBox(id, 0.95, 2.05, 0.7, 1.05)
  const glow = glowSphere(options.cloth, 1.05, 1.05)
  group.add(body, glow)
  return { group, body, glow, kind: 'person' }
}

export function createAdministrator(id: EntityId): NodeBundle {
  const person = createPerson(id, {
    cloth: COLORS.admin,
    emissive: COLORS.protocolEmissive,
    hair: 0x334155,
    label: 'Administrator',
    accent: '#a5b4fc'
  })
  const clipboard = createContractMesh(0.28, 0.36, COLORS.white, true)
  clipboard.position.set(0.32, 1.05, 0.18)
  clipboard.rotation.set(-0.4, -0.35, 0.2)
  person.group.add(clipboard)
  return person
}

export function createVault(): NodeBundle {
  const group = new THREE.Group()
  group.userData.entityId = 'vault'
  group.userData.kind = 'vault'

  const steel = std(0x334155, COLORS.vaultEmissive, { metalness: 0.72, roughness: 0.28 })
  const trim = std(0x94a3b8, 0x38bdf8, { metalness: 0.8, roughness: 0.22 })
  const gold = std(0xfbbf24, 0xb45309, { metalness: 0.65, roughness: 0.3 })

  const bodyShell = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.55, 1.25), steel)
  bodyShell.position.y = 0.9
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.12, 1.32), trim)
  top.position.y = 1.7
  const door = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.14, 32), trim)
  door.rotation.x = Math.PI / 2
  door.position.set(0, 0.95, 0.64)
  const dial = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.04, 8, 24), gold)
  dial.position.set(0, 0.95, 0.74)
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.06), gold)
  handle.position.set(0.22, 0.95, 0.7)
  const feet = [-1, 1].flatMap((x) =>
    [-1, 1].map((z) => {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.22), steel)
      f.position.set(x * 0.62, 0.08, z * 0.42)
      return f
    })
  )

  const fill = new THREE.Mesh(
    new THREE.BoxGeometry(1.25, 1.05, 0.85),
    std(0xfacc15, 0xb45309, { metalness: 0.45, roughness: 0.4, transparent: true, opacity: 0.85 })
  )
  fill.position.y = 0.55

  const ring = dial
  group.add(bodyShell, top, door, dial, handle, fill, ...feet)
  group.add(labelSprite('Lending Vault', '#7dd3fc'))

  const body = hitBox('vault', 1.9, 1.9, 1.5, 0.95)
  const glow = glowSphere(COLORS.vault, 1.35, 0.95)
  group.add(body, glow)
  return { group, body, glow, ring, fill, kind: 'vault' }
}

export function createProtocolHub(): NodeBundle {
  const group = new THREE.Group()
  group.userData.entityId = 'protocol'
  group.userData.kind = 'hub'

  const wall = std(0x1e293b, COLORS.protocolEmissive, { metalness: 0.25, roughness: 0.45 })
  const accent = std(COLORS.protocol, COLORS.protocolEmissive, { metalness: 0.4, roughness: 0.35 })
  const glass = std(0x38bdf8, 0x0ea5e9, { transparent: true, opacity: 0.35, metalness: 0.1, roughness: 0.15 })

  const building = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.7, 1.35), wall)
  building.position.y = 0.95
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 1.5), accent)
  roof.position.y = 1.85
  const awning = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.45), accent)
  awning.position.set(0, 1.35, 0.85)
  const winL = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.42, 0.05), glass)
  winL.position.set(-0.38, 1.15, 0.68)
  const winR = winL.clone()
  winR.position.x = 0.38
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.7, 0.06), std(0x0f172a, COLORS.admin))
  door.position.set(0, 0.5, 0.7)
  const colL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.5, 10), accent)
  colL.position.set(-0.78, 0.85, 0.62)
  const colR = colL.clone()
  colR.position.x = 0.78

  group.add(building, roof, awning, winL, winR, door, colL, colR)
  group.add(labelSprite('Loan Broker', '#c7d2fe'))

  const admin = createAdministrator('protocol')
  admin.group.position.set(1.25, 0, 0.55)
  admin.group.scale.setScalar(0.92)
  group.add(admin.group)

  const body = hitBox('protocol', 3.2, 2.2, 2.2, 1.0)
  const glow = glowSphere(COLORS.protocol, 1.5, 1.0)
  group.add(body, glow)
  return { group, body, glow, kind: 'hub' }
}

export function createContractMesh(w = 0.55, h = 0.72, paper = 0xf8fafc, compact = false) {
  const group = new THREE.Group()
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.06, h + 0.08, 0.04),
    std(0x475569, 0x1e293b, { metalness: 0.3, roughness: 0.45 })
  )
  const page = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.02), std(paper, 0x000000, { roughness: 0.85, metalness: 0 }))
  page.position.z = 0.025
  group.add(board, page)
  const lineCount = compact ? 4 : 6
  for (let i = 0; i < lineCount; i++) {
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.72, 0.018, 0.01),
      std(i === 0 ? COLORS.protocol : 0xcbd5e1)
    )
    line.position.set(0, h / 2 - 0.12 - i * 0.09, 0.04)
    group.add(line)
  }
  const seal = new THREE.Mesh(new THREE.CircleGeometry(0.06, 16), std(COLORS.borrower, COLORS.borrowerEmissive))
  seal.position.set(w * 0.28, -h * 0.32, 0.04)
  group.add(seal)
  return group
}

export function createContractStand(label = 'Loan agreement'): THREE.Group {
  const group = new THREE.Group()
  group.userData.kind = 'contract'
  const doc = createContractMesh()
  doc.position.y = 1.15
  doc.rotation.x = -0.18
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.05, 8), std(0x64748b, 0x334155, { metalness: 0.4 }))
  post.position.y = 0.52
  group.add(doc, post, labelSprite(label, '#fde68a'))
  group.visible = false
  return group
}

export function createCoin(color: number, radius = 0.13) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, 0.045, 18),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.45,
      metalness: 0.7,
      roughness: 0.25
    })
  )
  mesh.rotation.x = Math.PI / 2
  return mesh
}

export function createShareToken() {
  const mesh = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.12, 0),
    std(COLORS.yield, COLORS.depositorEmissive, { metalness: 0.35, roughness: 0.35 })
  )
  return mesh
}

export function createFloorRibbon(from: THREE.Vector3, to: THREE.Vector3, color: number) {
  const a = from.clone()
  const b = to.clone()
  a.y = -2.39
  b.y = -2.39
  const len = Math.max(0.2, a.distanceTo(b))
  const mid = a.clone().lerp(b, 0.5)
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.02, len),
    new THREE.MeshStandardMaterial({
      color,
      transparent: true,
      opacity: 0.22,
      emissive: color,
      emissiveIntensity: 0.12,
      metalness: 0.1,
      roughness: 0.8
    })
  )
  mesh.position.copy(mid)
  mesh.rotation.y = Math.atan2(b.x - a.x, b.z - a.z)
  return mesh
}

export function createDepositor(): NodeBundle {
  return createPerson('depositor', {
    cloth: COLORS.depositor,
    emissive: COLORS.depositorEmissive,
    hair: 0x1c1917,
    label: 'Depositor',
    accent: '#6ee7b7'
  })
}

export function createBorrower(): NodeBundle {
  return createPerson('borrower', {
    cloth: COLORS.borrower,
    emissive: COLORS.borrowerEmissive,
    hair: 0x44403c,
    label: 'Borrower',
    accent: '#fde68a'
  })
}
