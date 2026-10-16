// Side-on cross-section of the cells behind one receptive field. It shares the DoG graph's x-axis:
// every receptor's colour and brightness is its weight in the curve, so the diagram reacts to the sliders.
// Cell names are clickable: pass onTerm (from useGlossary().openTerm) to open their explanation box.
import { rf, boundary, SPAN } from './model'

const AMBER = '#ffb938', BLUE = '#5b8cff', ORANGE = '#ff9f43', GREEN = '#34d399', PURPLE = '#a78bfa', CYAN = '#5eead4'
const S = 23, CX = 300 // px per model unit, centre of the diagram
const XS = Array.from({ length: 26 }, (_, i) => -SPAN + i * 0.8)
const px = (x) => CX + x * S

function Badge({ x, y, sign, color, o = 1 }) {
  return (
    <g opacity={o} style={{ transition: 'opacity .4s' }}>
      <circle cx={x} cy={y} r="12" fill="#0b1127" stroke={color} strokeWidth="2" style={{ transition: 'stroke .4s' }} />
      <text x={x} y={y + 6} textAnchor="middle" fontSize="18" fontWeight="800" fill="#fff">{sign}</text>
    </g>
  )
}

export default function Biology({ p, rate = 20, onTerm }) {
  const on = p.type === 'on'
  const cCol = on ? AMBER : BLUE, sCol = on ? BLUE : AMBER
  const peak = Math.abs(rf(0, 0, p)) || 1
  const r0 = boundary(p), rOut = Math.min(2.2 * p.center * p.surroundW, SPAN)
  const hasS = p.strength >= 0.05
  const sk = Math.min(p.strength, 1.5) / 1.5
  const lbl = { fontSize: 15, fontWeight: 700, fontFamily: 'system-ui, sans-serif' }
  // makes an SVG text clickable
  const link = (id) => ({ onClick: () => onTerm?.(id), className: 'svg-link' })

  // stimulus extent in model units
  let x1 = -SPAN, x2 = SPAN
  if (p.stimulus === 'spot') { x1 = p.position - p.radius; x2 = p.position + p.radius }
  if (p.stimulus === 'edge') x1 = p.position
  x1 = Math.max(-SPAN, x1); x2 = Math.min(SPAN, x2)
  const lit = x2 > x1, c = p.contrast, ac = Math.abs(c)
  const arrows = []
  for (let x = Math.ceil(x1 / 1.6) * 1.6; x <= x2; x += 1.6) arrows.push(x)

  const bracket = (a, b, col, text, key) => {
    const xa = Math.max(70, a), xb = Math.min(530, b)
    if (xb - xa < 8) return null
    return (
      <g key={key}>
        <path d={`M${xa} 372 V378 H${xb} V372`} stroke={col} strokeWidth="2.5" fill="none" style={{ transition: 'stroke .4s' }} />
        {xb - xa > 46 && <text x={(xa + xb) / 2} y="398" textAnchor="middle" fill={col} {...lbl} {...link(text === 'Centre' ? 'centre' : 'surround')}>{text}</text>}
      </g>
    )
  }

  return (
    <svg viewBox="0 0 600 426" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Cells behind a receptive field">
      <defs>
        <filter id="bio-glow" filterUnits="userSpaceOnUse" x="-20" y="-20" width="640" height="470">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* stimulus: light column, bar and arrows */}
      <text x="22" y="26" fill="#e8edff" {...lbl} opacity="0.8">light</text>
      {lit && (
        <g>
          <rect x={px(x1)} y="40" width={(x2 - x1) * S} height="262" fill={CYAN} opacity={0.03 + 0.1 * ac} />
          <rect x={px(x1)} y="33" width={(x2 - x1) * S} height="8" rx="4" fill={c >= 0 ? '#fff' : '#02040c'} fillOpacity={c >= 0 ? 0.12 + 0.88 * c : 0.9}
                stroke={CYAN} strokeWidth="1.5" strokeDasharray="5 4" filter="url(#bio-glow)" />
          {c > 0.02 && arrows.map((x) => (
            <path key={x} d={`M${px(x)} 6 v20 m-6 -7 l6 7 l6 -7`} stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity={0.2 + 0.8 * c} filter="url(#bio-glow)" />
          ))}
        </g>
      )}

      {/* ganglion cell + axon */}
      <path d="M326 78 H560" stroke={PURPLE} strokeWidth="5" strokeLinecap="round" filter="url(#bio-glow)" />
      <path d="M552 68 l14 10 l-14 10" stroke={PURPLE} strokeWidth="4" fill="none" strokeLinecap="round" />
      <text x="446" y="66" textAnchor="middle" fill={PURPLE} {...lbl} fontSize="13">to the brain</text>
      <circle className="bio-pulse" cx="300" cy="78" r="26" fill="none" stroke={PURPLE} strokeWidth="3" style={{ animationDuration: `${Math.max(0.25, Math.min(3, 48 / Math.max(rate, 8)))}s` }} />
      <circle cx="300" cy="78" r="26" fill={PURPLE} fillOpacity={0.5 + 0.5 * Math.min(1, rate / 120)} filter="url(#bio-glow)" />
      <text x="266" y="76" textAnchor="end" fill={PURPLE} {...lbl} {...link('ganglion')}>Ganglion cell</text>
      <text x="266" y="95" textAnchor="end" fill="#e8edff" {...lbl} fontSize="13" opacity="0.8">{Math.round(rate)} spikes/s</text>

      {/* bipolar cell */}
      <path d="M300 104 V132" stroke={GREEN} strokeWidth="4" filter="url(#bio-glow)" />
      <ellipse cx="300" cy="160" rx="19" ry="29" fill={GREEN} filter="url(#bio-glow)" />
      <text x="272" y="166" textAnchor="end" fill={GREEN} {...lbl} {...link('bipolar')}>Bipolar cell</text>

      {/* surround pathway: horizontal cell -> bipolar, thickness and glow follow the surround strength */}
      {hasS && [
        'M390 233 C390 210 340 210 316 184',
        'M210 233 C210 210 260 210 284 184',
      ].map((d) => (
        <path key={d} d={d} stroke={sCol} strokeWidth={1.5 + 3.5 * sk} strokeOpacity={0.3 + 0.7 * sk} strokeDasharray="7 5" fill="none" filter="url(#bio-glow)" style={{ transition: 'stroke .4s' }} />
      ))}
      {hasS && <Badge x={252} y={211} sign={on ? '−' : '+'} color={sCol} o={0.35 + 0.65 * sk} />}
      {hasS && <Badge x={348} y={211} sign={on ? '−' : '+'} color={sCol} o={0.35 + 0.65 * sk} />}

      {/* horizontal cell */}
      <rect x="70" y="225" width="460" height="16" rx="8" fill={ORANGE} fillOpacity={0.3 + 0.6 * sk} filter="url(#bio-glow)" />
      <text x="74" y="216" fill={ORANGE} {...lbl} {...link('horizontal')}>Horizontal cell</text>

      {/* centre/surround boundary, same dashed lines as the DoG graph */}
      {[-r0, r0].map((x) => (
        <path key={x} d={`M${px(x)} 243 V372`} stroke="#fff" strokeOpacity="0.4" strokeWidth="1.5" strokeDasharray="4 4" />
      ))}

      {/* photoreceptors: colour = sign of the DoG weight, brightness = its size */}
      {XS.map((x) => {
        const v = rf(x, 0, p) / peak, a = Math.pow(Math.abs(v), 0.55), s = Math.min(1, a * 1.1 + 0.1) // gamma so weak surround weights stay visible
        const col = v >= 0 ? AMBER : BLUE, centre = Math.abs(x) < r0, X = px(x)
        const end = CX + (X - CX) * 0.12
        return (
          <g key={x.toFixed(1)}>
            {centre
              ? <path d={`M${X} 300 C${X} 262 ${end} 250 ${end} 192`} stroke={col} strokeWidth={1.5 + 2.5 * a} strokeOpacity={s} fill="none" filter="url(#bio-glow)" style={{ transition: 'stroke .4s' }} />
              : a > 0.04 && <path d={`M${X} 300 V243`} stroke={col} strokeWidth={1 + 2.5 * a} strokeOpacity={s} filter="url(#bio-glow)" style={{ transition: 'stroke .4s' }} />}
            <g filter="url(#bio-glow)">
              <rect x={X - 7.5} y="300" width="15" height="46" rx="7" fill={col} fillOpacity={s} style={{ transition: 'fill .4s, fill-opacity .4s' }} />
              <path d={`M${X - 5.5} 346 L${X - 2} 362 H${X + 2} L${X + 5.5} 346 Z`} fill={col} fillOpacity={s * 0.6} style={{ transition: 'fill .4s' }} />
            </g>
          </g>
        )
      })}
      <Badge x={300} y={274} sign={on ? '+' : '−'} color={cCol} />

      {/* brackets and labels follow the real centre / surround extents */}
      {bracket(px(-r0), px(r0), cCol, 'Centre', 'c')}
      {hasS && bracket(px(-rOut), px(-r0) - 3, sCol, 'Surround', 'sl')}
      {hasS && bracket(px(r0) + 3, px(rOut), sCol, 'Surround', 'sr')}
      <text x="300" y="418" textAnchor="middle" fill="#93a0c8" {...lbl} fontSize="13" {...link('photoreceptor')}>photoreceptors (same x-axis as the DoG graph)</text>
    </svg>
  )
}