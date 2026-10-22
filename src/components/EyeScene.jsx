import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { paintEye, paintBeam, paintHighlight, EYE_PARTS, EYE_W, EYE_H } from './eyePainter'
import { buildRetina, applyRetinaHighlight, RETINA_PARTS } from './retinaModel'
import { Term, useGlossary } from './Glossary'

// names of the three frames, also used by the menu
export const EYE_STEP_TITLES = ['The eye', 'Inside the retina', 'Receptive field']
const NEXT_LABEL = ['Zoom in', 'Rotate', 'Explain']

function StepText({ step }) {
  if (step === 0)
    return (
      <>
        <h2>How light travels through your eye</h2>

        <p>
          Your eye works like a camera, and its first job is to bend light into a sharp image. This bending is called{' '}
          <Term id="refraction">refraction</Term>. The journey begins at the <Term id="cornea">cornea</Term>, the clear window at the
          front of the eye, which does most of the bending. The light then slips through the <Term id="pupil">pupil</Term>, an opening
          that widens and narrows with the brightness, and reaches the <Term id="lens">lens</Term>, which fine-tunes the focus.
        </p>

        <p>
          The focused light finally lands on the <Term id="retina">retina</Term> at the back of the eye, where it is turned into
          electrical signals. These signals are already processed there, and then travel along the <Term id="opticnerve">optic nerve</Term> to
          the brain.
        </p>
      </>
    )
  if (step === 1)
    return (
      <>
        <h2>How signals move through the retina</h2>
        <p>
          Up close, the retina is a stack of cells. Light first passes through the see-through ganglion and bipolar layers and is
          caught at the very back by the <Term id="photoreceptor">photoreceptors</Term>, which turn it into an electrical signal.{' '}
          <Term id="bipolar">Bipolar cells</Term> pass that signal forward to <Term id="ganglion">ganglion cells</Term>, which send
          it to the brain as spikes. <Term id="horizontal">Horizontal cells</Term> let neighbouring photoreceptors influence each other.
        </p>
        <p>
          That sideways link is the key: each spot of the retina is compared with its surroundings before anything leaves the eye.
        </p>
      </>
    )
  return (
    <>
      <h2>How the receptive field detects contrast</h2>
      <p>
        Seen from above, the cells feeding one ganglion cell form its <Term id="receptivefield">receptive field</Term>: a small{' '}
        <Term id="centre">centre</Term> (amber) inside a ring, the <Term id="surround">surround</Term> (blue). This is the{' '}
        <Term id="oncentre">ON-center cell</Term> our whole model is about. Its centre is the <strong>ON zone</strong>: light
        there excites the cell. Its surround is the <strong>OFF zone</strong>: light there suppresses it.
      </p>
      <p>
        The two zones are <em>antagonistic</em>: they work against each other. Light that covers both equally cancels out and the
        cell hardly reacts. Only when they get different light, as at an edge, does one zone win. That is how the cell detects{' '}
        <Term id="contrast">contrast</Term> instead of brightness.
      </p>
      <p>
        The <Term id="offcentre">OFF-center cell</Term> is the mirror image: its centre is the OFF zone and its surround is the ON zone.
      </p>
    </>
  )
}

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

// Turns the painted highlight into: part at full brightness + crisp outline + soft outer glow.
// Works from the alpha of whatever paintHighlight draws, so it needs no changes in eyePainter.
let eyeCanvas = null
function makeHighlightCanvas(part) {
  const w = EYE_W, h = EYE_H
  const mk = () => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c }

  const src = mk()
  paintHighlight(src.getContext('2d'), part)

  // hard silhouette of the part (alpha thresholded)
  const img = src.getContext('2d').getImageData(0, 0, w, h)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) { const on = d[i + 3] > 60; d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = on ? 255 : 0 }
  const mask = mk()
  mask.getContext('2d').putImageData(img, 0, 0)

  // the real eye picture, cut out to the part, so the part keeps full brightness
  if (!eyeCanvas) { eyeCanvas = mk(); paintEye(eyeCanvas.getContext('2d'), w, h) }
  const cut = mk(), cx = cut.getContext('2d')
  cx.drawImage(eyeCanvas, 0, 0)
  cx.globalCompositeOperation = 'destination-in'
  cx.drawImage(mask, 0, 0)

  // outline: the silhouette grown by a few px, minus the silhouette itself
  const ring = mk(), rx = ring.getContext('2d'), R = Math.max(2, w / 350)
  for (let a = 0; a < 16; a++) rx.drawImage(mask, Math.cos((a / 16) * Math.PI * 2) * R, Math.sin((a / 16) * Math.PI * 2) * R)
  rx.globalCompositeOperation = 'destination-out'
  rx.drawImage(mask, 0, 0)

  const out = mk(), ox = out.getContext('2d')
  ox.shadowColor = 'rgba(56, 186, 30, 0.95)'
  ox.shadowBlur = w / 40
  ox.drawImage(ring, 0, 0); ox.drawImage(ring, 0, 0) // outer glow (twice = stronger)
  ox.shadowBlur = 0
  ox.drawImage(cut, 0, 0)
  ox.globalAlpha = 0.45 // keep a little of the original tint on top
  ox.drawImage(src, 0, 0)
  ox.globalAlpha = 1
  ox.drawImage(ring, 0, 0) // crisp outline on top
  return out
}

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

  // the glow that lights up one part of the eye (its picture is swapped when another part is chosen).
  // toneMapped: false keeps the highlight at full brightness instead of being dulled by the renderer's tone mapping
  const hlMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, toneMapped: false })
  const hlMesh = new THREE.Mesh(new THREE.PlaneGeometry(EYE_W / 256, EYE_H / 256), hlMat)
  hlMesh.position.z = 0.1
  eye.add(hlMesh)

  plane(canvasTex(EYE_W, EYE_H, paintBeam), 0.2, true)
  return { eye, imgMat, hlMat }
}

// The frame is controlled by the parent (App), so the menu, the Back button and the Next button all share one source of truth.
export default function EyeScene({ step, onStep, onBack, onExplain }) {
  const mount = useRef(null)
  const api = useRef(null)
  const first = useRef(true)
  const { openTerm, hoverPart, setHoverPart } = useGlossary()
  const openRef = useRef(openTerm)
  openRef.current = openTerm
  const setHoverRef = useRef(setHoverPart)
  setHoverRef.current = setHoverPart
  // the part the mouse is pointing at (via a word, a label or the picture itself).
  // Frame 1 lights up parts of the eye, frame 2 lights up the cells of the retina.
  const eyeHoverRef = useRef(null)
  const retinaHoverRef = useRef(null)
  eyeHoverRef.current = step === 0 && EYE_PARTS[hoverPart] ? hoverPart : null
  retinaHoverRef.current = step === 1 && RETINA_PARTS[hoverPart] ? hoverPart : null

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
    const { eye, imgMat, hlMat } = buildEye(reg)
    const { group: model, fieldMats, outlineMat, parts } = buildRetina()
    model.position.copy(RET)
    model.visible = false
    scene.add(eye, model)

    const controls = new OrbitControls(camera, renderer.domElement)
    Object.assign(controls, { enabled: false, enableDamping: true, enablePan: false, minDistance: 0.6, maxDistance: 4 })

    // labels (HTML, projected from 3D points every frame). Hover = light up that cell type, click = explanation box.
    const mk = (text, color, local, show, term) => {
      const d = document.createElement('div')
      d.className = 'lbl' + (term ? ' link' : '')
      d.textContent = text
      d.style.borderColor = color
      if (term) {
        d.addEventListener('click', () => openRef.current(term))
        if (RETINA_PARTS[term]) {
          d.addEventListener('mouseenter', () => setHoverRef.current(term))
          d.addEventListener('mouseleave', () => setHoverRef.current(null))
        }
      }
      el.appendChild(d)
      return { d, local: new THREE.Vector3(...local), show }
    }
    const labels = [
      mk('Ganglion cell', RETINA_PARTS.ganglion.color, [1.25, 0.7, 0], (s) => s === 1, 'ganglion'),
      mk('Bipolar cell', RETINA_PARTS.bipolar.color, [-1.25, 0.3, 0], (s) => s === 1, 'bipolar'),
      mk('Horizontal cell', RETINA_PARTS.horizontal.color, [1.25, -0.08, 0], (s) => s === 1, 'horizontal'),
      mk('Photoreceptors', RETINA_PARTS.photoreceptor.color, [-1.25, -0.5, 0], (s) => s === 1, 'photoreceptor'),
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

    // point at the cells themselves (frame 2): find the cell type under the mouse
    const ray = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    const canvas = renderer.domElement
    let pointed = null
    let downAt = null // where the mouse went down, to tell a click from a drag (rotating)
    const pick = (e) => {
      const r = canvas.getBoundingClientRect()
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      ray.setFromCamera(ndc, camera)
      const hit = ray.intersectObjects(model.children, false).find((h) => h.object.userData.part)
      return hit ? hit.object.userData.part : null
    }
    const onDown = (e) => { downAt = { x: e.clientX, y: e.clientY } }
    const onMove = (e) => {
      if (curStep !== 1 || tw || e.buttons) return // not while dragging
      const id = pick(e)
      canvas.style.cursor = id ? 'pointer' : ''
      if (id !== pointed) { pointed = id; setHoverRef.current(id) }
    }
    const onLeave = () => {
      if (pointed) { pointed = null; setHoverRef.current(null) }
    }
    const onClick = (e) => {
      if (curStep !== 1 || tw) return
      if (downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 5) return // it was a drag, not a click
      const id = pick(e)
      if (id) openRef.current(id)
    }
    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerleave', onLeave)
    canvas.addEventListener('click', onClick)

    // highlight of the eye: one picture per part (part at full brightness + outline + glow), made the first time it is needed
    const hlTex = {}
    const texFor = (part) => (hlTex[part] ||= canvasTex(EYE_W, EYE_H, (g) => g.drawImage(makeHighlightCanvas(part), 0, 0)))
    const warm = Object.keys(EYE_PARTS).map((part, i) => setTimeout(() => texFor(part), 600 + i * 120))
    const hl = { level: 0, shown: null }
    // highlight of the retina cells
    const rl = { level: 0, shown: null, applied: false }

    const v = new THREE.Vector3()
    let raf, last = performance.now() / 1000
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const now = performance.now() / 1000
      const dt = Math.min(0.1, now - last)
      last = now

      // eye: fade the highlight in and out, and dim the rest of the eye (slightly cool) so the lit part stands out
      const want = eyeHoverRef.current
      if (want && want !== hl.shown) {
        hl.shown = want
        hlMat.map = texFor(want)
        hlMat.needsUpdate = true
      }
      hl.level += ((want ? 1 : 0) - hl.level) * Math.min(1, dt * 9)
      imgMat.color.setRGB(1 - 0.72 * hl.level, 1 - 0.68 * hl.level, 1 - 0.52 * hl.level)
      hlMat.opacity = hl.level * (0.94 + 0.06 * Math.sin(now * 4)) * cur.alpha
      hlMat.visible = hl.level > 0.01 && cur.alpha > 0.01

      // retina: light up one cell type, fade the others back
      const wantR = retinaHoverRef.current
      if (wantR) rl.shown = wantR
      rl.level += ((wantR ? 1 : 0) - rl.level) * Math.min(1, dt * 9)
      const lit = rl.level > 0.005
      if (lit || rl.applied) applyRetinaHighlight(parts, rl.shown, lit ? rl.level : 0, now)
      rl.applied = lit

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
          // frames 2 and 3 can be rotated by dragging (nothing turns by itself)
          if (curStep === 1 || curStep === 2) {
            camera.position.copy(cur.pos)
            controls.target.copy(cur.look)
            controls.enabled = true
            controls.minDistance = 0.6
            controls.maxDistance = curStep === 1 ? 3.5 : 4
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
      warm.forEach(clearTimeout)
      Object.values(hlTex).forEach((t) => t.dispose())
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerleave', onLeave)
      canvas.removeEventListener('click', onClick)
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
          <p className="tip">
            {step === 0
              ? 'Tip: hover over an underlined word and that part of the eye lights up. Click the word for a full explanation.'
              : step === 1
                ? 'Tip: hover over an underlined word, a coloured label or a cell in the picture to light it up, and click for a full explanation. Drag to rotate the retina.'
                : 'Tip: drag to rotate, scroll to zoom. Underlined words and the coloured labels are clickable.'}
          </p>
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
