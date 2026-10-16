import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { paintEye, paintBeam, EYE_W, EYE_H } from './eyePainter'
import { Term, useGlossary } from './Glossary'

// names of the three frames, also used by the menu
export const EYE_STEP_TITLES = ['The eye', 'Inside the retina', 'Receptive field']
const NEXT_LABEL = ['Zoom in', 'Rotate', 'Explain']

function StepText({ step }) {
  if (step === 0)
    return (
      <p>
        Light enters through the <Term id="cornea">cornea</Term>, passes the <Term id="pupil">pupil</Term>, and is focused by
        the <Term id="lens">lens</Term> into a beam that lands on the <Term id="retina">retina</Term> at the back of the eye.
      </p>
    )
  if (step === 1)
    return (
      <p>
        Up close, the retina is a stack of cells. <Term id="photoreceptor">Photoreceptors</Term> catch the light.{' '}
        <Term id="bipolar">Bipolar cells</Term> pass the signal to <Term id="ganglion">ganglion cells</Term>, and{' '}
        <Term id="horizontal">horizontal cells</Term> let neighbouring photoreceptors influence each other.
      </p>
    )
  return (
    <p>
      Seen from above, the cells feeding one ganglion cell form a <Term id="receptivefield">receptive field</Term>: a small{' '}
      <Term id="centre">centre</Term> (amber) wrapped by a ring called the <Term id="surround">surround</Term> (blue). The two work
      against each other, which is how your eye detects <Term id="contrast">contrast</Term>. Drag to look around.
    </p>
  )
}

const R = (a, b) => a + Math.random() * (b - a)
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2)

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d'), w, h)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

const EYE_SRC = null // set to '/my-eye.jpg' to use a real photo instead of the painted eye (then adjust RET)
const RET = new THREE.Vector3(1.25, 0, 0) // fovea position in the picture, in world units

function buildEye(reg) {
  const eye = new THREE.Group()
  const plane = (tex, z, additive) => {
    const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending })
    reg(m)
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(EYE_W / 256, EYE_H / 256), m)
    mesh.position.z = z
    eye.add(mesh)
    return m
  }
  const imgMat = plane(canvasTex(EYE_W, EYE_H, paintEye), 0, false)
  if (EYE_SRC) new THREE.TextureLoader().load(EYE_SRC, (t) => { t.colorSpace = THREE.SRGBColorSpace; imgMat.map = t; imgMat.needsUpdate = true })
  plane(canvasTex(EYE_W, EYE_H, paintBeam), 0.2, true)
  return eye
}

function buildRetina() {
  const g = new THREE.Group() // local +Y = depth axis (ganglion side), light travels toward -Y
  const AMBER = 0xf5a524, BLUE = 0x4d7cff
  const P = (c, e, o = {}) => new THREE.MeshPhysicalMaterial({ color: c, emissive: c, emissiveIntensity: e, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.25, sheen: 1, sheenColor: new THREE.Color(0xffffff), ...o })
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z)
  const tube = (pts, r, mat) => g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 28, r, 8), mat))
  const lathe = (pts) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 20)

  // photoreceptor shapes: outer segment (down), inner segment, nucleus, axon + synaptic foot (up)
  const coneGeo = lathe([[0, -0.68], [0.012, -0.67], [0.03, -0.6], [0.042, -0.52], [0.046, -0.47], [0.036, -0.455], [0.058, -0.42], [0.06, -0.38], [0.044, -0.35], [0.06, -0.32], [0.05, -0.29], [0.012, -0.27], [0.01, -0.21], [0.035, -0.19], [0, -0.17]])
  const rodGeo = lathe([[0, -0.68], [0.03, -0.67], [0.031, -0.5], [0.033, -0.47], [0.026, -0.455], [0.034, -0.42], [0.036, -0.38], [0.03, -0.35], [0.044, -0.32], [0.04, -0.29], [0.008, -0.27], [0.008, -0.21], [0.022, -0.19], [0, -0.17]])
  const step = 0.17, centreLines = [], surroundLines = []
  const cMat = P(AMBER, 0.65), sMat = P(BLUE, 0.3), rMat = P(0x6c8dff, 0.25)
  let seed = 3
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  for (let j = -6; j <= 6; j++)
    for (let i = -6; i <= 6; i++) {
      const x = (i + (j % 2) * 0.5) * step + (rnd() - 0.5) * 0.02, z = j * step * 0.87 + (rnd() - 0.5) * 0.02, r = Math.hypot(x, z)
      if (r > 1) continue
      const c = r < 0.36, rod = !c && rnd() < 0.5
      const m = new THREE.Mesh(rod ? rodGeo : coneGeo, c ? cMat : rod ? rMat : sMat)
      m.position.set(x, 0, z)
      m.rotation.y = rnd() * 6
      g.add(m)
      ;(c ? centreLines : surroundLines).push(x, -0.17, z, c ? 0 : x, c ? 0.2 : -0.08, c ? 0 : z)
    }
  const lines = (pts, color) => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    g.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.7 })))
  }
  lines(centreLines, AMBER)
  lines(surroundLines, BLUE)

  // retinal pigment epithelium (cobblestone base) and tissue layers
  const rpe = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.08, 64), new THREE.MeshStandardMaterial({ color: 0x2b1812, roughness: 0.7 }))
  rpe.position.y = -0.74
  g.add(rpe)
  ;[[0.52, 0.3, 0xffb3a0], [-0.31, 0.22, 0xffd3c2]].forEach(([y, h, c]) => {
    const l = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, h, 64), new THREE.MeshPhysicalMaterial({ color: c, transparent: true, opacity: 0.1, roughness: 0.6, depthWrite: false }))
    l.position.y = y
    g.add(l)
  })

  // horizontal cell: wide flat cell with processes reaching down to the photoreceptor feet
  const hMat = P(0xff9f43, 0.35, { transparent: true, opacity: 0.55 })
  const hc = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), hMat)
  hc.scale.set(1.05, 0.035, 1.05)
  hc.position.y = -0.08
  g.add(hc)
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * 6.28, rr = 0.55 + (k % 2) * 0.3
    tube([V3(Math.cos(a) * 0.12, -0.08, Math.sin(a) * 0.12), V3(Math.cos(a) * rr * 0.6, -0.12, Math.sin(a) * rr * 0.6), V3(Math.cos(a) * rr, -0.17, Math.sin(a) * rr)], 0.008, hMat)
  }

  // bipolar cell: soma with dendrites to the centre receptors, axon up to the ganglion cell
  const bMat = P(0x10b981, 0.45)
  const bip = new THREE.Mesh(new THREE.SphereGeometry(0.15, 32, 24), bMat)
  bip.scale.y = 1.4
  bip.position.y = 0.3
  g.add(bip)
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * 6.28, rr = k ? 0.18 : 0
    tube([V3(0, 0.12, 0), V3(Math.cos(a) * rr * 0.5, 0.03, Math.sin(a) * rr * 0.5), V3(Math.cos(a) * rr, -0.15, Math.sin(a) * rr)], 0.012, bMat)
  }
  tube([V3(0, 0.45, 0), V3(0, 0.55, 0), V3(0, 0.6, 0)], 0.016, bMat)

  // ganglion cell: soma, dendritic tree, axon heading toward the optic nerve
  const gMat = P(0x8b5cf6, 0.4)
  const gan = new THREE.Mesh(new THREE.SphereGeometry(0.2, 40, 28), gMat)
  gan.position.y = 0.78
  g.add(gan)
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * 6.28 + 0.3, rr = 0.2 + (k % 3) * 0.1
    tube([V3(0, 0.62, 0), V3(Math.cos(a) * rr * 0.5, 0.58, Math.sin(a) * rr * 0.5), V3(Math.cos(a) * rr, 0.5, Math.sin(a) * rr), V3(Math.cos(a) * rr * 1.2, 0.46, Math.sin(a) * rr * 1.2)], 0.01, gMat)
  }
  tube([V3(0, 0.96, 0), V3(0.1, 1.05, 0), V3(0.6, 1.08, 0.05), V3(1.3, 1.08, 0.1)], 0.02, gMat)

  // top-down map of the receptive field with discrete boundaries
  const fm = new THREE.MeshBasicMaterial({ color: AMBER, transparent: true, opacity: 0, depthWrite: false })
  const fs = new THREE.MeshBasicMaterial({ color: BLUE, transparent: true, opacity: 0, depthWrite: false })
  const om = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
  const centre = new THREE.Mesh(new THREE.CircleGeometry(0.36, 64), fm)
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.36, 1, 96), fs)
  ;[centre, ring].forEach((m) => { m.rotation.x = -Math.PI / 2; m.position.y = 1.22; g.add(m) })
  ;[0.36, 1].forEach((r) => {
    const pts = []
    for (let i = 0; i <= 96; i++) pts.push(V3(Math.cos((i / 96) * 6.2832) * r, 1.225, Math.sin((i / 96) * 6.2832) * r))
    g.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), om))
  })
  return { group: g, fieldMats: [fm, fs], outlineMat: om }
}

// The frame is controlled by the parent (App), so the menu, the Back button and the Next button all share one source of truth.
export default function EyeScene({ step, onStep, onBack, onExplain }) {
  const mount = useRef(null)
  const api = useRef(null)
  const first = useRef(true)
  const { openTerm } = useGlossary()
  const openRef = useRef(openTerm)
  openRef.current = openTerm

  useEffect(() => {
    const el = mount.current
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.localClippingEnabled = true
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    el.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 100)
    const pmrem = new THREE.PMREMGenerator(renderer)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.add(new THREE.AmbientLight(0xffffff, 0.35))
    const sun = new THREE.DirectionalLight(0xffffff, 2)
    sun.position.set(3, 4, 6)
    const rim = new THREE.DirectionalLight(0x6f9bff, 2.5)
    rim.position.set(-4, 2, -3)
    scene.add(sun, rim)

    const eyeMats = []
    const reg = (m) => { m.userData.base = m.opacity; m.userData.t = m.transparent; eyeMats.push(m) }
    const eye = buildEye(reg)
    const { group: model, fieldMats, outlineMat } = buildRetina()
    model.position.copy(RET)
    model.visible = false
    scene.add(eye, model)

    const controls = new OrbitControls(camera, renderer.domElement)
    Object.assign(controls, { enabled: false, enableDamping: true, enablePan: false, minDistance: 0.6, maxDistance: 4, autoRotateSpeed: 1.6 })

    // labels (HTML, projected from 3D points every frame). Click one to open its explanation box.
    const mk = (text, color, local, show, term) => {
      const d = document.createElement('div')
      d.className = 'lbl' + (term ? ' link' : '')
      d.textContent = text
      d.style.borderColor = color
      if (term) d.addEventListener('click', () => openRef.current(term))
      el.appendChild(d)
      return { d, local: new THREE.Vector3(...local), show }
    }
    const labels = [
      mk('Ganglion cell', '#8b5cf6', [1.25, 0.7, 0], (s) => s === 1, 'ganglion'),
      mk('Bipolar cell', '#10b981', [-1.25, 0.3, 0], (s) => s === 1, 'bipolar'),
      mk('Horizontal cell', '#ff9f43', [1.25, -0.08, 0], (s) => s === 1, 'horizontal'),
      mk('Photoreceptors', '#f5a524', [-1.25, -0.5, 0], (s) => s === 1, 'photoreceptor'),
      mk('Centre', '#f5a524', [0, 1.22, 0], (s) => s === 2, 'centre'),
      mk('Surround', '#4d7cff', [0.75, 1.22, 0], (s) => s === 2, 'surround'),
    ]

    const Z = new THREE.Vector3(0, 0, 1), X = new THREE.Vector3(1, 0, 0)
    const qSide = new THREE.Quaternion().setFromAxisAngle(Z, Math.PI / 2)
    const qTop = new THREE.Quaternion().setFromAxisAngle(X, Math.PI / 2)
    const V = (...a) => new THREE.Vector3(...a)
    const T = [
      { pos: V(0.3, 0, 6.4), look: V(0.3, 0, 0), alpha: 1, s: 0.05, f: 0, q: qSide, dur: 2.2 },
      { pos: V(RET.x, 0.12, 1.55), look: V(RET.x, 0, 0), alpha: 0, s: 0.3, f: 0, q: qSide, dur: 2.2 },
      { pos: V(RET.x, 0.12, 2.0), look: V(RET.x, 0, 0), alpha: 0, s: 0.3, f: 1, q: qTop, dur: 2.8 },
    ]
    const cur = { pos: T[0].pos.clone(), look: T[0].look.clone(), alpha: 1, s: 0.05, f: 0, q: qSide.clone() }
    let tw = null, curStep = 0

    // go to frame n (forwards or backwards). instant = jump without animating (used when the menu opens this frame directly)
    api.current = (n, instant) => {
      curStep = n
      model.visible = true
      if (controls.enabled) {
        // leaving the free-look mode: continue the tween from wherever the camera is now
        cur.pos.copy(camera.position)
        cur.look.copy(controls.target)
        controls.enabled = false
        controls.autoRotate = false
      }
      const t = T[n]
      tw = { t0: performance.now() / 1000, p0: cur.pos.clone(), l0: cur.look.clone(), q0: cur.q.clone(), a0: cur.alpha, s0: cur.s, f0: cur.f, to: t, dur: instant ? 0 : t.dur }
    }

    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      const dist = 2.6 / (Math.tan(THREE.MathUtils.degToRad(20)) * Math.min(w / h, 1.6)) // fit the whole eye
      T[0].pos.z = dist
      if (curStep === 0 && !tw) cur.pos.copy(T[0].pos)
    }
    const ro = new ResizeObserver(resize)
    ro.observe(el)
    resize()

    const v = new THREE.Vector3()
    let raf
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const now = performance.now() / 1000
      if (tw) {
        const k = tw.dur > 0 ? Math.min(1, (now - tw.t0) / tw.dur) : 1, e = ease(k), t = tw.to
        cur.pos.lerpVectors(tw.p0, t.pos, e)
        cur.look.lerpVectors(tw.l0, t.look, e)
        cur.q.slerpQuaternions(tw.q0, t.q, e)
        cur.alpha = tw.a0 + (t.alpha - tw.a0) * e
        cur.s = tw.s0 + (t.s - tw.s0) * e
        cur.f = tw.f0 + (t.f - tw.f0) * e
        if (k >= 1) {
          tw = null
          if (curStep === 2) {
            camera.position.copy(cur.pos)
            controls.target.copy(cur.look)
            controls.enabled = true
            controls.autoRotate = true
          }
        }
      }
      if (!controls.enabled) {
        camera.position.copy(cur.pos)
        if (curStep === 0 && !tw) {
          camera.position.x += Math.sin(now * 0.4) * 0.5
          camera.position.y += Math.sin(now * 0.3) * 0.15
        }
        camera.lookAt(cur.look)
      } else controls.update()

      eye.rotation.y = Math.sin(now * 0.4) * 0.06 * cur.alpha
      eye.visible = cur.alpha > 0.01
      eyeMats.forEach((m) => { m.opacity = m.userData.base * cur.alpha; m.transparent = m.userData.t || cur.alpha < 0.999 })
      model.scale.setScalar(cur.s)
      model.quaternion.copy(cur.q)
      fieldMats.forEach((m) => (m.opacity = 0.6 * cur.f))
      outlineMat.opacity = cur.f
      model.updateMatrixWorld()

      const w = el.clientWidth, h = el.clientHeight
      labels.forEach((L) => {
        v.copy(L.local)
        model.localToWorld(v)
        v.project(camera)
        L.d.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px,${(-v.y * 0.5 + 0.5) * h}px) translate(-50%,-50%)`
        L.d.classList.toggle('on', !tw && L.show(curStep))
      })
      renderer.render(scene, camera)
    }
    loop()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      controls.dispose()
      pmrem.dispose()
      renderer.dispose()
      el.innerHTML = ''
    }
  }, [])

  // react to the frame changing (Back, Next or the menu). Opening straight on a later frame jumps there without animating.
  useEffect(() => {
    const instant = first.current
    first.current = false
    if (instant && step === 0) return
    api.current?.(step, instant)
  }, [step])

  return (
    <div className="split">
      <div className="side">
        <div className="card fade-in" key={step}>
          <nav className="stepnav" aria-label="Frames">
            {EYE_STEP_TITLES.map((title, i) => (
              <button
                key={title}
                className={'stepdot' + (i === step ? ' active' : '') + (i < step ? ' done' : '')}
                aria-current={i === step ? 'step' : undefined}
                onClick={() => onStep(i)}
              >
                <span>{i + 1}</span>
                {title}
              </button>
            ))}
          </nav>
          <StepText step={step} />
          <p className="tip">Tip: underlined words and the coloured labels are clickable.</p>
          <div className="card-actions">
            <button className="btn ghost" onClick={() => (step === 0 ? onBack() : onStep(step - 1))}>
              ← {step === 0 ? 'Edge demo' : 'Back'}
            </button>
            <button className="btn" onClick={() => (step === 2 ? onExplain() : onStep(step + 1))}>
              {NEXT_LABEL[step]}
            </button>
          </div>
        </div>
      </div>
      <div className="viewport" ref={mount} />
    </div>
  )
}
