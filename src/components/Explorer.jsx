import { useEffect, useMemo, useRef, useState } from 'react'
import Biology from './Biology'
import { SPAN, rf, stim, response, boundary } from './model'

const AMBER = [245, 165, 36]
const BLUE = [59, 111, 224]

const SLIDERS = [
  { key: 'center', label: 'Center width', min: 0.5, max: 3, step: 0.1 },
  { key: 'surroundW', label: 'Surround width (× center)', min: 1.5, max: 6, step: 0.1 },
  { key: 'strength', label: 'Surround strength', min: 0, max: 2, step: 0.05 },
  'stimulus',
  { key: 'contrast', label: 'Contrast: dark to bright', min: -1, max: 1, step: 0.05 },
  { key: 'radius', label: 'Spot radius', min: 0.5, max: 10, step: 0.1, only: 'spot' },
  { key: 'position', label: 'Horizontal stimulus position', min: -10, max: 10, step: 0.1, not: 'uniform' },
]

// ---- drawing -----------------------------------------------------------
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`

// size the canvas buffer to its on-screen size (sharp on hi-dpi) and return logical width/height
function prep(cv) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = cv.clientWidth || 450, h = cv.clientHeight || 300
  const bw = Math.round(w * dpr), bh = Math.round(h * dpr)
  if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh }
  const ctx = cv.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return { ctx, w, h }
}

const BG = '#0b1127'
const glow = (ctx, color, blur = 14) => { ctx.shadowColor = color; ctx.shadowBlur = blur }
const noGlow = (ctx) => { ctx.shadowBlur = 0 }

function drawField(cv, p) {
  const { ctx, w, h } = prep(cv)
  const k = w / (2 * SPAN), cx = w / 2, cy = h / 2
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = 'rgba(140,170,255,0.08)'
  ctx.lineWidth = 1
  for (let g = -SPAN; g <= SPAN; g += 2) {
    ctx.beginPath(); ctx.moveTo(cx + g * k, 0); ctx.lineTo(cx + g * k, h); ctx.moveTo(0, cy + g * k); ctx.lineTo(w, cy + g * k); ctx.stroke()
  }
  const on = p.type === 'on'
  const cCol = on ? AMBER : BLUE, sCol = on ? BLUE : AMBER
  const r0 = boundary(p) * k, rOut = Math.min(2.2 * p.center * p.surroundW, 14) * k
  const hasSurround = p.strength >= 0.05

  if (hasSurround) {
    ctx.beginPath()
    ctx.arc(cx, cy, rOut, 0, Math.PI * 2)
    ctx.moveTo(cx + r0, cy)
    ctx.arc(cx, cy, r0, 0, Math.PI * 2)
    ctx.fillStyle = rgba(sCol, 0.3 + 0.4 * Math.min(p.strength, 1.5) / 1.5)
    glow(ctx, rgba(sCol, 0.6), 24)
    ctx.fill('evenodd')
    noGlow(ctx)
  }
  ctx.beginPath()
  ctx.arc(cx, cy, r0, 0, Math.PI * 2)
  ctx.fillStyle = rgba(cCol, 0.85)
  glow(ctx, rgba(cCol, 0.9), 26)
  ctx.fill()
  noGlow(ctx)

  // crisp glowing boundaries
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2.5
  glow(ctx, '#ffffff', 10)
  ctx.beginPath(); ctx.arc(cx, cy, r0, 0, Math.PI * 2); ctx.stroke()
  if (hasSurround) { ctx.beginPath(); ctx.arc(cx, cy, rOut, 0, Math.PI * 2); ctx.stroke() }
  noGlow(ctx)

  // stimulus: cyan dashed neon outline over a faint tint
  ctx.setLineDash([8, 5])
  ctx.lineWidth = 2.5
  ctx.strokeStyle = '#5eead4'
  // tint strength follows the contrast slider continuously: white for brighter, black for darker
  ctx.fillStyle = p.contrast >= 0 ? `rgba(255,255,255,${0.6 * p.contrast})` : `rgba(0,0,0,${0.85 * -p.contrast})`
  glow(ctx, '#5eead4', 12)
  const sx = cx + p.position * k
  if (p.stimulus === 'spot') {
    ctx.beginPath(); ctx.arc(sx, cy, p.radius * k, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  } else if (p.stimulus === 'edge') {
    ctx.fillRect(sx, 0, w - sx, h)
    ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, h); ctx.stroke()
  } else { ctx.fillRect(0, 0, w, h); ctx.strokeRect(2, 2, w - 4, h - 4) }
  ctx.setLineDash([])
  noGlow(ctx)

  // labels: dark text where a bright stimulus washes the field out, white otherwise, always with a halo
  ctx.textAlign = 'center'
  ctx.lineJoin = 'round'
  const text = (s, px, py, font) => {
    const covered = stim((px - cx) / k, (py - cy) / k, p)
    const washed = covered > 0 && 0.6 * covered > 0.2
    ctx.font = font
    ctx.lineWidth = 4
    ctx.strokeStyle = washed ? 'rgba(255,255,255,0.55)' : 'rgba(5,8,20,0.75)'
    ctx.strokeText(s, px, py)
    ctx.fillStyle = washed ? '#0b1127' : '#ffffff'
    ctx.fillText(s, px, py)
  }
  if (r0 > 22) text(on ? '+' : '−', cx, cy + 9, '800 26px system-ui')
  if (r0 > 40) text('CENTRE', cx, cy + 28, '700 12px system-ui')
  if (hasSurround && rOut - r0 > 24) {
    const ry = cy - (r0 + rOut) / 2
    text(on ? '−' : '+', cx, ry + 6, '800 22px system-ui')
    text('SURROUND', cx, ry + 22, '700 12px system-ui')
  }
  ctx.textAlign = 'start'
}

function drawDog(cv, p) {
  const { ctx, w, h } = prep(cv)
  const m = 30
  const peak = Math.abs(rf(0, 0, p)) || 1
  const X = (x) => m + ((x + SPAN) / (2 * SPAN)) * (w - 2 * m)
  const Y = (v) => h / 2 - v * (h / 2 - m)
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, w, h)
  for (let x = -SPAN; x < SPAN; x += 0.1) {
    const v = rf(x, 0, p) / peak
    ctx.fillStyle = v >= 0 ? rgba(AMBER, 0.4) : rgba(BLUE, 0.45)
    ctx.fillRect(X(x), Math.min(Y(v), Y(0)), X(x + 0.1) - X(x) + 0.6, Math.abs(Y(v) - Y(0)))
  }
  const r0 = boundary(p)
  ctx.strokeStyle = 'rgba(255,255,255,0.45)'
  ctx.lineWidth = 1.5
  ctx.setLineDash([4, 4])
  ;[-r0, r0].forEach((x) => { ctx.beginPath(); ctx.moveTo(X(x), m / 2); ctx.lineTo(X(x), h - m / 2); ctx.stroke() })
  ctx.setLineDash([])
  ctx.strokeStyle = 'rgba(140,170,255,0.3)'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(m, Y(0)); ctx.lineTo(w - m, Y(0)); ctx.moveTo(X(0), m / 2); ctx.lineTo(X(0), h - m / 2); ctx.stroke()

  ctx.setLineDash([5, 4])
  ctx.strokeStyle = '#5eead4'
  ctx.lineWidth = 2
  glow(ctx, '#5eead4', 8)
  ctx.beginPath()
  for (let x = -SPAN; x <= SPAN; x += 0.1) { const v = stim(x, 0, p); x === -SPAN ? ctx.moveTo(X(x), Y(v)) : ctx.lineTo(X(x), Y(v)) }
  ctx.stroke()
  ctx.setLineDash([])
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 3
  glow(ctx, '#ffffff', 12)
  ctx.beginPath()
  for (let x = -SPAN; x <= SPAN; x += 0.1) { const v = rf(x, 0, p) / peak; x === -SPAN ? ctx.moveTo(X(x), Y(v)) : ctx.lineTo(X(x), Y(v)) }
  ctx.stroke()
  noGlow(ctx)
  ctx.fillStyle = 'rgba(232,237,255,0.85)'
  ctx.font = '12px system-ui'
  ctx.fillText('white: sensitivity', m, 16)
  ctx.fillStyle = '#5eead4'
  ctx.fillText('dashed: stimulus', m + 130, 16)
}

// Live scrolling "oscilloscope": spikes are generated in real time at the predicted rate.
// `now` is our own clock. It only moves forward while the scope is playing, so pausing
// freezes everything and resuming carries on without a jump.
function startScope(cv, rateRef, pausedRef) {
  const PPS = 320
  let spikes = [], cur = rateRef.current, now = 0, next = 0, lastReal = performance.now() / 1000, raf
  const loop = () => {
    raf = requestAnimationFrame(loop)
    const { ctx, w, h } = prep(cv)
    const TOP = 40, BOT = h - 46
    const vy = (mv) => TOP + ((40 - mv) / 125) * (BOT - TOP)

    const real = performance.now() / 1000
    const dt = Math.min(0.1, real - lastReal)
    lastReal = real

    if (!pausedRef.current) {
      now += dt
      cur += (rateRef.current - cur) * Math.min(1, dt * 6)
      while (next <= now) {
        if (cur > 0.5) spikes.push(next)
        next += Math.min(0.5, (1 / Math.max(cur, 0.5)) * (0.75 + 0.5 * Math.random())) // fairly regular, so the rate is easy to read
      }
      spikes = spikes.filter((t) => now - t < w / PPS + 0.1)
    }

    ctx.fillStyle = '#0d1330'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'
    ctx.lineWidth = 1
    for (let x = ((now * PPS) % 35); x < w; x += 35) { ctx.beginPath(); ctx.moveTo(w - x, 0); ctx.lineTo(w - x, h); ctx.stroke() }
    for (let mv = 40; mv >= -80; mv -= 20) { ctx.beginPath(); ctx.moveTo(0, vy(mv)); ctx.lineTo(w, vy(mv)); ctx.stroke() }
    ctx.setLineDash([6, 5])
    ctx.strokeStyle = 'rgba(255,120,120,0.6)'
    ctx.beginPath(); ctx.moveTo(0, vy(-50)); ctx.lineTo(w, vy(-50)); ctx.stroke()
    ctx.setLineDash([])
    ctx.font = '11px system-ui'
    ctx.fillStyle = 'rgba(255,150,150,0.9)'
    ctx.fillText('threshold −50 mV', 8, vy(-50) - 5)
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.fillText('rest −65 mV', 8, vy(-65) + 14)

    const noise = (t) => 0.8 * Math.sin(t * 13) + 0.6 * Math.sin(t * 29 + 1) + 0.5 * Math.sin(t * 47)
    ctx.strokeStyle = '#5eead4'
    ctx.lineWidth = 2
    ctx.shadowColor = '#5eead4'
    ctx.shadowBlur = 8
    ctx.beginPath()
    for (let x = 0; x <= w; x += 2) { const t = now - (w - x) / PPS; ctx[x ? 'lineTo' : 'moveTo'](x, vy(-65 + noise(t))) }
    ctx.stroke()
    spikes.forEach((t) => {
      const x = w - (now - t) * PPS
      ctx.beginPath()
      ctx.moveTo(x - 2, vy(-60)); ctx.lineTo(x - 0.5, vy(-50)); ctx.lineTo(x, vy(40)); ctx.lineTo(x + 1.5, vy(-78)); ctx.lineTo(x + 5, vy(-65))
      ctx.stroke()
    })
    ctx.shadowBlur = 0
    ctx.strokeStyle = '#ffc247'
    ctx.lineWidth = 2
    let n = 0
    spikes.forEach((t) => {
      const x = w - (now - t) * PPS
      ctx.beginPath(); ctx.moveTo(x, h - 36); ctx.lineTo(x, h - 12); ctx.stroke()
      if (now - t < 1) n++
    })
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.fillText('spike times', 8, h - 8)
    ctx.fillRect(w - 12 - PPS, h - 12, PPS, 2)
    ctx.fillText('1 s', w - 12 - PPS, h - 17)
    // rate meter: bar fills from 0 to 120 spikes/s, tick marks the 20/s resting rate
    const mx = 12, my = 10, mw = 260, frac = Math.min(1, cur / 120)
    ctx.fillStyle = 'rgba(255,255,255,0.1)'
    ctx.fillRect(mx, my, mw, 10)
    const mg = ctx.createLinearGradient(mx, 0, mx + mw, 0)
    mg.addColorStop(0, '#5eead4'); mg.addColorStop(1, '#ffc247')
    ctx.fillStyle = mg
    ctx.shadowColor = frac > 0.5 ? '#ffc247' : '#5eead4'
    ctx.shadowBlur = 14
    ctx.fillRect(mx, my, mw * frac, 10)
    ctx.shadowBlur = 0
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.fillRect(mx + mw * (20 / 120), my - 3, 2, 16)
    ctx.font = '700 14px system-ui'
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'right'
    ctx.fillText(`${Math.round(cur)} spikes/s`, w - 12, 20)
    ctx.textAlign = 'start'
  }
  loop()
  return () => cancelAnimationFrame(raf)
}

// ---- component ---------------------------------------------------------
export default function Explorer() {
  const [p, setP] = useState({
    type: 'on', center: 1, surroundW: 3, strength: 0.9,
    stimulus: 'spot', contrast: 0.5, radius: 2, position: 0,
  })
  const set = (k, v) => setP((o) => ({ ...o, [k]: v }))
  const fieldRef = useRef(null)
  const dogRef = useRef(null)
  const respRef = useRef(null)
  const rateRef = useRef(20)
  const [flipped, setFlipped] = useState(false)

  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(false)
  pausedRef.current = paused

  // which panel is enlarged: null, 'field', 'dog' or 'resp'
  const [big, setBig] = useState(null)
  const toggle = (name) => setBig((b) => (b === name ? null : name))
  const titleProps = (name) => ({
    role: 'button',
    tabIndex: 0,
    className: 'clickable',
    title: big === name ? 'Click to shrink' : 'Click to enlarge',
    onClick: () => toggle(name),
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(name) }
    },
  })
  const boxClass = (name) => 'box' + (big === name ? ' enlarged' : '')
  const icon = (name) => <span aria-hidden="true">{big === name ? '✕' : '⤢'}</span>

  // Esc closes the enlarged panel, and the page behind it stops scrolling
  useEffect(() => {
    if (!big) return
    const onKey = (e) => e.key === 'Escape' && setBig(null)
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [big])

  const rate = useMemo(() => response(p), [p])

  const pRef = useRef(p)
  pRef.current = p
  useEffect(() => {
    drawField(fieldRef.current, p)
    drawDog(dogRef.current, p)
  }, [p])

  // redraw the plots whenever their panels are resized (this also handles enlarging)
  useEffect(() => {
    const redraw = () => { drawField(fieldRef.current, pRef.current); drawDog(dogRef.current, pRef.current) }
    const ro = new ResizeObserver(redraw)
    ro.observe(fieldRef.current)
    ro.observe(dogRef.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => { rateRef.current = rate }, [rate])
  useEffect(() => startScope(respRef.current, rateRef, pausedRef), [])

  return (
    <div className="explorer">
      {big && <div className="backdrop" onClick={() => setBig(null)} />}

      <section id="controls" className="box">
        <div id="cell-type-row">
          <strong>Cell type =</strong>
          {['on', 'off'].map((t) => (
            <label key={t}>
              <input type="radio" name="cell-type" value={t} checked={p.type === t} onChange={() => set('type', t)} />
              {t === 'on' ? 'ON-center' : 'OFF-center'}
            </label>
          ))}
        </div>

        <hr />
        <h2>Parameters =</h2>

        <ol id="parameters">
          {SLIDERS.map((s) => {
            if (s === 'stimulus')
              return (
                <li className="row" key="stimulus">
                  <label htmlFor="stimulus-type">Stimulus type</label>
                  <select id="stimulus-type" value={p.stimulus} onChange={(e) => set('stimulus', e.target.value)}>
                    <option value="spot">Circular spot</option>
                    <option value="edge">Light-dark edge</option>
                    <option value="uniform">Uniform illumination</option>
                  </select>
                  <span></span>
                </li>
              )
            if ((s.only && s.only !== p.stimulus) || (s.not && s.not === p.stimulus)) return null
            return (
              <li className="row" key={s.key}>
                <label htmlFor={s.key}>{s.label}</label>
                <input
                  type="range" id={s.key} min={s.min} max={s.max} step={s.step}
                  value={p[s.key]} onChange={(e) => set(s.key, parseFloat(e.target.value))}
                />
                <output>{p[s.key]}</output>
              </li>
            )
          })}
        </ol>
      </section>

      <section id="visuals">
        <div id="receptive-field-panel" className={boxClass('field')}>
          <h2 {...titleProps('field')}>Receptive field and stimulus {icon('field')}</h2>
          <div className="plot"><canvas ref={fieldRef} /></div>
          <p className="note">Amber: light excites the cell. Blue: light suppresses it. The black outline marks where the centre ends and the surround begins.</p>
        </div>

        <div id="dog-panel" className={boxClass('dog')}>
          <div className="panel-head">
            <h2 {...titleProps('dog')}>{flipped ? 'Underlying biology' : 'Difference of Gaussians graph'} {icon('dog')}</h2>
            <button className="btn mini" onClick={() => setFlipped(!flipped)}>
              {flipped ? 'Show DoG graph' : 'Show underlying biology'}
            </button>
          </div>
          <div className="flip-scene">
            <div className={'flip-card' + (flipped ? ' flipped' : '')}>
              <div className="face front"><canvas ref={dogRef} /></div>
              <div className="face back"><Biology p={p} rate={rate} /></div>
            </div>
          </div>
          <p className="note">
            {flipped
              ? 'Same x-axis as the DoG graph: each receptor\'s colour and brightness is its weight in the curve (amber excites, blue suppresses). Dashed lines mark the centre/surround boundary; the ganglion cell pulses at the predicted firing rate.'
              : 'Horizontal slice through the field centre. Dashed vertical lines mark the centre/surround boundary.'}
          </p>
        </div>
      </section>

      <section id="response-panel" className={boxClass('resp')}>
        <div className="panel-head">
          <h2 {...titleProps('resp')}>Action potentials (predicted cell response) {icon('resp')}</h2>
          <p id="readout">
            Predicted rate: <strong>{rate.toFixed(0)} spikes/s</strong> (rest: 20)
          </p>
          <button className="btn mini" onClick={() => setPaused((v) => !v)}>
            {paused ? '▶ Play' : '❚❚ Pause'}
          </button>
        </div>
        <div className="plot"><canvas ref={respRef} /></div>
      </section>
    </div>
  )
}