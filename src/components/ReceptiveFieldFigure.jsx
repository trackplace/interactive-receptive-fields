import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { buildRetina } from './retinaModel'

// What the picture shows for each word. `lit` = which zone glows ('centre', 'surround' or 'both'), `off` = swap the colours (OFF-center cell).
export const RF_VIEWS = {
  field: { label: 'Receptive field', lit: 'both', off: false, note: 'Amber: light excites the cell. Blue: light suppresses it.' },
  centre: { label: 'Centre', lit: 'centre', off: false, note: 'The small middle zone. In the ON-center cell it is the ON zone.' },
  surround: { label: 'Surround', lit: 'surround', off: false, note: 'The ring around the centre. In the ON-center cell it is the OFF zone.' },
  oncentre: { label: 'ON-center cell', lit: 'both', off: false, note: 'Centre = ON zone (amber, light excites). Surround = OFF zone (blue, light suppresses).' },
  offcentre: { label: 'OFF-center cell', lit: 'both', off: true, note: 'Centre = OFF zone (blue, light suppresses). Surround = ON zone (amber, light excites).' },
}

const AMBER = new THREE.Color(0xf5a524), BLUE = new THREE.Color(0x4d7cff)

// The receptive field seen from above (same model and lights as frame 3 of the slide). Drag to rotate, scroll to zoom.
// Used on the right half of the explanation box.
export default function ReceptiveFieldFigure({ view }) {
  const mount = useRef(null)
  const viewRef = useRef(view)
  viewRef.current = view // when another word is chosen inside the box, the picture simply changes

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

    // same pose as frame 3 of the slide: scaled down and seen from above
    const { group, fieldMats, outlineMat } = buildRetina()
    group.scale.setScalar(0.3)
    group.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2)
    scene.add(group)
    outlineMat.opacity = 1
    const [centreMat, surroundMat] = fieldMats
    camera.position.set(0, 0.12, 1.5)

    const controls = new OrbitControls(camera, renderer.domElement)
    Object.assign(controls, { enableDamping: true, enablePan: false, minDistance: 0.7, maxDistance: 3 })

    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(el)
    resize()

    let raf, last = performance.now() / 1000
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const now = performance.now() / 1000
      const dt = Math.min(0.1, now - last)
      last = now
      const v = RF_VIEWS[viewRef.current] || RF_VIEWS.field
      const pulse = 0.82 + 0.1 * Math.sin(now * 4)
      const goal = (zone) => (v.lit === 'both' ? 0.6 : v.lit === zone ? pulse : 0.1)
      const k = Math.min(1, dt * 8)
      centreMat.opacity += (goal('centre') - centreMat.opacity) * k
      surroundMat.opacity += (goal('surround') - surroundMat.opacity) * k
      centreMat.color.copy(v.off ? BLUE : AMBER)
      surroundMat.color.copy(v.off ? AMBER : BLUE)
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

  const info = RF_VIEWS[view] || RF_VIEWS.field
  return (
    <figure className="eye-figure" onClick={(e) => e.stopPropagation()}>
      <div className="retina-stage" ref={mount} role="img" aria-label="The receptive field seen from above, drag to rotate" />
      <figcaption>
        Shown: <strong>{info.label}</strong>
        <br />
        {info.note}
        <br />
        Drag to rotate, scroll to zoom
      </figcaption>
    </figure>
  )
}