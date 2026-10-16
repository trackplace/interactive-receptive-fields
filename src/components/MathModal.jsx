import { useEffect, useMemo, useRef, useState } from 'react'
import { SPAN, boundary, gauss } from './model'

const AMBER = '#ffb938', BLUE = '#5b8cff', CYAN = '#5eead4'

// error function (Abramowitz & Stegun 7.1.26) -> normal CDF, used for the edge-response curve
const erf = (x) => {
  const s = Math.sign(x)
  x = Math.abs(x)
  const t = 1 / (1 + 0.3275911 * x)
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x)
  return s * y
}
const Phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2))

// response of an ON cell to an edge at position e (light on the right of e), contrast 1
function edgeCurve(sc, ss, k) {
  const pts = []
  let peak = -Infinity, ePeak = 0
  for (let i = 0; i <= 200; i++) {
    const e = -SPAN + i * 0.1
    const R = Phi(-e / sc) - k * Phi(-e / ss)
    pts.push([e, R])
    if (R > peak) { peak = R; ePeak = e }
  }
  return { pts, peak, ePeak }
}

function draw(cv, o) {
  const ctx = cv.getContext('2d'), W = cv.width, H = cv.height
  const L = 56, R = 16, T = 16, B = 44
  const X = (x) => L + ((x - o.x0) / (o.x1 - o.x0)) * (W - L - R)
  const Y = (y) => T + (1 - (y - o.y0) / (o.y1 - o.y0)) * (H - T - B)
  ctx.fillStyle = '#0b1127'
  ctx.fillRect(0, 0, W, H)
  ctx.font = '22px system-ui'
  ctx.fillStyle = '#93a0c8'
  ctx.strokeStyle = 'rgba(140,170,255,0.14)'
  ctx.lineWidth = 1
  ctx.textAlign = 'center'
  for (let x = -10; x <= 10; x += 5) {
    ctx.beginPath(); ctx.moveTo(X(x), T); ctx.lineTo(X(x), H - B); ctx.stroke()
    ctx.fillText(String(x), X(x), H - 14)
  }
  ctx.textAlign = 'right'
  ctx.fillText('0', L - 10, Y(0) + 7)
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'
  ctx.beginPath(); ctx.moveTo(L, Y(0)); ctx.lineTo(W - R, Y(0)); ctx.stroke()

  if (o.bars) {
    const bw = ((W - L - R) / (o.x1 - o.x0)) * 0.1 + 1
    o.bars.forEach(([x, y]) => {
      ctx.fillStyle = y >= 0 ? 'rgba(255,185,56,0.35)' : 'rgba(91,140,255,0.4)'
      ctx.fillRect(X(x), Math.min(Y(y), Y(0)), bw, Math.abs(Y(y) - Y(0)))
    })
  }
  ;(o.vlines || []).forEach((x) => {
    ctx.setLineDash([8, 8]); ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(X(x), T); ctx.lineTo(X(x), H - B); ctx.stroke()
  })
  ;(o.hlines || []).forEach((h) => {
    ctx.setLineDash([10, 8]); ctx.strokeStyle = h.color; ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(L, Y(h.y)); ctx.lineTo(W - R, Y(h.y)); ctx.stroke()
  })
  o.lines.forEach((ln) => {
    ctx.setLineDash(ln.dash || [])
    ctx.strokeStyle = ln.color
    ctx.lineWidth = ln.w
    ctx.beginPath()
    ln.pts.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))))
    ctx.stroke()
  })
  ctx.setLineDash([])
  ;(o.dots || []).forEach((d) => {
    ctx.fillStyle = d.color
    ctx.beginPath(); ctx.arc(X(d.x), Y(d.y), 9, 0, Math.PI * 2); ctx.fill()
  })
}

const Frac = ({ n, d }) => <span className="frac"><span>{n}</span><span>{d}</span></span>

export default function MathModal({ initial, onClose }) {
  const [m, setM] = useState({
    center: initial.center ?? 1,
    surroundW: initial.surroundW ?? 3,
    strength: initial.strength ?? 0.9,
  })
  const hat = useRef(null)
  const edge = useRef(null)
  const closeRef = useRef(null)

  const sc = m.center, ss = sc * m.surroundW, k = m.strength
  const r0 = boundary(m)
  const ec = useMemo(() => edgeCurve(sc, ss, k), [sc, ss, k])
  const uniform = 1 - k

  useEffect(() => { closeRef.current?.focus() }, [])
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // plot 1: centre, surround and their difference (the Mexican hat), all relative to the centre peak
  useEffect(() => {
    const c0 = gauss(0, sc)
    const cen = [], sur = [], dif = []
    for (let i = 0; i <= 200; i++) {
      const x = -SPAN + i * 0.1, r2 = x * x
      const c = gauss(r2, sc) / c0, s = (k * gauss(r2, ss)) / c0
      cen.push([x, c]); sur.push([x, s]); dif.push([x, c - s])
    }
    const lo = Math.min(-0.2, ...dif.map((p) => p[1])) * 1.15
    draw(hat.current, {
      x0: -SPAN, x1: SPAN, y0: lo, y1: 1.1, bars: dif, vlines: [-r0, r0],
      lines: [
        { pts: cen, color: AMBER, w: 3, dash: [10, 8] },
        { pts: sur, color: BLUE, w: 3, dash: [10, 8] },
        { pts: dif, color: '#ffffff', w: 5 },
      ],
    })
  }, [sc, ss, k, r0])

  // plot 2: response to an edge as a function of where the edge is, versus uniform light
  useEffect(() => {
    const lo = Math.min(0, ...ec.pts.map((p) => p[1])) - 0.08
    const hi = Math.max(1, ec.peak, uniform) * 1.08
    draw(edge.current, {
      x0: -SPAN, x1: SPAN, y0: lo, y1: hi,
      hlines: [{ y: uniform, color: AMBER }],
      lines: [{ pts: ec.pts, color: CYAN, w: 5 }],
      dots: [{ x: ec.ePeak, y: ec.peak, color: '#ffffff' }],
    })
  }, [ec, uniform])

  const set = (key) => (e) => setM((o) => ({ ...o, [key]: parseFloat(e.target.value) }))
  const ratio = uniform > 0.005 ? ec.peak / uniform : null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal math-modal" role="dialog" aria-modal="true" aria-label="The maths behind the model" onClick={(e) => e.stopPropagation()}>
        <button ref={closeRef} className="modal-close" onClick={onClose} aria-label="Close">×</button>
        <span className="tag">The maths behind the model</span>
        <h3>How two bell curves become a Mexican hat</h3>
        <p className="lead">Every number in the simulator comes from the steps below. Move the sliders and the graphs update.</p>

        <div className="math-controls">
          <label>Centre width σc <output>{sc.toFixed(1)}</output>
            <input type="range" min="0.5" max="3" step="0.1" value={sc} onChange={set('center')} />
          </label>
          <label>Surround width (× centre) <output>{m.surroundW.toFixed(1)}</output>
            <input type="range" min="1.5" max="6" step="0.1" value={m.surroundW} onChange={set('surroundW')} />
          </label>
          <label>Surround strength k <output>{k.toFixed(2)}</output>
            <input type="range" min="0" max="2" step="0.05" value={k} onChange={set('strength')} />
          </label>
        </div>

        <ol className="math-steps">
          <li>
            <h4>A Gaussian is a bell curve</h4>
            <p>
              It describes how a value fades with the distance <i>r</i> from the middle. The width σ (sigma) sets how fast it fades.
              The factor in front makes the total volume under the curve exactly 1, so a wide Gaussian is low and a narrow one is tall.
            </p>
            <div className="formula">
              <i>G</i>(<i>r</i>, σ) = <Frac n="1" d="2πσ²" /> · e<sup>−<i>r</i>² / 2σ²</sup>
            </div>
          </li>

          <li>
            <h4>The receptive field uses two of them</h4>
            <p>
              A narrow one for the centre and a wide one for the surround. The surround is σs = σc × (surround width) and it is
              scaled by a strength k, because the surround is weaker than the centre.
            </p>
            <div className="formula">σc = {sc.toFixed(1)}  ·  σs = {ss.toFixed(1)}  ·  k = {k.toFixed(2)}</div>
          </li>

          <li>
            <h4>Subtract the surround from the centre</h4>
            <p>
              That difference is the DoG. It is positive in the middle (light excites), dips below zero in a ring around it
              (light suppresses), and fades to zero far away. That shape is the Mexican hat.
            </p>
            <div className="formula">
              <i>RF</i>(<i>r</i>) = <i>G</i>(<i>r</i>, σc) − <i>k</i> · <i>G</i>(<i>r</i>, σs)
            </div>
            <canvas ref={hat} width="1000" height="360" className="math-plot" aria-label="Centre, surround and their difference" />
            <div className="legend">
              <span><i style={{ borderColor: AMBER, borderTopStyle: 'dashed' }} />centre G(r, σc)</span>
              <span><i style={{ borderColor: BLUE, borderTopStyle: 'dashed' }} />surround k·G(r, σs)</span>
              <span><i style={{ borderColor: '#fff' }} />difference (the hat)</span>
            </div>
            <p className="note">x-axis: distance from the middle of the field (model units). For an OFF-center cell the whole curve is flipped upside down: <i>RF</i> → −<i>RF</i>.</p>
          </li>

          <li>
            <h4>Where does the centre end?</h4>
            <p>
              The boundary is where the hat crosses zero, so the centre curve equals the surround curve. Solving for <i>r</i> gives the
              dashed lines in the graph. With your settings it lies at <strong>r = {r0.toFixed(2)}</strong>.
            </p>
            <div className="formula">
              <i>r</i><sub>0</sub> = √( <Frac n={<>2 ln( σs² / (<i>k</i> σc²) )</>} d={<>1/σc² − 1/σs²</>} /> )
            </div>
          </li>

          <li>
            <h4>From receptive field to firing rate</h4>
            <p>
              The stimulus <i>S</i>(x, y) is 0 where it is dark and equal to the contrast where it is lit. Multiply it with the
              receptive field at every point and add everything up. That sum is the net push on the cell. The firing rate is the
              20 spikes/s baseline plus 100 times this push, kept between 0 and 120.
            </p>
            <div className="formula">
              <i>R</i> = ∬ <i>RF</i>(x, y) · <i>S</i>(x, y) dx dy   →   rate = 20 + 100 · <i>R</i>
            </div>
          </li>

          <li>
            <h4>Why edges beat uniform light</h4>
            <p>
              Each Gaussian adds up to exactly 1, so the whole field adds up to <strong>1 − k</strong>. With uniform light of contrast
              <i> c</i>, the push is only <i>c</i>(1 − k) = <strong>{uniform.toFixed(2)}</strong> × <i>c</i>. The centre and the surround
              almost cancel.
            </p>
            <p>
              An edge lights only part of the field. If the light covers everything to the right of position <i>e</i>, the push is
              (with Φ the standard normal curve):
            </p>
            <div className="formula">
              <i>R</i>(<i>e</i>) = <i>c</i> · [ Φ(−<i>e</i>/σc) − <i>k</i> · Φ(−<i>e</i>/σs) ]
            </div>
            <canvas ref={edge} width="1000" height="360" className="math-plot" aria-label="Response to an edge versus uniform light" />
            <div className="legend">
              <span><i style={{ borderColor: CYAN }} />response to an edge at position e</span>
              <span><i style={{ borderColor: AMBER, borderTopStyle: 'dashed' }} />response to uniform light</span>
            </div>
            <p className="note">x-axis: position e of the edge. Left side = light covers the whole field, right side = dark.</p>
            <div className="callout">
              {ratio
                ? <>The best edge position (white dot, e = {ec.ePeak.toFixed(1)}) pushes the cell <strong>{ec.peak.toFixed(2)}</strong>, which is about <strong>{ratio.toFixed(1)}×</strong> more than uniform light ({uniform.toFixed(2)}).</>
                : <>With k = {k.toFixed(2)} the centre and surround cancel completely: uniform light gives no response at all, but the best edge pushes the cell <strong>{ec.peak.toFixed(2)}</strong>.</>}
              {' '}An OFF-center cell gives the same result for a dark edge.
            </div>
          </li>
        </ol>
      </div>
    </div>
  )
}
