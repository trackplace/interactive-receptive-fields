// Procedurally paints a realistic sagittal cross-section of the human eye (cornea on the left).
// Canvas is 2048x1280. The fovea sits at (1344, 640) on the canvas.
const R = (a, b) => a + Math.random() * (b - a)
const rad = (d) => (d * Math.PI) / 180
export const EYE_W = 2048
export const EYE_H = 1280

export function paintEye(g) {
  const C = { x: 1000, y: 640 }
  const pt = (deg, r) => [C.x + Math.cos(rad(deg)) * r, C.y + Math.sin(rad(deg)) * r]
  const arc = (r, a0, a1, lw, style) => {
    g.beginPath(); g.arc(C.x, C.y, r, rad(a0), rad(a1)); g.lineWidth = lw; g.strokeStyle = style; g.lineCap = 'butt'; g.stroke()
  }
  const poly = (pts, fill, stroke, lw = 3) => {
    g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath()
    if (fill) { g.fillStyle = fill; g.fill() }
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.lineJoin = 'round'; g.stroke() }
  }
  const mirror = (pts) => pts.map(([x, y]) => [x, 1280 - y])
  g.clearRect(0, 0, EYE_W, EYE_H)

  // ---- orbital fat ----
  const fg = g.createRadialGradient(1100, 640, 50, 1100, 640, 900)
  fg.addColorStop(0, 'rgba(238,204,130,0.95)'); fg.addColorStop(0.7, 'rgba(214,162,90,0.8)'); fg.addColorStop(1, 'rgba(200,140,80,0)')
  g.save(); g.translate(1100, 640); g.scale(1, 0.68); g.translate(-1100, -640)
  g.fillStyle = fg; g.beginPath(); g.arc(1100, 640, 900, 0, 7); g.fill(); g.restore()
  for (let i = 0; i < 1100; i++) {
    const x = R(250, 1950), y = R(150, 1130), d = Math.hypot((x - 1100) / 900, (y - 640) / 612)
    if (d > 1) continue
    const a = (1 - d) * R(0.05, 0.17)
    g.fillStyle = Math.random() < 0.55 ? `rgba(255,236,176,${a})` : `rgba(165,100,50,${a})`
    g.beginPath(); g.arc(x, y, R(8, 38), 0, 7); g.fill()
  }

  // ---- extraocular muscles ----
  const muscle = (s) => {
    const lo = [], up = []
    for (let a = 125; a >= 35; a -= 5) { lo.push(pt(s * a, 386)); up.push(pt(s * a, 386 + 38 + (125 - a) * 0.38)) }
    const tl = [1860, 640 + s * 300], tu = [1860, 640 + s * 400]
    const outline = [...lo, tl, tu, ...up.slice().reverse()]
    const mg = g.createLinearGradient(700, 0, 1860, 0)
    mg.addColorStop(0, '#8e2f2b'); mg.addColorStop(1, '#bb4a3d')
    poly(outline, mg, '#5c1716', 4)
    g.save(); g.beginPath(); outline.forEach((p, i) => (i ? g.lineTo(...p) : g.moveTo(...p))); g.clip()
    for (let k = 1; k < 46; k++) {
      const t = k / 46
      g.beginPath()
      lo.forEach((p, i) => { const q = [p[0] + (up[i][0] - p[0]) * t, p[1] + (up[i][1] - p[1]) * t]; i ? g.lineTo(...q) : g.moveTo(...q) })
      g.lineTo(tl[0] + (tu[0] - tl[0]) * t, tl[1] + (tu[1] - tl[1]) * t)
      g.strokeStyle = k % 2 ? 'rgba(255,175,155,0.16)' : 'rgba(60,10,10,0.16)'; g.lineWidth = R(1, 3); g.stroke()
    }
    g.restore()
  }
  muscle(-1); muscle(1)

  // ---- optic nerve ----
  poly([[1340, 640], [1780, 650], [1810, 800], [1385, 770]], '#e9dccb', '#a89a88', 3)
  poly([[1362, 668], [1790, 685], [1796, 775], [1395, 742]], '#ecd0c6', null)
  for (let i = 0; i < 40; i++) {
    const t = i / 40
    g.beginPath(); g.moveTo(1370, 672 + t * 68); g.lineTo(1795, 688 + t * 86)
    g.strokeStyle = i % 2 ? 'rgba(255,255,255,0.35)' : 'rgba(150,100,100,0.25)'; g.lineWidth = 2; g.stroke()
  }

  // ---- vitreous ----
  g.save(); g.beginPath(); g.arc(C.x, C.y, 346, 0, 7); g.clip()
  const vg = g.createRadialGradient(1010, 620, 20, 1010, 640, 346)
  vg.addColorStop(0, 'rgba(218,234,242,0.95)'); vg.addColorStop(0.75, 'rgba(226,230,236,0.95)'); vg.addColorStop(1, 'rgba(236,206,200,0.95)')
  g.fillStyle = vg; g.fillRect(600, 250, 800, 800)
  g.lineWidth = 1.2
  for (let i = 0; i < 90; i++) {
    const x = R(700, 1300), y = R(340, 940)
    g.strokeStyle = `rgba(255,255,255,${R(0.1, 0.3)})`
    g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + R(-60, 60), y + R(-80, 80), x + R(-60, 60), y + R(-80, 80), x + R(-90, 90), y + R(-120, 120)); g.stroke()
  }
  g.restore()

  // ---- aqueous humour (anterior chamber) ----
  g.beginPath()
  g.arc(891.6, 640, 297.6, rad(132.9), rad(227.1))
  g.arc(C.x, C.y, 350, rad(215), rad(145), true)
  g.closePath(); g.fillStyle = 'rgba(206,228,240,0.6)'; g.fill()

  // ---- lens + zonules ----
  g.strokeStyle = 'rgba(245,245,240,0.55)'; g.lineWidth = 1.3
  for (let s of [-1, 1])
    for (let i = 0; i < 14; i++) {
      const y0 = 640 + s * (205 + R(-12, 8)), y1 = 640 + s * (140 + R(-8, 6))
      g.beginPath(); g.moveTo(760 + R(0, 50), y0); g.lineTo(845 + R(-8, 12), y1 + s * 10); g.stroke()
    }
  const lg = g.createRadialGradient(850, 640, 10, 853, 640, 150)
  lg.addColorStop(0, 'rgba(244,224,176,0.95)'); lg.addColorStop(0.6, 'rgba(226,226,206,0.85)'); lg.addColorStop(1, 'rgba(205,224,232,0.7)')
  g.beginPath(); g.ellipse(853, 640, 63, 150, 0, 0, 7); g.fillStyle = lg; g.fill()
  g.strokeStyle = 'rgba(150,135,100,0.85)'; g.lineWidth = 3; g.stroke()
  g.beginPath(); g.ellipse(853, 640, 36, 100, 0, 0, 7); g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2; g.stroke()
  g.beginPath(); g.ellipse(840, 600, 12, 50, 0.05, 0, 7); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fill()

  // ---- ciliary body ----
  const cil = [[728, 432], [796, 412], [830, 478], [776, 470]]
  ;[cil, mirror(cil)].forEach((c) => {
    const cg = g.createLinearGradient(728, 0, 830, 0); cg.addColorStop(0, '#6e3c33'); cg.addColorStop(1, '#a8665a')
    poly(c, cg, '#4c2620', 2)
  })

  // ---- iris ----
  for (const s of [-1, 1]) {
    const y = (v) => 640 + s * (640 - v)
    const ig = g.createLinearGradient(710, 0, 800, 0); ig.addColorStop(0, '#5a3d22'); ig.addColorStop(1, '#a97d3b')
    g.lineCap = 'round'
    g.beginPath(); g.moveTo(716, y(436)); g.quadraticCurveTo(772, y(474), 788, y(556))
    g.strokeStyle = ig; g.lineWidth = 26; g.stroke()
    g.strokeStyle = 'rgba(255,225,160,0.35)'; g.lineWidth = 6
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(718 + i * 3, y(432 + i * 4)); g.quadraticCurveTo(766, y(470 + i * 2), 782 + i, y(548 + i * 3)); g.stroke() }
  }

  // ---- globe wall: sclera, choroid, RPE, retina ----
  arc(371, -145, 145, 24, '#f1e9de')
  for (let i = 0; i < 3000; i++) {
    const [x, y] = pt(R(-145, 145), R(360, 382))
    g.fillStyle = `rgba(120,100,90,${R(0.03, 0.09)})`; g.fillRect(x, y, R(1, 4), R(1, 3))
  }
  arc(383, -145, 145, 2, '#b3a595')
  arc(352, -141, 141, 14, '#4a2418')
  for (let i = 0; i < 700; i++) { const [x, y] = pt(R(-140, 140), R(346, 358)); g.fillStyle = `rgba(${R(120, 190)},${R(50, 80)},40,${R(0.1, 0.35)})`; g.beginPath(); g.arc(x, y, R(1, 3.5), 0, 7); g.fill() }
  arc(344.5, -130, 130, 3, '#1a0e0c')
  arc(334, -128, 128, 20, '#e0a592')
  arc(334, -128, 128, 12, '#ecc0ad')
  arc(327, -128, 128, 5, '#f8e0d4')
  arc(334, -13, 13, 20, 'rgba(240,200,100,0.28)') // macula
  arc(334, 14, 17, 22, '#f4e2cc') // optic disc
  arc(331, -2.2, 2.2, 14, '#ead3c8') // fovea pit
  for (const s of [-1, 1]) {
    arc(340, s * 126, s * 146, 30, '#8c5448')
    arc(349, s * 143, s * 147, 14, '#c9b9a6')
  }

  // ---- cornea ----
  g.beginPath()
  g.arc(891.6, 640, 297.6, rad(132.9), rad(227.1))
  g.lineTo(713, 439)
  g.arc(872.8, 640, 256.8, rad(231.5), rad(128.5), true)
  g.closePath()
  g.fillStyle = 'rgba(236,246,250,0.72)'; g.fill()
  g.strokeStyle = 'rgba(110,145,165,0.75)'; g.lineWidth = 3; g.stroke()
  g.beginPath(); g.arc(891.6, 640, 296, rad(203), rad(219)); g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 8; g.lineCap = 'round'; g.stroke()

  // ---- soft shading over the globe ----
  g.save(); g.beginPath(); g.arc(C.x, C.y, 384, rad(-145), rad(145)); g.lineTo(C.x, C.y); g.closePath(); g.clip()
  const sh = g.createRadialGradient(900, 500, 80, 1000, 640, 400)
  sh.addColorStop(0, 'rgba(255,255,255,0.12)'); sh.addColorStop(0.7, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(30,10,10,0.3)')
  g.fillStyle = sh; g.fillRect(560, 240, 900, 800); g.restore()
}

// Beam of light: parallel rays converging on the fovea at (1344, 640)
export function paintBeam(g) {
  g.clearRect(0, 0, EYE_W, EYE_H)
  const bg = g.createLinearGradient(0, 0, 1344, 0)
  bg.addColorStop(0, 'rgba(255,200,90,0.03)'); bg.addColorStop(0.45, 'rgba(255,205,100,0.16)'); bg.addColorStop(1, 'rgba(255,225,140,0.5)')
  g.shadowColor = 'rgba(255,190,70,0.9)'; g.shadowBlur = 18
  g.beginPath(); g.moveTo(0, 595); g.lineTo(790, 620); g.lineTo(1344, 640); g.lineTo(790, 660); g.lineTo(0, 685); g.closePath()
  g.fillStyle = bg; g.fill(); g.shadowBlur = 0
  const sp = g.createRadialGradient(1344, 640, 0, 1344, 640, 70)
  sp.addColorStop(0, 'rgba(255,250,220,0.9)'); sp.addColorStop(0.3, 'rgba(255,200,90,0.5)'); sp.addColorStop(1, 'rgba(255,170,40,0)')
  g.fillStyle = sp; g.fillRect(1250, 550, 200, 180)
}

// ---- highlights --------------------------------------------------------------------------------
// The parts of the eye that can light up. The names are used by glossaryData.js (the `part` field).
export const EYE_PARTS = {
  cornea: 'Cornea',
  pupil: 'Pupil',
  iris: 'Iris',
  lens: 'Lens',
  aqueous: 'Aqueous humour',
  vitreous: 'Vitreous humour',
  sclera: 'Sclera',
  retina: 'Retina',
  fovea: 'Fovea',
  opticnerve: 'Optic nerve',
}

// Paints ONE part as a glowing overlay on a transparent canvas of the same size as the eye picture.
// The shapes use exactly the same coordinates as paintEye, so the glow sits right on top of the part.
export function paintHighlight(g, part) {
  const C = { x: 1000, y: 640 }
  const FILL = 'rgba(94,234,212,0.42)', GLOW = 'rgba(94,234,212,0.95)', EDGE = '#d9fff8'
  g.clearRect(0, 0, EYE_W, EYE_H)
  g.lineCap = 'round'
  g.lineJoin = 'round'

  // a filled shape with a soft glow and a bright edge. `path` adds the shape to the current path.
  const fillShape = (path) => {
    g.save()
    g.shadowColor = GLOW; g.shadowBlur = 46
    g.beginPath(); path(); g.fillStyle = FILL; g.fill()
    g.shadowBlur = 0
    g.beginPath(); path(); g.strokeStyle = EDGE; g.lineWidth = 5; g.stroke()
    g.restore()
  }
  // a thick glowing line (for the thin, curved parts)
  const strokeShape = (path, width) => {
    g.save()
    g.shadowColor = GLOW; g.shadowBlur = 40
    g.beginPath(); path(); g.strokeStyle = 'rgba(94,234,212,0.7)'; g.lineWidth = width; g.stroke()
    g.shadowBlur = 0
    g.beginPath(); path(); g.strokeStyle = EDGE; g.lineWidth = 4; g.stroke()
    g.restore()
  }
  const iris = (s) => () => {
    const y = (v) => 640 + s * (640 - v)
    g.moveTo(716, y(436)); g.quadraticCurveTo(772, y(474), 788, y(556))
  }
  const cornea = () => {
    g.arc(891.6, 640, 297.6, rad(132.9), rad(227.1))
    g.lineTo(713, 439)
    g.arc(872.8, 640, 256.8, rad(231.5), rad(128.5), true)
    g.closePath()
  }
  const lens = () => g.ellipse(853, 640, 63, 150, 0, 0, 7)

  if (part === 'cornea') fillShape(cornea)
  else if (part === 'iris') [-1, 1].forEach((s) => strokeShape(iris(s), 34))
  else if (part === 'pupil') fillShape(() => g.ellipse(790, 640, 30, 92, 0, 0, 7))
  else if (part === 'lens') fillShape(lens)
  else if (part === 'sclera') strokeShape(() => g.arc(C.x, C.y, 371, rad(-145), rad(145)), 30)
  else if (part === 'retina') strokeShape(() => g.arc(C.x, C.y, 334, rad(-128), rad(128)), 46)
  else if (part === 'fovea') {
    fillShape(() => g.arc(1331, 640, 30, 0, 7))
    g.save(); g.setLineDash([10, 12]); g.strokeStyle = GLOW; g.lineWidth = 3
    g.beginPath(); g.arc(1331, 640, 62, 0, 7); g.stroke(); g.restore()
  } else if (part === 'opticnerve') fillShape(() => { g.moveTo(1340, 640); g.lineTo(1780, 650); g.lineTo(1810, 800); g.lineTo(1385, 770); g.closePath() })
  else if (part === 'vitreous' || part === 'aqueous') {
    // the two fluids are big regions: fill them, then cut away the lens, the iris and the other chamber
    const tmp = document.createElement('canvas')
    tmp.width = EYE_W; tmp.height = EYE_H
    const t = tmp.getContext('2d')
    t.fillStyle = FILL
    t.beginPath()
    if (part === 'vitreous') t.arc(C.x, C.y, 340, 0, 7)
    else { t.arc(891.6, 640, 297.6, rad(132.9), rad(227.1)); t.arc(C.x, C.y, 350, rad(215), rad(145), true); t.closePath() }
    t.fill()
    t.globalCompositeOperation = 'destination-out'
    t.fillStyle = '#000'
    t.beginPath(); t.ellipse(853, 640, 66, 153, 0, 0, 7); t.fill()
    if (part === 'vitreous') t.fillRect(0, 0, 800, EYE_H)
    else t.fillRect(796, 0, 1400, EYE_H)
    ;[-1, 1].forEach((s) => {
      const y = (v) => 640 + s * (640 - v)
      t.beginPath(); t.moveTo(716, y(436)); t.quadraticCurveTo(772, y(474), 788, y(556))
      t.lineWidth = 34; t.strokeStyle = '#000'; t.stroke()
    })
    g.save()
    g.shadowColor = GLOW; g.shadowBlur = 36
    g.drawImage(tmp, 0, 0)
    g.restore()
    g.drawImage(tmp, 0, 0)
  }
}