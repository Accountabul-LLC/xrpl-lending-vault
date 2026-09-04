import * as THREE from 'three'
import type { AnimationRequest, EntityId, SimulationState } from '../simulation/types'
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

type NodeBundle = {
  group: THREE.Group
  body: THREE.Mesh
  glow: THREE.Mesh
  ring?: THREE.Mesh
  fill?: THREE.Mesh
}

type PipeBundle = {
  key: string
  from: EntityId
  to: EntityId
  curve: THREE.CubicBezierCurve3
  tube: THREE.Mesh
  pulse: THREE.Mesh
  kind: 'capital' | 'admin' | 'repay' | 'yield' | 'advanced'
}

type Particle = {
  mesh: THREE.Mesh
  t: number
  speed: number
  curve: THREE.CubicBezierCurve3
  label?: string
  onComplete?: () => void
  done: boolean
}

function makeCurve(from: EntityId, to: EntityId, lift = 0.8): THREE.CubicBezierCurve3 {
  const a = new THREE.Vector3(...ENTITY_POSITIONS[from])
  const b = new THREE.Vector3(...ENTITY_POSITIONS[to])
  const mid = a.clone().lerp(b, 0.5)
  mid.y += lift
  const c1 = a.clone().lerp(mid, 0.5)
  const c2 = b.clone().lerp(mid, 0.5)
  c1.y += lift * 0.35
  c2.y += lift * 0.35
  return new THREE.CubicBezierCurve3(a, c1, c2, b)
}

function createNode(
  id: EntityId,
  color: number,
  emissive: number,
  shape: 'octa' | 'box' | 'sphere' | 'cylinder'
): NodeBundle {
  const group = new THREE.Group()
  group.position.set(...ENTITY_POSITIONS[id])
  group.userData.entityId = id

  let geometry: THREE.BufferGeometry
  if (shape === 'octa') geometry = new THREE.OctahedronGeometry(0.55, 0)
  else if (shape === 'box') geometry = new THREE.BoxGeometry(1.5, 1.1, 1.1)
  else if (shape === 'cylinder') geometry = new THREE.CylinderGeometry(0.55, 0.65, 0.9, 20)
  else geometry = new THREE.SphereGeometry(0.5, 24, 24)

  const body = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color,
      emissive,
      emissiveIntensity: 0.35,
      metalness: 0.25,
      roughness: 0.45
    })
  )
  body.castShadow = false
  group.add(body)

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.85, 16, 16),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.08,
      depthWrite: false
    })
  )
  group.add(glow)

  let ring: THREE.Mesh | undefined
  let fill: THREE.Mesh | undefined
  if (id === 'vault') {
    ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.05, 0.04, 8, 48),
      new THREE.MeshBasicMaterial({ color: COLORS.vault, transparent: true, opacity: 0.5 })
    )
    ring.rotation.x = Math.PI / 2
    group.add(ring)

    fill = new THREE.Mesh(
      new THREE.BoxGeometry(1.25, 0.85, 0.9),
      new THREE.MeshStandardMaterial({
        color: COLORS.vault,
        emissive: COLORS.vaultEmissive,
        emissiveIntensity: 0.55,
        transparent: true,
        opacity: 0.55,
        metalness: 0.2,
        roughness: 0.4
      })
    )
    fill.position.y = -0.05
    group.add(fill)
  }

  return { group, body, glow, ring, fill }
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
  private pipes: PipeBundle[] = []
  private particles: Particle[] = []
  private advancedGroups: THREE.Group[] = []
  private clock = new THREE.Clock()
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

  constructor(root: HTMLElement, hooks: SceneHooks = {}) {
    this.root = root
    this.hooks = hooks

    this.scene = new THREE.Scene()
    this.scene.fog = new THREE.Fog(COLORS.bg, 14, 28)

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
      throw new Error(
        `WebGL unavailable: ${err instanceof Error ? err.message : String(err)}`
      )
    }
    // Some environments construct a renderer but fail on context creation.
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

    const amb = new THREE.AmbientLight(0xb6c2d9, 0.55)
    const key = new THREE.DirectionalLight(0xffffff, 0.85)
    key.position.set(4, 8, 6)
    const rim = new THREE.DirectionalLight(0x818cf8, 0.25)
    rim.position.set(-5, 3, -4)
    this.scene.add(amb, key, rim)

    const grid = new THREE.GridHelper(16, 16, 0x1e293b, 0x111827)
    grid.position.y = -2.4
    const gridMat = grid.material as THREE.Material | THREE.Material[]
    if (Array.isArray(gridMat)) gridMat.forEach((m) => { m.transparent = true; m.opacity = 0.35 })
    else {
      gridMat.transparent = true
      gridMat.opacity = 0.35
    }
    this.scene.add(grid)

    this.nodes.set('protocol', createNode('protocol', COLORS.protocol, COLORS.protocolEmissive, 'octa'))
    this.nodes.set('vault', createNode('vault', COLORS.vault, COLORS.vaultEmissive, 'box'))
    this.nodes.set('depositor', createNode('depositor', COLORS.depositor, COLORS.depositorEmissive, 'sphere'))
    this.nodes.set('borrower', createNode('borrower', COLORS.borrower, COLORS.borrowerEmissive, 'cylinder'))
    this.nodes.forEach((n) => this.scene.add(n.group))

    this.addAdvancedNode('guarantor', COLORS.borrower, 'Guarantor')
    this.addAdvancedNode('broker', COLORS.protocol, 'Broker')
    this.addAdvancedNode('underwriter', COLORS.protocol, 'Underwriter')
    this.addAdvancedNode('servicer', COLORS.vault, 'Servicer')
    this.addAdvancedNode('custodian', COLORS.depositor, 'Custodian')
    this.setAdvancedVisible(false)

    this.pipes.push(
      this.makePipe('depositor-vault', 'depositor', 'vault', 'capital', 0.9, COLORS.depositor),
      this.makePipe('vault-borrower', 'vault', 'borrower', 'capital', 0.9, COLORS.borrower),
      this.makePipe('borrower-vault', 'borrower', 'vault', 'repay', 1.25, COLORS.borrower),
      this.makePipe('vault-depositor', 'vault', 'depositor', 'yield', 1.35, COLORS.yield),
      this.makePipe('protocol-vault', 'protocol', 'vault', 'admin', 0.35, COLORS.admin)
    )
    this.pipes.forEach((p) => this.scene.add(p.tube, p.pulse))

    // Underwriting stage markers between vault and borrower
    const stages = 5
    for (let i = 0; i < stages; i++) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 10, 10),
        new THREE.MeshBasicMaterial({ color: COLORS.pipeActive, transparent: true, opacity: 0.35 })
      )
      const t = (i + 1) / (stages + 1)
      const pipe = this.pipes.find((p) => p.key === 'vault-borrower')!
      m.position.copy(pipe.curve.getPoint(t))
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
    this.start()
  }

  private addAdvancedNode(id: EntityId, color: number, _label: string) {
    const node = createNode(id, color, color, 'sphere')
    node.group.scale.setScalar(0.65)
    node.group.visible = false
    this.nodes.set(id, node)
    this.scene.add(node.group)
    this.advancedGroups.push(node.group)
  }

  private makePipe(
    key: string,
    from: EntityId,
    to: EntityId,
    kind: PipeBundle['kind'],
    lift: number,
    color: number
  ): PipeBundle {
    const curve = makeCurve(from, to, lift)
    const tubeGeom = new THREE.TubeGeometry(curve, 48, kind === 'admin' ? 0.035 : 0.055, 8, false)
    const tube = new THREE.Mesh(
      tubeGeom,
      new THREE.MeshStandardMaterial({
        color: COLORS.pipe,
        emissive: color,
        emissiveIntensity: 0.12,
        metalness: 0.3,
        roughness: 0.55,
        transparent: true,
        opacity: 0.75
      })
    )
    const pulse = new THREE.Mesh(
      new THREE.SphereGeometry(kind === 'admin' ? 0.06 : 0.09, 10, 10),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 })
    )
    pulse.position.copy(curve.getPoint(0))
    return { key, from, to, curve, tube, pulse, kind }
  }

  setReducedMotion(on: boolean) {
    this.reducedMotion = on
  }

  setLesson(lesson: number) {
    this.lesson = lesson
    this.targetCam = LESSON_CAMERAS[lesson] ?? LESSON_CAMERAS[0]
    this.camLerp = 0
    const focus = new Set(lessonFocusEntities(lesson))
    this.nodes.forEach((node, id) => {
      if (id === 'guarantor' || id === 'broker' || id === 'underwriter' || id === 'servicer' || id === 'custodian') return
      const mat = node.body.material as THREE.MeshStandardMaterial
      const active = focus.has(id)
      mat.opacity = active ? 1 : 0.28
      mat.transparent = !active
      node.glow.scale.setScalar(active ? 1.15 : 0.7)
    })
    this.underwritingMarkers.forEach((m) => {
      m.visible = lesson === 3
    })
  }

  setAdvancedVisible(show: boolean) {
    this.advancedGroups.forEach((g) => {
      g.visible = show
    })
    // advanced pipes
    ;(['guarantor-borrower', 'broker-vault'] as const).forEach((key) => {
      let pipe = this.pipes.find((p) => p.key === key)
      if (!pipe && show) {
        if (key === 'guarantor-borrower') {
          pipe = this.makePipe(key, 'guarantor', 'borrower', 'advanced', 0.5, COLORS.risk)
        } else {
          pipe = this.makePipe(key, 'broker', 'vault', 'advanced', 0.5, COLORS.protocol)
        }
        this.pipes.push(pipe)
        this.scene.add(pipe.tube, pipe.pulse)
      }
      if (pipe) {
        pipe.tube.visible = show
        pipe.pulse.visible = show
      }
    })
  }

  syncState(state: SimulationState) {
    this.lastState = state
    this.setAdvancedVisible(state.showAdvancedRoles)

    const fill = vaultFillRatio(state)
    const vault = this.nodes.get('vault')
    if (vault?.fill) {
      vault.fill.scale.set(1, Math.max(0.12, fill), 1)
      vault.fill.position.y = -0.45 + (Math.max(0.12, fill) * 0.85) / 2
      const mat = vault.fill.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 0.35 + utilization(state) * 0.5
    }

    const highlight = stageHighlight(state.lifecycleStage)
    this.pipes.forEach((pipe) => {
      const mat = pipe.tube.material as THREE.MeshStandardMaterial
      const active =
        highlight &&
        ((pipe.from === highlight.from && pipe.to === highlight.to) ||
          (pipe.kind === 'admin' && state.selectedEntity === 'protocol'))
      const danger = state.defaultedConnection && pipe.key === 'borrower-vault'
      mat.emissiveIntensity = danger ? 0.7 : active ? 0.45 : 0.12
      mat.emissive = new THREE.Color(danger ? COLORS.risk : (mat.emissive as THREE.Color))
      if (danger) mat.color = new THREE.Color(COLORS.risk)
      pipe.pulse.visible = !this.reducedMotion
    })

    if (state.selectedTerm === 'APR' || state.selectedTerm === 'Interest') {
      const repay = this.pipes.find((p) => p.key === 'borrower-vault')
      if (repay) {
        const mat = repay.tube.material as THREE.MeshStandardMaterial
        mat.emissive = new THREE.Color(COLORS.interest)
        mat.emissiveIntensity = 0.65
      }
    }

    this.underwritingMarkers.forEach((m, i) => {
      const mat = m.material as THREE.MeshBasicMaterial
      const on = i <= state.underwritingPhase
      mat.color = new THREE.Color(on ? COLORS.borrower : COLORS.pipeActive)
      mat.opacity = on ? 0.95 : 0.3
      m.scale.setScalar(on ? 1.4 : 1)
    })

    // Process queued animations that have not been claimed yet
    for (const anim of state.pendingAnimations) {
      if (anim.started || this.animatingIds.has(anim.id)) continue
      this.animatingIds.add(anim.id)
      this.hooks.onAnimationStart?.(anim.id)
      this.spawnTransfer(anim)
    }
  }

  private spawnTransfer(anim: AnimationRequest) {
    const pipe =
      this.pipes.find((p) => p.from === anim.from && p.to === anim.to) ??
      this.pipes.find((p) => p.key === `${anim.from}-${anim.to}`)
    const curve = pipe?.curve ?? makeCurve(anim.from, anim.to, 1)
    if (this.reducedMotion) {
      const cb = this.hooks.takeCallback?.(anim.id)
      cb?.()
      this.hooks.onAnimationComplete?.(anim.id)
      this.animatingIds.delete(anim.id)
      return
    }

    const count = Math.min(14, Math.max(3, Math.round(anim.amount / 1200)))
    const color = FLOW_COLORS[anim.kind]

    for (let i = 0; i < count; i++) {
      const geom: THREE.BufferGeometry =
        anim.kind === 'deposit' || anim.kind === 'loan' || anim.kind === 'yield'
          ? new THREE.BoxGeometry(0.16, 0.16, 0.16)
          : new THREE.SphereGeometry(anim.kind === 'interest' ? 0.1 : 0.12, 10, 10)
      const mesh = new THREE.Mesh(
        geom,
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 })
      )
      this.scene.add(mesh)
      const particle: Particle = {
        mesh,
        t: -i * 0.06,
        speed: 0.35 + (anim.kind === 'interest' ? 0.08 : 0),
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
      const parent = hits[0].object.parent
      const id = parent?.userData.entityId as EntityId | undefined
      if (id) this.hooks.onEntityClick?.(id)
    }
  }

  resize() {
    const { clientWidth: w, clientHeight: h } = this.root
    if (!w || !h) return
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
    this.renderer.setSize(w, h, false)
  }

  private start() {
    cancelAnimationFrame(this.raf)
    const loop = () => {
      if (this.disposed) return
      this.raf = requestAnimationFrame(loop)
      if (!this.visible) return
      this.tick()
    }
    this.raf = requestAnimationFrame(loop)
  }

  private tick() {
    const dt = Math.min(0.05, this.clock.getDelta())
    this.ambientPulse += dt

    // Camera lerp
    if (this.camLerp < 1) {
      this.camLerp = Math.min(1, this.camLerp + dt * (this.reducedMotion ? 4 : 1.2))
      const ease = 1 - Math.pow(1 - this.camLerp, 3)
      const from = this.camera.position
      const to = this.targetCam.position
      from.lerp(new THREE.Vector3(...to), ease * 0.15 + 0.05)
      const look = new THREE.Vector3(...this.targetCam.lookAt)
      const currentLook = new THREE.Vector3()
      this.camera.getWorldDirection(currentLook)
      const target = from.clone().add(look.clone().sub(from).normalize())
      void target
      this.camera.lookAt(look)
    }

    // Ambient node motion
    if (!this.reducedMotion) {
      this.nodes.forEach((node, id) => {
        const base = ENTITY_POSITIONS[id]
        node.group.position.y = base[1] + Math.sin(this.ambientPulse * 0.7 + base[0]) * 0.04
        node.body.rotation.y += dt * (id === 'protocol' ? 0.35 : 0.12)
        if (node.ring) node.ring.rotation.z += dt * 0.4
      })
      this.pipes.forEach((pipe, i) => {
        const t = (this.ambientPulse * 0.15 + i * 0.2) % 1
        pipe.pulse.position.copy(pipe.curve.getPoint(t))
        const mat = pipe.pulse.material as THREE.MeshBasicMaterial
        mat.opacity = 0.35 + Math.sin(this.ambientPulse * 2 + i) * 0.2
      })
    }

    // Particles
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
      p.mesh.rotation.x += dt * 2
      p.mesh.rotation.y += dt * 3
    }
    // cleanup finished
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
    pos.project(this.camera)
    const { clientWidth: w, clientHeight: h } = this.root
    if (pos.z > 1) return null
    return { x: (pos.x * 0.5 + 0.5) * w, y: (-pos.y * 0.5 + 0.5) * h }
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.raf)
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
