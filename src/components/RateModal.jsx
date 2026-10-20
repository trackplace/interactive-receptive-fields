import { useEffect, useMemo, useRef, useState } from 'react'
import { parts, rateFromR, bestEdge } from './model'

const AMBER = '#ffb938', BLUE = '#5b8cff', CYAN = '#5eead4'
const sgn = (v, d = 2) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(d)

// plot: firing rate as a function of the stimulus contrast, for the current receptive field and stimulus shape
function drawCurve(cv, R1, contrast) {
  const ctx = cv.getContext('2d'), W = cv.width, H = cv.height
  const L = 70, R = 16, T = 16, B = 52
  const X = (c) => L + ((c + 1) / 2) * (W - L - R)
  const Y = (r) => T + (1 - r / 120) * (H - T - B)
  ctx.fillStyle = '#0b1127'
  ctx.fillRect(0, 0, W, H)
  ctx.font = '22px system-ui'
  ctx.lineWidth = 1
  for (let r = 0; r <= 120; r += 20) {
    ctx.strokeStyle = 'rgba(140,170,255,0.14)'
    ctx.beginPath(); ctx.moveTo(L, Y(r)); ctx.lineTo(W - R, Y(r)); ctx.stroke()
    ctx.fillStyle = '#93a0c8'; ctx.textAlign = 'right'; ctx.fillText(String(r), L - 10, Y(r) + 7)
  }
  ctx.textAlign = 'center'
  ;[-1, -0.5, 0, 0.5, 1].forEach((c) => {
    ctx.strokeStyle = 'rgba(140,170,255,0.14)'
    ctx.beginPath(); ctx.moveTo(X(c), T); ctx.lineTo(X(c), H - B); ctx.stroke()
    ctx.fillStyle = '#93a0c8'; ctx.fillText(String(c), X(c), H - B + 28)
  })
  ctx.fillStyle = '#e8edff'
  ctx.fillText('stimulus contrast (dark ← → bright)', L + (W - L - R) / 2, H - 6)
  ctx.save()
  ctx.translate(18, T + (H - T - B) / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText('firing rate (spikes/s)', 0, 0)
  ctx.restore()

  ctx.setLineDash([10, 8]); ctx.strokeStyle = AMBER; ctx.lineWidth = 3
  ctx.beginPath(); ctx.moveTo(L, Y(20)); ctx.lineTo(W - R, Y(20)); ctx.stroke()
  ctx.setLineDash([])
  ctx.strokeStyle = CYAN; ctx.lineWidth = 5
  ctx.beginPath()
  for (let i = 0; i <= 100; i++) {
    const c = -1 + i * 0.02
    const r = rateFromR(c * R1)
    i ? ctx.lineTo(X(c), Y(r)) : ctx.moveTo(X(c), Y(r))
  }
  ctx.stroke()
  ctx.fillStyle = '#fff'
  ctx.beginPath(); ctx.arc(X(contrast), Y(rateFromR(contrast * R1)), 10, 0, Math.PI * 2); ctx.fill()
}

// a bar around a zero line, for signed pushes
function PushBar({ label, value, scale, color }) {
  const w = Math.min(50, (Math.abs(value) / scale) * 50)
  return (
    <div className="push">
      <span>{label}</span>
      <div className="track">
        <i style={{ width: w + '%', left: value >= 0 ? '50%' : 50 - w + '%', background: color }} />
      </div>
      <output>{sgn(value)}</output>
    </div>
  )
}

// a bar from zero, for firing rates, with a tick at the 20 spikes/s baseline
function RateBar({ label, value, color }) {
  return (
    <div className="push rate">
      <span>{label}</span>
      <div className="track">
        <i style={{ width: (value / 120) * 100 + '%', left: 0, background: color }} />
        <b style={{ left: (20 / 120) * 100 + '%' }} />
      </div>
      <output>{value.toFixed(0)}</output>
    </div>
  )
}

export default function RateModal({ initial, onClose }) {
  const [m, setM] = useState({
    type: initial.type ?? 'on',
    stimulus: initial.stimulus ?? 'spot',
    contrast: initial.contrast ?? 0.5,
    radius: initial.radius ?? 2,
    position: initial.position ?? 0,
    center: initial.center ?? 1,
    surroundW: initial.surroundW ?? 3,
    strength: initial.strength ?? 0.9,
  })
  const closeRef = useRef(null)
  const curve = useRef(null)
  const set = (key) => (e) =>
    setM((o) => ({ ...o, [key]: typeof o[key] === 'number' ? parseFloat(e.target.value) : e.target.value }))

  const pt = useMemo(() => parts(m), [m])
  const rate = rateFromR(pt.net)
  const raw = 20 + 100 * pt.net
  const R1 = useMemo(() => parts({ ...m, contrast: 1 }).net, [m.type, m.stimulus, m.radius, m.position, m.center, m.surroundW, m.strength])
  const cmp = useMemo(() => {
    const uni = rateFromR(parts({ ...m, stimulus: 'uniform' }).net)
    const spot = rateFromR(parts({ ...m, stimulus: 'spot', position: 0 }).net)
    const e = bestEdge(m)
    return { uni, spot, edge: rateFromR(e.R), e: e.e }
  }, [m])

  useEffect(() => { closeRef.current?.focus() }, [])
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  useEffect(() => { drawCurve(curve.current, R1, m.contrast) }, [R1, m.contrast])

  const scale = Math.max(0.3, Math.abs(pt.centre), Math.abs(pt.surround), Math.abs(pt.net))
  const dev = [cmp.uni, cmp.spot, cmp.edge].map((v) => v - 20)
  const up = Math.max(...dev), down = Math.min(...dev)
  const isi = rate > 0.5 ? 1000 / rate : null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal math-modal rate-modal" role="dialog" aria-modal="true" aria-label="How the firing rate is calculated" onClick={(e) => e.stopPropagation()}>
        <button ref={closeRef} className="modal-close" onClick={onClose} aria-label="Close">×</button>
        <span className="tag">From stimulus to spikes</span>
        <h3>Where the firing rate comes from</h3>
        <p className="lead">
          The spikes in the oscilloscope are not decoration. How often they fire is calculated from the stimulus and the
          receptive field. Change the settings here and follow every step.
        </p>

        <div className="math-controls rate-controls">
          <div className="seg" role="radiogroup" aria-label="Cell type">
            {['on', 'off'].map((t) => (
              <label key={t}>
                <input type="radio" name="rate-type" value={t} checked={m.type === t} onChange={() => setM((o) => ({ ...o, type: t }))} />
                {t === 'on' ? 'ON-center' : 'OFF-center'}
              </label>
            ))}
          </div>
          <label>Stimulus
            <select value={m.stimulus} onChange={set('stimulus')}>
              <option value="spot">Circular spot</option>
              <option value="edge">Light-dark edge</option>
              <option value="uniform">Uniform illumination</option>
            </select>
          </label>
          <label>Contrast <output>{m.contrast.toFixed(2)}</output>
            <input type="range" min="-1" max="1" step="0.05" value={m.contrast} onChange={set('contrast')} />
          </label>
          <label>Surround strength <output>{m.strength.toFixed(2)}</output>
            <input type="range" min="0" max="2" step="0.05" value={m.strength} onChange={set('strength')} />
          </label>
        </div>
        <p className="note">
          Taken from the simulator: centre width {m.center.toFixed(1)}, surround {m.surroundW.toFixed(1)}× wider
          {m.stimulus === 'spot' && <>, spot radius {m.radius.toFixed(1)}</>}
          {m.stimulus !== 'uniform' && <>, position {m.position.toFixed(1)}</>}.
        </p>

        <ol className="math-steps">
          <li>
            <h4>The receptive field weighs the light</h4>
            <p>
              Every spot of the stimulus is multiplied by the weight of the receptive field at that spot. Light on the centre pushes
              the cell one way, light on the surround pushes it the other way. Adding up all spots gives one number: the net push R.
            </p>
            <PushBar label="Centre push" value={pt.centre} scale={scale} color={AMBER} />
            <PushBar label="Surround push" value={pt.surround} scale={scale} color={BLUE} />
            <PushBar label="Net push R" value={pt.net} scale={scale} color={CYAN} />
            <div className="formula"><i>R</i> = {sgn(pt.centre)} {pt.surround >= 0 ? '+' : '−'} {Math.abs(pt.surround).toFixed(2)} = <strong>{sgn(pt.net)}</strong></div>
            <p className="note">
              {m.type === 'on'
                ? 'ON-center: light on the centre pushes up, light on the surround pushes down.'
                : 'OFF-center: everything is flipped. Light on the centre pushes down, light on the surround pushes up.'}
            </p>
          </li>

          <li>
            <h4>The net push becomes a firing rate</h4>
            <p>
              The cell never stops firing: with no push at all it fires 20 spikes/s (the baseline). Each unit of push adds 100 spikes/s.
              The result is kept between 0 and 120. A cell cannot fire a negative number of spikes.
            </p>
            <div className="formula">
              rate = 20 + 100 × <i>R</i> = 20 + 100 × {sgn(pt.net)} = {raw.toFixed(0)}
              {Math.abs(raw - rate) > 0.5 && <> → limited to <strong>{rate.toFixed(0)}</strong></>}
              {Math.abs(raw - rate) <= 0.5 && <> spikes/s</>}
            </div>
            <canvas ref={curve} width="1000" height="380" className="math-plot" aria-label="Firing rate versus contrast" />
            <div className="legend">
              <span><i style={{ borderColor: CYAN }} />rate for this stimulus shape at each contrast</span>
              <span><i style={{ borderColor: AMBER, borderTopStyle: 'dashed' }} />baseline (20 spikes/s)</span>
              <span>white dot = your contrast</span>
            </div>
            <p className="note">
              Above the baseline the cell says “more than expected”, below it says “less”. The baseline is what lets one cell report
              both a brighter and a darker stimulus.
            </p>
          </li>

          <li>
            <h4>Which stimulus makes this cell fire most?</h4>
            <p>
              This is our research question in numbers. These are the strongest rates each stimulus type can produce with the current
              cell and contrast: a spot centred on the field, an edge at its best position (e = {cmp.e.toFixed(1)}), and uniform light.
            </p>
            <RateBar label="Uniform light" value={cmp.uni} color="#93a0c8" />
            <RateBar label="Centred spot" value={cmp.spot} color={AMBER} />
            <RateBar label="Best edge" value={cmp.edge} color={CYAN} />
            <div className="callout">
              {up > 1 && <>Uniform light gives only <strong>{cmp.uni.toFixed(0)}</strong> spikes/s, because the centre and the surround push against each other. The best edge reaches <strong>{cmp.edge.toFixed(0)}</strong>, and a centred spot <strong>{cmp.spot.toFixed(0)}</strong>. The more a stimulus lights the centre without lighting the surround as well (or the other way round), the further the rate moves from the baseline.</>}
              {up <= 1 && down < -1 && <>With these settings the stimulus only <em>suppresses</em> the cell (rates below 20). An {m.type === 'on' ? 'ON-center cell wants a bright stimulus (positive contrast)' : 'OFF-center cell wants a dark stimulus (negative contrast)'}. Try flipping the contrast.</>}
              {up <= 1 && down >= -1 && <>With these settings almost nothing changes the cell’s rate. Try a higher contrast or a stronger surround.</>}
            </div>
          </li>

          <li>
            <h4>From firing rate to spikes</h4>
            <p>
              In the oscilloscope, the membrane potential (the voltage inside the cell) climbs from about −72 mV towards the threshold
              of −50 mV. When it gets there, the cell fires a spike and the voltage resets. A larger push means a steeper climb, so the
              spikes come closer together.
              {isi ? <> At <strong>{rate.toFixed(0)}</strong> spikes/s, that is one spike about every <strong>{isi.toFixed(0)} ms</strong>.</> : <> At 0 spikes/s the cell stays silent.</>}
            </p>
            <p className="note">
              Spikes are all-or-nothing, so the information is in the rate. In the graph they are drawn wider than real life (about 1 ms)
              so you can see them, and the time can be slowed down.
            </p>
          </li>

          <li>
            <h4>Which setting changes what?</h4>
            <dl className="params">
              <dt>Cell type</dt>
              <dd>ON cells go up for light on the centre, OFF cells go up for darkness on the centre. Both pushes flip sign.</dd>
              <dt>Centre width</dt>
              <dd>A wider centre collects more light, so the centre push grows. It also moves the centre/surround boundary outwards.</dd>
              <dt>Surround width and strength</dt>
              <dd>A stronger or wider surround subtracts more. At strength 0 the cell only measures brightness. Near full strength, uniform light cancels out.</dd>
              <dt>Contrast</dt>
              <dd>Both pushes grow in proportion to contrast: double the contrast, double the push (until the 0 or 120 limit).</dd>
              <dt>Stimulus type, size and position</dt>
              <dd>They decide how much of the centre and how much of the surround is lit. That balance decides the net push.</dd>
            </dl>
          </li>
        </ol>
      </div>
    </div>
  )
}