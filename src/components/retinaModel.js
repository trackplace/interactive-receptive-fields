import * as THREE from 'three'

// The four cell types of the retina slide. `color` is the colour they light up in (all four are different).
// The ids are the same as the glossary ids, so a click can open the matching explanation.
export const RETINA_PARTS = {
  photoreceptor: { label: 'Photoreceptors', color: '#ffd84d' },
  horizontal: { label: 'Horizontal cell', color: '#ff7a45' },
  bipolar: { label: 'Bipolar cell', color: '#34d399' },
  ganglion: { label: 'Ganglion cell', color: '#a78bfa' },
}

export function buildRetina() {
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
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.7 })
    g.add(new THREE.LineSegments(geo, mat))
    return mat
  }
  const lineMats = [lines(centreLines, AMBER), lines(surroundLines, BLUE)]

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

  // which materials belong to which cell type (the lines are the feet of the photoreceptors)
  const parts = {
    photoreceptor: [cMat, sMat, rMat, ...lineMats],
    horizontal: [hMat],
    bipolar: [bMat],
    ganglion: [gMat],
  }
  // remember how every material looks normally, so the highlight can always be undone
  Object.values(parts).flat().forEach((m) => {
    m.userData.base = {
      color: m.color.clone(),
      emissive: m.emissive ? m.emissive.clone() : null,
      ei: m.emissiveIntensity ?? 0,
      opacity: m.opacity,
      transparent: m.transparent,
      depthWrite: m.depthWrite,
    }
  })
  // tag every mesh with its cell type, so the mouse can find out what it is pointing at
  g.traverse((o) => {
    if (!o.isMesh) return
    for (const [id, mats] of Object.entries(parts)) if (mats.includes(o.material)) o.userData.part = id
  })

  return { group: g, fieldMats: [fm, fs], outlineMat: om, parts }
}

// How strong the highlight is. Raise or lower these three numbers to taste.
const LIT_GLOW = 3 // how much brighter the lit cell type glows (0 = no extra glow)
const DIM_GREY = 0.85 // how far the other cells turn to dark grey-blue (0 = keep colour, 1 = fully grey)
const DIM_FADE = 0.88 // how see-through the other cells become (0 = not at all, 1 = invisible)
const GREY = new THREE.Color(0x2a3050)

// Lights up one cell type and pushes the others back.
// active = id of the lit cell type (or null), level = 0..1 (how strongly), t = time in seconds (for the pulse).
export function applyRetinaHighlight(parts, active, level, t) {
  Object.entries(parts).forEach(([id, mats]) => {
    const lit = id === active
    const col = new THREE.Color(RETINA_PARTS[id].color)
    const on = level > 0.01
    mats.forEach((m) => {
      const b = m.userData.base
      if (lit) {
        // the lit cells: pure highlight colour, bright, pulsing, fully solid
        m.color.copy(b.color).lerp(col, level)
        if (m.emissive) {
          m.emissive.copy(b.emissive).lerp(col, level)
          m.emissiveIntensity = b.ei + level * (LIT_GLOW + 0.7 * Math.sin(t * 5))
        }
        m.opacity = b.opacity + (1 - b.opacity) * level
      } else {
        // all other cells: dark, grey and almost see-through
        m.color.copy(b.color).lerp(GREY, DIM_GREY * level)
        if (m.emissive) m.emissiveIntensity = b.ei * (1 - 0.9 * level)
        m.opacity = b.opacity * (1 - DIM_FADE * level)
      }
      m.transparent = b.transparent || (on && !lit) || m.opacity < 0.999
      m.depthWrite = b.depthWrite && !(on && !lit)
    })
  })
}