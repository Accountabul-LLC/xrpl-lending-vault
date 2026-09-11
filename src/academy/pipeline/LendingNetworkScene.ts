import * as THREE from 'three'
import {
  createAmountSprite,
  createCoin,
  createContractStand,
  createDocument,
  createGround,
  createOffice,
  createPerson,
  createVault,
  disposeObject3D
} from '../experience/figures'
import { ADVANCED_ROLES } from '../experience/story'
import type { AnimationRequest, EntityId, SimulationState } from '../simulation/types'
import {
  cameraForStep,
  COLORS,
  ENTITY_POSITIONS,
  FLOW_COLORS,
  lessonFocusEntities,
  vaultFillRatio,
  type CameraPreset
} from './theme'

type Actor = {
  group: THREE.Group
  fill?: THREE.Mesh
}

type Particle = {
  mesh: THREE.Object3D
  t: number
  speed: number
  from: THREE.Vector3
  to: THREE.Vector3
  lift: number
  onComplete?: () => void
  done: boolean
}

const ADVANCED_ORDER: EntityId[] = ADVANCED_ROLES.map((r) => r.id)

function arcPoint(from: THREE.Vector3, to: THREE.Vector3, t: number, lift: number): THREE.Vector3 {
  const p = from.clone().lerp(to, t)
  p.y += Math.sin(t * Math.PI) * lift
  return p
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
  private actors = new Map<EntityId, Actor>()
  private particles: Particle[] = []
  private timer = new THREE.Timer()
  private raf = 0
  private disposed = false
  private reducedMotion = false
  private visible = true
  private lesson = 0
  private targetCam: CameraPreset = cameraForStep(1, 0)
  private camLerp = 1
  private raycaster = new THREE.Raycaster()
  private pointer = new THREE.Vector2()
  private hooks: SceneHooks
  private pulse = 0
  private animatingIds = new Set<string>()
  private root: HTMLElement
  private onResize: () => void
  private onPointer: (e: PointerEvent) => void
  private onVisibility: () => void
  private resizeObserver: ResizeObserver | null = null
  private rulesBoard: THREE.Group
  private focus = new Set<EntityId>()

  constructor(root: HTMLElement, hooks: SceneHooks = {}) {
    this.root = root
    this.hooks = hooks

    this.scene = new THREE.Scene()
    this.scene.fog = new THREE.Fog(COLORS.bg, 18, 32)

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80)
    this.camera.position.set(...this.targetCam.position)
    this.camera.lookAt(...this.targetCam.lookAt)

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
    this.renderer.setPixelRatio(this.pixelRatio())
    root.appendChild(this.renderer.domElement)
    const canvas = this.renderer.domElement
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.maxWidth = '100%'
    canvas.style.maxHeight = '100%'
    canvas.style.display = 'block'
    canvas.style.touchAction = 'manipulation'

    const amb = new THREE.AmbientLight(0xb6c2d9, 0.7)
    const key = new THREE.DirectionalLight(0xffffff, 0.95)
    key.position.set(4, 10, 6)
    const rim = new THREE.DirectionalLight(0x818cf8, 0.28)
    rim.position.set(-6, 4, -4)
    this.scene.add(amb, key, rim)
    this.scene.add(createGround())

    this.addActor('protocol', createOffice(), 'Protocol Office', '#c7d2fe', 2.35)
    this.addActor(
      'administrator',
      createPerson({ clothing: COLORS.administrator, hair: 0x334155, hold: 'clipboard' }),
      'Administrator',
      '#c7d2fe'
    )
    const vault = createVault()
    vault.scale.setScalar(1.12)
    this.addActor('vault', vault, 'Lending Vault', '#7dd3fc', 2.35)
    this.actors.get('vault')!.fill = vault.userData.fill as THREE.Mesh
    this.addActor(
      'depositor',
      createPerson({ clothing: COLORS.depositor, hair: 0x1c1917, hold: 'coins' }),
      'Depositor / Lender',
      '#6ee7b7'
    )
    this.addActor(
      'borrower',
      createPerson({ clothing: COLORS.borrower, hair: 0x78350f, hold: 'document' }),
      'Borrower',
      '#fcd34d'
    )
    this.addActor('agreement', createContractStand(), 'Repayment Agreement', '#fde68a', 2.15)

    this.addActor(
      'originator',
      createPerson({ clothing: 0x38bdf8, hair: 0x0f172a, hold: 'document' }),
      'Loan Originator',
      '#7dd3fc'
    )
    this.addActor(
      'underwriter',
      createPerson({ clothing: 0x22d3ee, hair: 0x44403c, hold: 'clipboard' }),
      'Underwriter',
      '#67e8f9'
    )
    this.addActor(
      'broker',
      createPerson({ clothing: 0xa78bfa, hair: 0x1e1b4b, hold: 'clipboard' }),
      'Loan Broker',
      '#c4b5fd'
    )
    this.addActor('guarantor', createPerson({ clothing: 0xfb923c, hair: 0x7c2d12 }), 'Guarantor', '#fdba74')
    this.addActor(
      'custodian',
      createPerson({ clothing: 0x94a3b8, hair: 0x334155, hold: 'coins' }),
      'Collateral Custodian',
      '#cbd5e1'
    )
    this.addActor('servicer', createPerson({ clothing: 0xe879f9, hair: 0x4a044e }), 'Loan Servicer', '#f0abfc')
    ADVANCED_ORDER.forEach((id) => {
      const actor = this.actors.get(id)
      if (actor) actor.group.visible = false
    })

    this.rulesBoard = this.makeRulesBoard()
    this.scene.add(this.rulesBoard)

    this.onResize = () => this.resize()
    this.onPointer = (e) => this.handlePointer(e)
    this.onVisibility = () => {
      this.visible = document.visibilityState === 'visible'
      if (this.visible && !this.disposed) this.start()
    }
    window.addEventListener('resize', this.onResize)
    canvas.addEventListener('pointerdown', this.onPointer)
    document.addEventListener('visibilitychange', this.onVisibility)
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.resize())
      this.resizeObserver.observe(root)
    }
    this.resize()
    this.start()
  }

  private pixelRatio() {
    const dpr = window.devicePixelRatio || 1
    const small = this.root.clientWidth > 0 && this.root.clientWidth < 700
    return Math.min(dpr, small ? 1.25 : 1.5)
  }

  private addActor(id: EntityId, mesh: THREE.Group, _label: string, _tint: string, _labelY?: number) {
    const group = new THREE.Group()
    group.position.set(...ENTITY_POSITIONS[id])
    group.userData.entityId = id
    mesh.userData.entityId = id
    group.add(mesh)
    if (id === 'depositor') mesh.rotation.y = Math.PI / 2
    if (id === 'borrower') mesh.rotation.y = -Math.PI / 2
    if (id === 'administrator') mesh.rotation.y = 0.45
    this.scene.add(group)
    this.actors.set(id, { group })
  }

  private makeRulesBoard(): THREE.Group {
    const g = new THREE.Group()
    g.position.set(-1.55, 1.45, -2.85)
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.95, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x1e1b4b, metalness: 0.2, roughness: 0.5 })
    )
    g.add(board)
    return g
  }

  setReducedMotion(on: boolean) {
    this.reducedMotion = on
  }

  setLesson(lesson: number) {
    this.lesson = lesson
    this.focus = new Set(lessonFocusEntities(lesson))
    this.clearTransfers()
  }

  private clearTransfers() {
    this.particles.forEach((p) => {
      this.scene.remove(p.mesh)
      disposeObject3D(p.mesh)
    })
    this.particles = []
    this.animatingIds.clear()
  }

  setAdvancedVisible(show: boolean) {
    ADVANCED_ORDER.forEach((id) => {
      const actor = this.actors.get(id)
      if (actor) actor.group.visible = show
    })
  }

  syncState(state: SimulationState) {
    const cam = cameraForStep(state.currentStep, this.lesson)
    if (
      cam.position[0] !== this.targetCam.position[0] ||
      cam.position[2] !== this.targetCam.position[2]
    ) {
      this.targetCam = cam
      this.camLerp = 0
    }

    const stepFocus = new Set(
      (this.lesson >= 0
        ? (['administrator', 'protocol', 'vault', 'depositor', 'borrower', 'agreement'] as EntityId[])
        : []) 
    )
    const highlight = new Set(lessonFocusEntities(this.lesson))
    if (state.currentStep) {
      const fromStory = (
        [
          [],
          ['administrator', 'protocol'],
          ['administrator', 'vault', 'protocol'],
          ['depositor', 'vault'],
          ['vault'],
          ['borrower', 'vault'],
          ['administrator', 'protocol', 'borrower', 'vault'],
          ['vault', 'borrower'],
          ['borrower', 'agreement', 'vault'],
          ['borrower', 'vault'],
          ['depositor', 'vault']
        ] as EntityId[][]
      )[state.currentStep]
      fromStory?.forEach((id) => highlight.add(id))
    }
    this.focus = highlight

    this.actors.forEach((actor, id) => {
      const isAdvanced = ADVANCED_ORDER.includes(id)
      if (isAdvanced) {
        const idx = ADVANCED_ORDER.indexOf(id)
        actor.group.visible = state.advancedReveal > idx
        return
      }
      if (id === 'agreement') {
        actor.group.visible = state.agreementAccepted || state.currentStep === 8
        return
      }
      actor.group.visible = true
      const active = highlight.has(id) || state.selectedEntity === id
      actor.group.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
          obj.material.transparent = !active
          obj.material.opacity = active ? 1 : 0.78
        }
        if ((obj as THREE.Sprite).isSprite) {
          ;(obj as THREE.Sprite).material.opacity = active ? 1 : 0.7
        }
      })
    })

    const vaultActor = this.actors.get('vault')
    if (vaultActor) {
      vaultActor.group.visible = true
      const ghost = !state.vault.configured
      vaultActor.group.scale.setScalar(ghost ? 0.92 : 1)
      const fill = vaultActor.fill
      if (fill) {
        const ratio = Math.max(0.08, vaultFillRatio(state))
        fill.scale.set(1, ghost ? 0.08 : ratio, 1)
        fill.position.y = 0.45 + ((ghost ? 0.08 : ratio) * 1.05) / 2 - 0.52
        const mat = fill.material as THREE.MeshStandardMaterial
        mat.emissiveIntensity = 0.25 + ratio * 0.5
        fill.visible = state.vault.totalCapital > 0
      }
    }

    this.rulesBoard.visible = state.currentStep <= 2 || !state.vault.configured

    ADVANCED_ORDER.forEach((id, idx) => {
      const actor = this.actors.get(id)
      if (actor) actor.group.visible = state.advancedReveal > idx
    })

    for (const anim of state.pendingAnimations) {
      if (anim.started || this.animatingIds.has(anim.id)) continue
      this.animatingIds.add(anim.id)
      this.hooks.onAnimationStart?.(anim.id)
      this.spawnTransfer(anim)
    }
    void stepFocus
  }

  private spawnTransfer(anim: AnimationRequest) {
    const from = new THREE.Vector3(...ENTITY_POSITIONS[anim.from]).setY(1.15)
    const to = new THREE.Vector3(...ENTITY_POSITIONS[anim.to]).setY(1.15)
    if (this.reducedMotion) {
      const cb = this.hooks.takeCallback?.(anim.id)
      cb?.()
      this.hooks.onAnimationComplete?.(anim.id)
      this.animatingIds.delete(anim.id)
      return
    }

    const color = FLOW_COLORS[anim.kind]
    const count =
      anim.kind === 'request' ? 1 : Math.min(8, Math.max(3, Math.round(Math.abs(anim.amount) / 20000) + 3))
    const lift = anim.kind === 'interest' ? 1.35 : anim.kind === 'principal' ? 0.7 : 1.05

    for (let i = 0; i < count; i++) {
      const packet = new THREE.Group()
      if (anim.kind === 'request') {
        packet.add(createDocument(0.85))
      } else {
        const coin = createCoin(color, anim.kind === 'interest' ? 0.13 : 0.15)
        coin.rotation.set(Math.PI / 2, 0, 0)
        packet.add(coin)
      }
      if (i === 0 && anim.label) {
        const tag = createAmountSprite(
          anim.label,
          anim.kind === 'interest' ? '#d8b4fe' : anim.kind === 'principal' ? '#fde68a' : '#a7f3d0'
        )
        tag.position.y = 0.42
        packet.add(tag)
      }
      this.scene.add(packet)
      this.particles.push({
        mesh: packet,
        t: -i * 0.08,
        speed: anim.kind === 'interest' ? 0.42 : 0.36,
        from: from.clone(),
        to: to.clone(),
        lift,
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
      })
    }
  }

  private handlePointer(e: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const meshes: THREE.Object3D[] = []
    this.actors.forEach((actor) => {
      if (!actor.group.visible) return
      actor.group.traverse((o) => {
        if (o instanceof THREE.Mesh) meshes.push(o)
      })
    })
    const hits = this.raycaster.intersectObjects(meshes, false)
    if (!hits[0]) return
    let obj: THREE.Object3D | null = hits[0].object
    while (obj) {
      const id = obj.userData.entityId as EntityId | undefined
      if (id) {
        this.hooks.onEntityClick?.(id)
        return
      }
      obj = obj.parent
    }
  }

  resize() {
    const { clientWidth: w, clientHeight: h } = this.root
    if (!w || !h) return
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setPixelRatio(this.pixelRatio())
    this.renderer.setSize(w, h, false)
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
    this.pulse += dt

    if (this.camLerp < 1) {
      this.camLerp = Math.min(1, this.camLerp + dt * (this.reducedMotion ? 4 : 1.15))
    }
    const ease = 1 - Math.pow(1 - Math.min(1, this.camLerp), 3)
    this.camera.position.lerp(this.framedPosition(), 0.1 + ease * 0.14)
    this.camera.lookAt(...this.targetCam.lookAt)

    if (!this.reducedMotion) {
      this.actors.forEach((actor, id) => {
        if (!actor.group.visible) return
        const base = ENTITY_POSITIONS[id]
        if (id === 'vault' || id === 'protocol' || id === 'agreement') return
        actor.group.position.y = base[1] + Math.sin(this.pulse * 1.4 + base[0]) * 0.025
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
      p.mesh.position.copy(arcPoint(p.from, p.to, p.t, p.lift))
      p.mesh.rotation.y += dt * 2.2
    }
    if (this.particles.length > 24) {
      this.particles = this.particles.filter((p) => {
        if (p.done) {
          this.scene.remove(p.mesh)
          disposeObject3D(p.mesh)
          return false
        }
        return true
      })
    }

    this.renderer.render(this.scene, this.camera)
  }

  private framedPosition(): THREE.Vector3 {
    const look = new THREE.Vector3(...this.targetCam.lookAt)
    const pos = new THREE.Vector3(...this.targetCam.position)
    const w = this.root.clientWidth
    if (w > 0 && w < 700) {
      const dir = pos.clone().sub(look)
      if (dir.lengthSq() < 0.01) dir.set(0.2, 2.4, 8)
      dir.multiplyScalar(1.7)
      pos.copy(look).add(dir)
      pos.y = Math.max(pos.y, 3.15)
      if (Math.abs(pos.z) < 11) pos.z = Math.sign(pos.z || 1) * 11
    }
    return pos
  }

  projectEntity(id: EntityId): { x: number; y: number } | null {
    const pos = new THREE.Vector3(...ENTITY_POSITIONS[id])
    pos.y += id === 'vault' || id === 'protocol' ? 2.15 : 2.35
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
      disposeObject3D(p.mesh)
    })
    disposeObject3D(this.scene)
    this.renderer.dispose()
    if (this.renderer.domElement.parentElement === this.root) {
      this.root.removeChild(this.renderer.domElement)
    }
  }
}
