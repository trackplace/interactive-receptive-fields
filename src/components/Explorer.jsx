import { useEffect, useMemo, useRef, useState } from 'react'
import Biology from './Biology'
import { Term, useGlossary } from './Glossary'
import { SPAN, rf, stim, response, parts, boundary } from './model'

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

// choices for the oscilloscope: how much time fits across the graph, and how fast the graph plays
const WINDOWS = [
  { value: 0.5, label: '0.5 s' },
  { value: 1, label: '1 s' },
  { value: 2, label: '2 s' },
]
const SPEEDS = [
  { value: 1, label: 'Real time (1×)' },
  { value: 0.5, label: 'Slow (½×)' },
  { value: 0.25, label: 'Slower (¼×)' },
  { value: 0.1, label: 'Slowest (⅒×)' },
]

const fmt = (v) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2)

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

// Label with a dark backing pill, right-aligned at x. Drawn after the trace so the
// trace can never hide the text, and the pill keeps it readable if the trace passes behind.
function pill(ctx, text, x, y, color, size = 12, weight = 700) {
  ctx.font = `${weight} ${size}px system-ui`
  const w = ctx.measureText(text).width
  const padX = 7, h = size + 7
  ctx.fillStyle = 'rgba(8, 12, 30, 0.92)'
  ctx.beginPath()
  ctx.roundRect(x - w - padX, y - size - 1, w + 2 * padX, h, h / 2)
  ctx.fill()
  ctx.strokeStyle = color
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.fillStyle = color
  ctx.textAlign = 'right'
  ctx.fillText(text, x, y)
}

// Live scrolling "oscilloscope" with real axes: membrane potential (mV) against time (s).
//  - The firing rate decides how fast the voltage climbs from reset (-72 mV) to threshold (-50 mV).
//    At threshold the cell fires a spike, then the voltage resets.
//  - `now` is the cell's own clock in seconds. It runs at `speed` x real time, so the graph can be slowed down.
//    Pausing freezes it, and resuming carries on without a jump.
//  - cfgRef.current = { win, speed }: seconds across the graph, and playback speed.
function startScope(cv, rateRef, pausedRef, cfgRef) {
  const REST = -65, THR = -50, RESET = -72, KEEP = 2.4 // KEEP: seconds of spike history to remember (> largest window)
  let spikes = [], cur = rateRef.current, now = 0, next = 0, lastReal = performance.now() / 1000, raf
  const noise = (t) => 0.7 * Math.sin(t * 13) + 0.5 * Math.sin(t * 29 + 1) + 0.4 * Math.sin(t * 47)

  const loop = () => {
    raf = requestAnimationFrame(loop)
    const { ctx, w, h } = prep(cv)
    const { win, speed } = cfgRef.current
    const L = 56, RM = 12, TOP = 12, BOT = h - 62 // plot area; the spike lane and the time axis sit below BOT
    const xr = w - RM, PPS = (xr - L) / win // pixels per second of cell time
    const vy = (mv) => TOP + ((45 - mv) / 130) * (BOT - TOP)
    const xOf = (t) => xr - (now - t) * PPS

    const real = performance.now() / 1000
    const dt = Math.min(0.1, real - lastReal)
    lastReal = real

    if (!pausedRef.current) {
      now += dt * speed
      cur += (rateRef.current - cur) * Math.min(1, dt * 6)
      if (cur > 0.5) {
        while (next <= now) {
          spikes.push(next)
          next += Math.min(0.5, (1 / cur) * (0.75 + 0.5 * Math.random())) // fairly regular, so the rate is easy to read
        }
      } else next = now + 0.1
      spikes = spikes.filter((t) => now - t < KEEP)
    }

    // background
    ctx.fillStyle = '#0d1330'
    ctx.fillRect(0, 0, w, h)
    ctx.lineWidth = 1

    // y axis: membrane potential in mV
    ctx.font = '11px system-ui'
    for (let mv = 40; mv >= -80; mv -= 20) {
      ctx.strokeStyle = 'rgba(255,255,255,0.07)'
      ctx.beginPath(); ctx.moveTo(L, vy(mv)); ctx.lineTo(xr, vy(mv)); ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.textAlign = 'right'
      ctx.fillText(String(mv), L - 8, vy(mv) + 4)
    }
    ctx.save()
    ctx.translate(13, (TOP + BOT) / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.textAlign = 'center'
    ctx.fillStyle = '#e8edff'
    ctx.font = '700 11px system-ui'
    ctx.fillText('Membrane potential (mV)', 0, 0)
    ctx.restore()

    // x axis: time in seconds. Ticks are fixed in cell time, so they scroll with the trace.
    const AX = BOT + 24
    const tick = win <= 0.5 ? 0.1 : win <= 1 ? 0.2 : 0.5
    ctx.font = '11px system-ui'
    for (let k = Math.ceil(Math.max(0, now - win) / tick); k * tick <= now; k++) {
      const t = k * tick, x = xOf(t)
      if (x < L - 0.5) continue
      ctx.strokeStyle = 'rgba(255,255,255,0.07)'
      ctx.beginPath(); ctx.moveTo(x, TOP); ctx.lineTo(x, AX); ctx.stroke()
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'
      ctx.beginPath(); ctx.moveTo(x, AX); ctx.lineTo(x, AX + 4); ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.textAlign = 'center'
      ctx.fillText(t.toFixed(1), x, AX + 17)
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'
    ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(L, TOP); ctx.lineTo(L, AX); ctx.lineTo(xr, AX); ctx.stroke()
    ctx.fillStyle = '#e8edff'
    ctx.font = '700 11px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText('Time (s)', (L + xr) / 2, h - 6)
    ctx.lineWidth = 1

    // threshold and rest lines (their labels are drawn at the very end, on top of the trace)
    ctx.setLineDash([6, 5])
    ctx.strokeStyle = 'rgba(255,120,120,0.65)'
    ctx.beginPath(); ctx.moveTo(L, vy(THR)); ctx.lineTo(xr, vy(THR)); ctx.stroke()
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.beginPath(); ctx.moveTo(L, vy(REST)); ctx.lineTo(xr, vy(REST)); ctx.stroke()
    ctx.setLineDash([])

    // membrane potential trace: between two spikes the voltage climbs from reset to threshold.
    // A bigger push means a faster climb and a shorter interval between spikes.
    const ev = [...spikes, next] // the last entry is the upcoming spike
    ctx.save()
    ctx.beginPath()
    ctx.rect(L, TOP, xr - L, BOT - TOP)
    ctx.clip()
    ctx.strokeStyle = '#5eead4'
    ctx.lineWidth = 2
    ctx.shadowColor = '#5eead4'
    ctx.shadowBlur = 8
    ctx.beginPath()
    let j = 0, started = false
    for (let x = L; x <= xr; x += 1.5) {
      const t = now - (xr - x) / PPS
      if (t < 0) continue
      while (j + 1 < ev.length && ev[j + 1] <= t) j++
      let v = REST + noise(t)
      const hasInterval = ev[j] <= t && j + 1 < ev.length
      const upcoming = j + 1 === ev.length - 1
      if (hasInterval && !(upcoming && cur <= 0.5)) {
        const isi = ev[j + 1] - ev[j], tau = t - ev[j]
        if (tau < isi) v = RESET + (THR - RESET) * ((1 - Math.exp((-3 * tau) / isi)) / (1 - Math.exp(-3))) + noise(t) * 0.6
      }
      started ? ctx.lineTo(x, vy(v)) : ctx.moveTo(x, vy(v))
      started = true
    }
    ctx.stroke()
    // the spikes themselves (drawn wider than the real ~1 ms so they are visible)
    spikes.forEach((t) => {
      const x = xOf(t)
      if (x < L - 8) return
      ctx.beginPath()
      ctx.moveTo(x - 2, vy(THR - 4)); ctx.lineTo(x, vy(40)); ctx.lineTo(x + 2, vy(-78)); ctx.lineTo(x + 4, vy(RESET))
      ctx.stroke()
    })
    ctx.restore()

    // spike lane: one tick per spike
    ctx.strokeStyle = '#ffc247'
    ctx.lineWidth = 2
    spikes.forEach((t) => {
      const x = xOf(t)
      if (x < L) return
      ctx.beginPath(); ctx.moveTo(x, BOT + 6); ctx.lineTo(x, BOT + 20); ctx.stroke()
    })
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.font = '11px system-ui'
    ctx.textAlign = 'right'
    ctx.fillText('spikes', L - 8, BOT + 17)

    // captions inside the plot
    ctx.textAlign = 'left'
    ctx.font = '11px system-ui'
    ctx.fillStyle = 'rgba(255,255,255,0.65)'
    ctx.fillText(speed === 1 ? 'real time' : `slow motion ×${speed}`, L + 8, TOP + 14)
    if (pausedRef.current) ctx.fillText('paused', L + 8, TOP + 28)

    // labels last, so the trace can never cover them
    pill(ctx, 'threshold −50 mV', xr - 6, vy(THR) - 8, 'rgba(255,150,150,1)')
    pill(ctx, 'rest −65 mV', xr - 6, vy(REST) + 20, 'rgba(200,210,240,1)')
    pill(ctx, `${Math.round(cur)} spikes/s`, xr - 6, TOP + 22, '#ffffff', 14, 800)
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
  const { openTerm, openMath, openRate } = useGlossary()
  const fieldRef = useRef(null)
  const dogRef = useRef(null)
  const respRef = useRef(null)
  const rateRef = useRef(20)
  const [flipped, setFlipped] = useState(false)

  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(false)
  pausedRef.current = paused

  // oscilloscope settings: seconds across the graph and playback speed (slow motion by default)
  const [win, setWin] = useState(1)
  const [speed, setSpeed] = useState(0.25)
  const cfgRef = useRef({ win: 1, speed: 0.25 })
  cfgRef.current = { win, speed }

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
  const pt = useMemo(() => parts(p), [p])
  const rawRate = 20 + 100 * pt.net

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
  useEffect(() => startScope(respRef.current, rateRef, pausedRef, cfgRef), [])

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
          <h2 {...titleProps('field')}><span onClick={(e) => e.stopPropagation()}>
            <Term id="receptivefield">Receptive field</Term>
          </span>{' '}
          and stimulus {icon('field')}</h2>
          <div className="plot"><canvas ref={fieldRef} /></div>
          <p className="note">Amber (+): light here excites the cell. Blue (−): light here suppresses it. The inner white circle marks where the centre ends and the surround begins; the outer one is where the surround ends. The dashed cyan outline is the stimulus.</p>
        </div>

        <div id="dog-panel" className={boxClass('dog')}>
          <div className="panel-head">
            <div className="dog-title">
              <h2 {...titleProps('dog')}>{flipped ? 'Underlying biology' : 'Difference of Gaussians graph'} {icon('dog')}</h2>
              {!flipped && <button
                type="button"
                className="term term-math"
                data-short="Explaining the maths behind the model: how two bell curves make the Mexican hat."
                onClick={() => openMath(p)}
                aria-haspopup="dialog"
                aria-label="Explain the maths behind the Difference of Gaussians graph"
              ><span className="info-i" aria-hidden="true">ⓘ</span></button>}
            </div>
            <button className="btn mini" onClick={() => setFlipped(!flipped)}>
              {flipped ? 'Show DoG graph' : 'Show underlying biology'}
            </button>
          </div>
          <div className="flip-scene">
            <div className={'flip-card' + (flipped ? ' flipped' : '')}>
              <div className="face front"><canvas ref={dogRef} /></div>
              <div className="face back"><Biology p={p} rate={rate} onTerm={openTerm} /></div>
            </div>
          </div>
          <p className="note">
            {flipped
              ? 'Same x-axis as the DoG graph: each receptor\'s colour and brightness is its weight in the curve (amber excites, blue suppresses). Dashed lines mark the centre/surround boundary; the ganglion cell pulses at the predicted firing rate.'
              : 'Horizontal slice through the middle of the field. White curve: how sensitive the cell is at each position. Dashed cyan: the stimulus. Dashed vertical lines: where the curve crosses zero, so where the centre ends and the surround begins.'}
          </p>
        </div>
      </section>

      <section id="response-panel" className={boxClass('resp')}>
        <div className="panel-head">
          <div className="dog-title">
            <h2 {...titleProps('resp')}>
              <span onClick={(e) => e.stopPropagation()}>
                <Term id="actionpotential">Action potentials</Term>
              </span>{' '}
              (predicted cell response) {icon('resp')}
            </h2>
            <button
              type="button"
              className="term term-math"
              data-short="How the firing rate follows from the stimulus and the receptive field parameters."
              onClick={() => openRate(p)}
              aria-haspopup="dialog"
              aria-label="Explain how the firing rate is calculated"
            ><span className="info-i" aria-hidden="true">ⓘ</span></button>
          </div>
          <div className="scope-ctrl">
            <label>
              Time window
              <select value={win} onChange={(e) => setWin(parseFloat(e.target.value))}>
                {WINDOWS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <label>
              Speed
              <select value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))}>
                {SPEEDS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <button className="btn mini" onClick={() => setPaused((v) => !v)}>
              {paused ? '▶ Play' : '❚❚ Pause'}
            </button>
          </div>
        </div>
        <p id="readout" className="rate-line">
          Net push <strong>R = {fmt(pt.net)}</strong> (centre {fmt(pt.centre)}, surround {fmt(pt.surround)}) →{' '}
          <Term id="firingrate">rate</Term> = 20 + 100 × R = <strong>{rate.toFixed(0)} spikes/s</strong>
          {Math.abs(rawRate - rate) > 0.5 && ' (limited to 0–120)'}
        </p>
        <div className="plot"><canvas ref={respRef} /></div>
      </section>
    </div>
  )
}
