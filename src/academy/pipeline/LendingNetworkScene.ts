/**
 * Canonical Academy visual renderer.
 * Builds the persistent lending world from entity meshes (people, vault, loan-broker
 * building, contracts, coins). Lesson index only changes camera focus and props —
 * it does not swap in the retired sphere/pipe network (see docs/legacy-academy-network-scene.pdf).
 */
import * as THREE from 'three'
import type { AnimationRequest, EntityId, SimulationState } from '../simulation/types'
import {
  createBorrower,
  createCoin,
  createContractStand,
  createDepositor,
  createFloorRibbon,
  createPerson,
  createProtocolHub,
  createShareToken,
  createVault,
  type NodeBundle
} from './entities'
import {
  COLORS,
  ENTITY_POSITIONS,
  FLOW_COLORS,
  LESSON_CAMERAS,
  lessonFocusEntities,
  stageHighlight,
  utilization,
  vaultFillRatio,
  type CameraPreset
} from './theme'

type PathBundle = {
  key: string
  from: EntityId
  to: EntityId
  curve: THREE.CubicBezierCurve3
  ribbon: THREE.Mesh
  pulse: THREE.Mesh
  kind: 'capital' | 'admin' | 'repay' | 'yield' | 'advanced'
}

type Particle = {
  mesh: THREE.Mesh
  t: number
  speed: number
  curve: THREE.CubicBezierCurve3
  onComplete?: () => void
  done: boolean
}

type Walk = {
  id: EntityId
  t: number
  returning: boolean
}

function makeCurve(from: EntityId, to: EntityId, lift = 0.55): THREE.CubicBezierCurve3 {
  const a = new THREE.Vector3(...ENTITY_POSITIONS[from])
  const b = new THREE.Vector3(...ENTITY_POSITIONS[to])
  a.y += 0.95
  b.y += 0.95
  const mid = a.clone().lerp(b, 0.5)
  mid.y += lift
  const c1 = a.clone().lerp(mid, 0.5)
  const c2 = b.clone().lerp(mid, 0.5)
  c1.y += lift * 0.25
  c2.y += lift * 0.25
  return new THREE.CubicBezierCurve3(a, c1, c2, b)
}

function place(bundle: NodeBundle, id: EntityId) {
  bundle.group.position.set(...ENTITY_POSITIONS[id])
  bundle.group.userData.entityId = id
  return bundle
}

export type SceneHooks = {
  onEntityClick?: (id: EntityId) => void
  onAnimationComplete?: (id: string) => void
  onAnimationStart?: (id: string) => void
  takeCallback?: (id: string) => (() => void) | undefined
}

export class LendingNetworkScene {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  private nodes = new Map<EntityId, NodeBundle>()
  private paths: PathBundle[] = []
  private particles: Particle[] = []
  private advancedGroups: THREE.Group[] = []
  private timer = new THREE.Timer()
  private raf = 0
  private disposed = false
  private reducedMotion = false
  private visible = true
  private lesson = 0
  private targetCam: CameraPreset = LESSON_CAMERAS[0]
  private camLerp = 1
  private raycaster = new THREE.Raycaster()
  private pointer = new THREE.Vector2()
  private hooks: SceneHooks
  private ambientPulse = 0
  private lastState: SimulationState | null = null
  private animatingIds = new Set<string>()
  private underwritingMarkers: THREE.Mesh[] = []
  private root: HTMLElement
  private onResize: () => void
  private onPointer: (e: PointerEvent) => void
  private onVisibility: () => void
  private resizeObserver: ResizeObserver | null = null
  private rulesDoc: THREE.Group
  private loanDoc: THREE.Group
  private walks: Walk[] = []
  private lastSize = { w: 0, h: 0 }

  constructor(root: HTMLElement, hooks: SceneHooks = {}) {
    this.root = root
    this.hooks = hooks

    this.scene = new THREE.Scene()
    this.scene.fog = new THREE.Fog(COLORS.bg, 16, 32)

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80)
    this.camera.position.set(...LESSON_CAMERAS[0].position)
    this.camera.lookAt(...LESSON_CAMERAS[0].lookAt)

    try {
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      })
    } catch (err) {
      throw new Error(`WebGL unavailable: ${err instanceof Error ? err.message : String(err)}`)
    }
    const gl = this.renderer.getContext()
    if (!gl) {
      this.renderer.dispose()
      throw new Error('WebGL context could not be created')
    }
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
    root.appendChild(this.renderer.domElement)
    this.renderer.domElement.style.width = '100%'
    this.renderer.domElement.style.height = '100%'
    this.renderer.domElement.style.maxWidth = '100%'
    this.renderer.domElement.style.maxHeight = '100%'
    this.renderer.domElement.style.display = 'block'
    this.renderer.domElement.style.touchAction = 'manipulation'

    const amb = new THREE.AmbientLight(0xb6c2d9, 0.62)
    const key = new THREE.DirectionalLight(0xffffff, 0.95)
    key.position.set(4, 8, 6)
    const fill = new THREE.DirectionalLight(0x93c5fd, 0.28)
    fill.position.set(-6, 4, 2)
    const rim = new THREE.DirectionalLight(0x818cf8, 0.22)
    rim.position.set(-5, 3, -4)
    this.scene.add(amb, key, fill, rim)

    const grid = new THREE.GridHelper(16, 16, 0x1e293b, 0x111827)
    grid.position.y = -2.4
    const gridMat = grid.material as THREE.Material | THREE.Material[]
    if (Array.isArray(gridMat))
      gridMat.forEach((m) => {
        m.transparent = true
        m.opacity = 0.35
      })
    else {
      gridMat.transparent = true
      gridMat.opacity = 0.35
    }
    this.scene.add(grid)

    this.nodes.set('protocol', place(createProtocolHub(), 'protocol'))
    this.nodes.set('vault', place(createVault(), 'vault'))
    this.nodes.set('depositor', place(createDepositor(), 'depositor'))
    this.nodes.set('borrower', place(createBorrower(), 'borrower'))
    this.nodes.forEach((n) => this.scene.add(n.group))
    ;(['depositor', 'borrower'] as const).forEach((id) => {
      const node = this.nodes.get(id)
      if (!node) return
      const home = ENTITY_POSITIONS[id]
      const vault = ENTITY_POSITIONS.vault
      node.group.rotation.y = Math.atan2(vault[0] - home[0], vault[2] - home[2])
    })

    this.addAdvancedPerson('guarantor', COLORS.borrower, COLORS.borrowerEmissive, 'Guarantor', '#fda4af')
    this.addAdvancedPerson('broker', COLORS.protocol, COLORS.protocolEmissive, 'Originator', '#c7d2fe')
    this.addAdvancedPerson('underwriter', COLORS.admin, COLORS.protocolEmissive, 'Underwriter', '#a5b4fc')
    this.addAdvancedPerson('servicer', COLORS.vault, COLORS.vaultEmissive, 'Servicer', '#7dd3fc')
    this.addAdvancedPerson('custodian', COLORS.depositor, COLORS.depositorEmissive, 'Custodian', '#6ee7b7')
    this.setAdvancedVisible(false)

    this.paths.push(
      this.makePath('depositor-vault', 'depositor', 'vault', 'capital', 0.45, COLORS.depositor),
      this.makePath('vault-borrower', 'vault', 'borrower', 'capital', 0.45, COLORS.borrower),
      this.makePath('borrower-vault', 'borrower', 'vault', 'repay', 0.7, COLORS.borrower),
      this.makePath('vault-depositor', 'vault', 'depositor', 'yield', 0.75, COLORS.yield),
      this.makePath('protocol-vault', 'protocol', 'vault', 'admin', 0.25, COLORS.admin)
    )
    this.paths.forEach((p) => this.scene.add(p.ribbon, p.pulse))

    this.rulesDoc = createContractStand('Vault rules')
    this.rulesDoc.position.set(-1.15, -2.4, -0.85)
    this.loanDoc = createContractStand('Loan agreement')
    this.loanDoc.position.set(1.55, -2.4, 0.15)
    this.scene.add(this.rulesDoc, this.loanDoc)

    const stages = 5
    for (let i = 0; i < stages; i++) {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.04, 0.16),
        new THREE.MeshStandardMaterial({
          color: COLORS.pipeActive,
          emissive: COLORS.borrowerEmissive,
          emissiveIntensity: 0.2,
          metalness: 0.2,
          roughness: 0.5
        })
      )
      const t = (i + 1) / (stages + 1)
      const path = this.paths.find((p) => p.key === 'vault-borrower')!
      m.position.copy(path.curve.getPoint(t))
      m.position.y = -2.32
      m.visible = false
      this.underwritingMarkers.push(m)
      this.scene.add(m)
    }

    this.onResize = () => this.resize()
    this.onPointer = (e) => this.handlePointer(e)
    this.onVisibility = () => {
      this.visible = document.visibilityState === 'visible'
      if (this.visible && !this.disposed) this.start()
    }
    window.addEventListener('resize', this.onResize)
    this.renderer.domElement.addEventListener('pointerdown', this.onPointer)
    document.addEventListener('visibilitychange', this.onVisibility)
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.resize())
      this.resizeObserver.observe(root)
    }
    this.resize()
    this.setLesson(0)
    this.start()
  }

  private addAdvancedPerson(
    id: EntityId,
    cloth: number,
    emissive: number,
    label: string,
    accent: string
  ) {
    const node = createPerson(id, { cloth, emissive, hair: 0x292524, label, accent, scale: 0.78 })
    place(node, id)
    node.group.visible = false
    this.nodes.set(id, node)
    this.scene.add(node.group)
    this.advancedGroups.push(node.group)
  }

  private makePath(
    key: string,
    from: EntityId,
    to: EntityId,
    kind: PathBundle['kind'],
    lift: number,
    color: number
  ): PathBundle {
    const curve = makeCurve(from, to, lift)
    const ribbon = createFloorRibbon(
      new THREE.Vector3(...ENTITY_POSITIONS[from]),
      new THREE.Vector3(...ENTITY_POSITIONS[to]),
      color
    )
    const pulse = createCoin(color, kind === 'admin' ? 0.08 : 0.1)
    pulse.visible = false
    return { key, from, to, curve, ribbon, pulse, kind }
  }

  setReducedMotion(on: boolean) {
    this.reducedMotion = on
  }

  setLesson(lesson: number) {
    this.lesson = lesson
    const focus = new Set(lessonFocusEntities(lesson))
    this.nodes.forEach((node, id) => {
      if (id === 'guarantor' || id === 'broker' || id === 'underwriter' || id === 'servicer' || id === 'custodian')
        return
      const active = focus.has(id)
      this.setGroupEmphasis(node.group, active)
    })
    this.underwritingMarkers.forEach((m) => {
      m.visible = lesson === 3 || lesson === 4
    })
    this.rulesDoc.visible = lesson === 1 || lesson === 7
    this.loanDoc.visible = lesson === 4 || lesson === 5 || lesson === 7 || lesson === 3
    this.fitCameraToFocus(focus)
  }

  private setGroupEmphasis(group: THREE.Group, active: boolean) {
    group.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return
      if (obj.userData.keepOpaque) return
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material]
      for (const mat of materials) {
        if (!(mat instanceof THREE.MeshStandardMaterial) && !(mat instanceof THREE.MeshBasicMaterial)) continue
        if (mat.visible === false) continue
        const baseOpacity = mat.userData.baseOpacity as number | undefined
        if (baseOpacity == null) mat.userData.baseOpacity = mat.opacity
        const rest = (mat.userData.baseOpacity as number) ?? 1
        if (rest < 0.45) continue
        mat.transparent = !active || rest < 1
        mat.opacity = active ? rest : Math.min(rest, 0.32)
      }
    })
  }

  private fitCameraToFocus(focus: Set<EntityId>) {
    const box = new THREE.Box3()
    let any = false
    focus.forEach((id) => {
      const node = this.nodes.get(id)
      if (!node || !node.group.visible) return
      box.expandByObject(node.group)
      any = true
    })
    if (this.rulesDoc.visible) {
      box.expandByObject(this.rulesDoc)
      any = true
    }
    if (this.loanDoc.visible) {
      box.expandByObject(this.loanDoc)
      any = true
    }
    if (!any || box.isEmpty()) {
      this.targetCam = LESSON_CAMERAS[this.lesson] ?? LESSON_CAMERAS[0]
      this.camLerp = 0
      return
    }
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const pad = 1.1
    const maxDim = Math.max(size.x, size.y * 1.05, size.z) * pad
    const fov = ((this.camera.fov ?? 42) * Math.PI) / 180
    const dist = Math.max(5.6, (maxDim / 2) / Math.tan(fov / 2) + 0.8)
    this.targetCam = {
      position: [center.x, Math.max(1.85, center.y + maxDim * 0.28), center.z + dist * 0.92],
      lookAt: [center.x, center.y + 0.35, center.z]
    }
    this.camLerp = 0
  }

  setAdvancedVisible(show: boolean) {
    this.advancedGroups.forEach((g) => {
      g.visible = show
    })
    ;(['guarantor-borrower', 'broker-vault'] as const).forEach((key) => {
      let path = this.paths.find((p) => p.key === key)
      if (!path && show) {
        if (key === 'guarantor-borrower') {
          path = this.makePath(key, 'guarantor', 'borrower', 'advanced', 0.35, COLORS.risk)
        } else {
          path = this.makePath(key, 'broker', 'vault', 'advanced', 0.35, COLORS.protocol)
        }
        this.paths.push(path)
        this.scene.add(path.ribbon, path.pulse)
      }
      if (path) {
        path.ribbon.visible = show
        path.pulse.visible = show && !this.reducedMotion
      }
    })
    if (show) this.fitCameraToFocus(new Set(lessonFocusEntities(this.lesson)))
  }

  syncState(state: SimulationState) {
    this.lastState = state
    this.setAdvancedVisible(state.showAdvancedRoles)

    const fill = vaultFillRatio(state)
    const vault = this.nodes.get('vault')
    if (vault?.fill) {
      const r = Math.max(0.12, fill)
      vault.fill.scale.set(1, r, 1)
      vault.fill.position.y = 0.28 + r * 0.52
      const mat = vault.fill.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 0.35 + utilization(state) * 0.5
    }

    const highlight = stageHighlight(state.lifecycleStage)
    this.paths.forEach((path) => {
      const mat = path.ribbon.material as THREE.MeshStandardMaterial
      const active =
        highlight &&
        ((path.from === highlight.from && path.to === highlight.to) ||
          (path.kind === 'admin' && state.selectedEntity === 'protocol'))
      const danger = state.defaultedConnection && path.key === 'borrower-vault'
      mat.emissiveIntensity = danger ? 0.55 : active ? 0.38 : 0.12
      mat.opacity = danger ? 0.45 : active ? 0.34 : 0.18
      if (danger) {
        mat.color = new THREE.Color(COLORS.risk)
        mat.emissive = new THREE.Color(COLORS.risk)
      }
    })

    if (state.selectedTerm === 'APR' || state.selectedTerm === 'Interest') {
      const repay = this.paths.find((p) => p.key === 'borrower-vault')
      if (repay) {
        const mat = repay.ribbon.material as THREE.MeshStandardMaterial
        mat.emissive = new THREE.Color(COLORS.interest)
        mat.emissiveIntensity = 0.55
      }
    }

    this.underwritingMarkers.forEach((m, i) => {
      const mat = m.material as THREE.MeshStandardMaterial
      const on = i <= state.underwritingPhase
      mat.color = new THREE.Color(on ? COLORS.borrower : COLORS.pipeActive)
      mat.emissiveIntensity = on ? 0.45 : 0.12
      m.scale.setScalar(on ? 1.35 : 1)
    })

    if (state.lifecycleStage === 'request' || state.lifecycleStage === 'underwrite' || state.lifecycleStage === 'approve') {
      this.loanDoc.visible = true
    }

    for (const anim of state.pendingAnimations) {
      if (anim.started || this.animatingIds.has(anim.id)) continue
      this.animatingIds.add(anim.id)
      this.hooks.onAnimationStart?.(anim.id)
      this.spawnTransfer(anim)
    }
  }

  private spawnTransfer(anim: AnimationRequest) {
    const path =
      this.paths.find((p) => p.from === anim.from && p.to === anim.to) ??
      this.paths.find((p) => p.key === `${anim.from}-${anim.to}`)
    const curve = path?.curve ?? makeCurve(anim.from, anim.to, 0.55)
    if (!this.reducedMotion) {
      if (anim.kind === 'deposit') this.walks.push({ id: 'depositor', t: 0, returning: false })
      if (anim.kind === 'loan') this.walks.push({ id: 'borrower', t: 0, returning: false })
      if (anim.kind === 'principal' || anim.kind === 'interest' || anim.kind === 'default') {
        this.walks.push({ id: 'borrower', t: 0, returning: false })
      }
      if (anim.kind === 'yield') this.walks.push({ id: 'depositor', t: 0, returning: false })
    }
    if (this.reducedMotion) {
      const cb = this.hooks.takeCallback?.(anim.id)
      cb?.()
      this.hooks.onAnimationComplete?.(anim.id)
      this.animatingIds.delete(anim.id)
      return
    }

    const count = Math.min(12, Math.max(3, Math.round(anim.amount / 1400)))
    const color = FLOW_COLORS[anim.kind]

    for (let i = 0; i < count; i++) {
      const mesh =
        anim.kind === 'yield'
          ? createShareToken()
          : createCoin(color, anim.kind === 'interest' ? 0.09 : 0.12)
      if (anim.kind === 'principal') {
        const mat = mesh.material as THREE.MeshStandardMaterial
        mat.color = new THREE.Color(COLORS.borrower)
      }
      if (anim.kind === 'interest') {
        const mat = mesh.material as THREE.MeshStandardMaterial
        mat.color = new THREE.Color(COLORS.interest)
        mat.emissive = new THREE.Color(COLORS.interest)
      }
      this.scene.add(mesh)
      const particle: Particle = {
        mesh,
        t: -i * 0.07,
        speed: 0.32 + (anim.kind === 'interest' ? 0.06 : 0),
        curve,
        done: false,
        onComplete:
          i === count - 1
            ? () => {
                const cb = this.hooks.takeCallback?.(anim.id)
                cb?.()
                this.hooks.onAnimationComplete?.(anim.id)
                this.animatingIds.delete(anim.id)
              }
            : undefined
      }
      this.particles.push(particle)
    }
  }

  private handlePointer(e: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const objs = [...this.nodes.values()].filter((n) => n.group.visible).map((n) => n.body)
    const hits = this.raycaster.intersectObjects(objs, false)
    if (hits[0]) {
      const id = (hits[0].object.userData.entityId ?? hits[0].object.parent?.userData.entityId) as
        | EntityId
        | undefined
      if (id) this.hooks.onEntityClick?.(id)
    }
  }

  resize() {
    const { clientWidth: w, clientHeight: h } = this.root
    if (!w || !h) return
    const sizeChanged = w !== this.lastSize.w || h !== this.lastSize.h
    this.lastSize = { w, h }
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
    this.renderer.setSize(w, h, false)
    if (sizeChanged) this.fitCameraToFocus(new Set(lessonFocusEntities(this.lesson)))
  }

  private start() {
    cancelAnimationFrame(this.raf)
    const loop = (timestamp: number) => {
      if (this.disposed) return
      this.raf = requestAnimationFrame(loop)
      if (!this.visible) return
      this.timer.update(timestamp)
      this.tick()
    }
    this.raf = requestAnimationFrame(loop)
  }

  private tick() {
    const dt = Math.min(0.05, this.timer.getDelta())
    this.ambientPulse += dt

    if (this.camLerp < 1) {
      this.camLerp = Math.min(1, this.camLerp + dt * (this.reducedMotion ? 4 : 1.15))
      const ease = 1 - Math.pow(1 - this.camLerp, 3)
      this.camera.position.lerp(new THREE.Vector3(...this.targetCam.position), 0.08 + ease * 0.12)
      this.camera.lookAt(new THREE.Vector3(...this.targetCam.lookAt))
    }

    this.walks = this.walks.filter((walk) => {
      walk.t += dt * 0.85
      if (!walk.returning && walk.t >= 1) {
        walk.returning = true
        walk.t = 0
      }
      const done = walk.returning && walk.t >= 1
      const home = new THREE.Vector3(...ENTITY_POSITIONS[walk.id])
      const vault = new THREE.Vector3(...ENTITY_POSITIONS.vault)
      const toward = home.clone().lerp(vault, 0.42)
      const t = Math.min(1, walk.t)
      const ease = t * t * (3 - 2 * t)
      const pos = walk.returning ? toward.clone().lerp(home, ease) : home.clone().lerp(toward, ease)
      const node = this.nodes.get(walk.id)
      if (node) {
        node.group.position.x = pos.x
        node.group.position.z = pos.z
        const face = walk.returning ? home : vault
        node.group.rotation.y = Math.atan2(face.x - pos.x, face.z - pos.z)
      }
      if (done && node) {
        node.group.position.set(...ENTITY_POSITIONS[walk.id])
        const homePos = ENTITY_POSITIONS[walk.id]
        const vaultPos = ENTITY_POSITIONS.vault
        node.group.rotation.y = Math.atan2(vaultPos[0] - homePos[0], vaultPos[2] - homePos[2])
      }
      return !done
    })

    if (!this.reducedMotion) {
      this.nodes.forEach((node, id) => {
        if (this.walks.some((w) => w.id === id)) return
        const base = ENTITY_POSITIONS[id]
        if (node.kind === 'person') {
          node.group.position.y = base[1] + Math.sin(this.ambientPulse * 1.4 + base[0]) * 0.012
        }
        if (node.ring) node.ring.rotation.z += dt * 0.5
      })
      this.paths.forEach((path) => {
        path.pulse.visible = path.ribbon.visible && !this.reducedMotion
        const t = (this.ambientPulse * 0.12 + path.key.length * 0.04) % 1
        path.pulse.position.copy(path.curve.getPoint(t))
        path.pulse.rotation.z += dt * 2
      })
    }

    for (const p of this.particles) {
      if (p.done) continue
      p.t += dt * p.speed
      if (p.t < 0) {
        p.mesh.visible = false
        continue
      }
      p.mesh.visible = true
      if (p.t >= 1) {
        p.done = true
        p.mesh.visible = false
        p.onComplete?.()
        continue
      }
      p.mesh.position.copy(p.curve.getPoint(p.t))
      p.mesh.rotation.x += dt * 1.6
      p.mesh.rotation.z += dt * 2.2
    }
    if (this.particles.length > 40) {
      this.particles = this.particles.filter((p) => {
        if (p.done) {
          this.scene.remove(p.mesh)
          p.mesh.geometry.dispose()
          ;(p.mesh.material as THREE.Material).dispose()
          return false
        }
        return true
      })
    }

    this.renderer.render(this.scene, this.camera)
  }

  projectEntity(id: EntityId): { x: number; y: number } | null {
    const pos = new THREE.Vector3(...ENTITY_POSITIONS[id])
    pos.y += 1.1
    pos.project(this.camera)
    const { clientWidth: w, clientHeight: h } = this.root
    if (pos.z > 1) return null
    return { x: (pos.x * 0.5 + 0.5) * w, y: (-pos.y * 0.5 + 0.5) * h }
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.timer.dispose()
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    window.removeEventListener('resize', this.onResize)
    document.removeEventListener('visibilitychange', this.onVisibility)
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointer)
    this.particles.forEach((p) => {
      this.scene.remove(p.mesh)
      p.mesh.geometry.dispose()
      ;(p.mesh.material as THREE.Material).dispose()
    })
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose()
        const m = obj.material
        if (Array.isArray(m)) m.forEach((x) => x.dispose())
        else m.dispose()
      }
    })
    this.renderer.dispose()
    if (this.renderer.domElement.parentElement === this.root) {
      this.root.removeChild(this.renderer.domElement)
    }
  }
}
