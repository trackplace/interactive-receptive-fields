import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { buildRetina, applyRetinaHighlight, RETINA_PARTS } from './retinaModel'

// The 3D retina (same model and lights as the slide) with one cell type lit up. Drag to rotate it.
// Used on the right half of the explanation box.
export default function RetinaFigure({ part }) {
  const mount = useRef(null)
  const partRef = useRef(part)
  partRef.current = part // when another word is chosen inside the box, the glow simply moves to the new part

  useEffect(() => {
    const el = mount.current
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    el.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 50)
    const pmrem = new THREE.PMREMGenerator(renderer)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.add(new THREE.AmbientLight(0xffffff, 0.35))
    const sun = new THREE.DirectionalLight(0xffffff, 2)
    sun.position.set(3, 4, 6)
    const rim = new THREE.DirectionalLight(0x6f9bff, 2.5)
    rim.position.set(-4, 2, -3)
    scene.add(sun, rim)

    // same pose as frame 2 of the slide: scaled down and turned on its side, so the layers run left to right
    const { group, parts } = buildRetina()
    group.scale.setScalar(0.3)
    group.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2)
    scene.add(group)
    camera.position.set(0, 0.12, 1.3)

    // drag to rotate, scroll or pinch to zoom
    const controls = new OrbitControls(camera, renderer.domElement)
    Object.assign(controls, { enableDamping: true, enablePan: false, minDistance: 0.7, maxDistance: 3 })
    controls.target.set(0, 0, 0)

    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(el)
    resize()

    let raf, level = 0, last = performance.now() / 1000
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const now = performance.now() / 1000
      const dt = Math.min(0.1, now - last)
      last = now
      level += (1 - level) * Math.min(1, dt * 6) // fade the glow in
      applyRetinaHighlight(parts, partRef.current, level, now)
      controls.update()
      renderer.render(scene, camera)
    }
    loop()

    return () => {
      cancelAnimationFrame(raf)
      controls.dispose()
      ro.disconnect()
      pmrem.dispose()
      renderer.dispose()
      el.innerHTML = ''
    }
  }, [])

  const info = RETINA_PARTS[part]
  return (
    <figure className="eye-figure" onClick={(e) => e.stopPropagation()}>
      <div className="retina-stage" ref={mount} role="img" aria-label="The cell layers of the retina, drag to rotate" />
      <figcaption>
        Lit up in the retina: <strong style={{ color: info?.color }}>{info?.label || part}</strong>
        <br />
        Drag to rotate, scroll to zoom
      </figcaption>
    </figure>
  )
}