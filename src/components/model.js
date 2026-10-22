export const SPAN = 10

// 2D Gaussian (bell curve) that integrates to 1. r2 = squared distance from the middle, s = sigma (width)
export const gauss = (r2, s) => Math.exp(-r2 / (2 * s * s)) / (2 * Math.PI * s * s)

export function rf(x, y, p) {
  const sc = p.center
  const ss = sc * p.surroundW
  const r2 = x * x + y * y
  const c = Math.exp(-r2 / (2 * sc * sc)) / (2 * Math.PI * sc * sc)
  const s = Math.exp(-r2 / (2 * ss * ss)) / (2 * Math.PI * ss * ss)
  return (p.type === 'on' ? 1 : -1) * (c - p.strength * s)
}

export function stim(x, y, p) {
  if (p.stimulus === 'uniform') return p.contrast
  if (p.stimulus === 'edge') return x > p.position ? p.contrast : 0
  return (x - p.position) ** 2 + y * y <= p.radius ** 2 ? p.contrast : 0
}

// net push -> firing rate: 20 spikes/s baseline, 100 spikes/s per unit of push, limited to 0..120
export const rateFromR = (R) => Math.max(0, Math.min(120, 20 + 100 * R))

// The net push R on the cell, split into what the centre and the surround contribute.
// R = centre + surround. For an ON cell, light on the centre pushes up and light on the surround pushes down.
export function parts(p) {
  const d = 0.25
  const sc = p.center, ss = sc * p.surroundW
  const sign = p.type === 'on' ? 1 : -1
  let c = 0, s = 0
  for (let x = -14; x <= 14; x += d)
    for (let y = -14; y <= 14; y += d) {
      const v = stim(x, y, p)
      if (!v) continue
      const r2 = x * x + y * y
      c += gauss(r2, sc) * v
      s += gauss(r2, ss) * v
    }
  const centre = sign * c * d * d
  const surround = -sign * p.strength * s * d * d
  return { centre, surround, net: centre + surround }
}

export function response(p) {
  return rateFromR(parts(p).net)
}

// where the DoG crosses zero = boundary between centre and surround
export function boundary(p) {
  if (p.strength < 0.05) return 2 * p.center
  const sc = p.center, ss = sc * p.surroundW
  const num = 2 * Math.log((ss * ss) / (p.strength * sc * sc))
  const den = 1 / (sc * sc) - 1 / (ss * ss)
  return num > 0 ? Math.sqrt(num / den) : sc
}

// error function (Abramowitz & Stegun 7.1.26) -> normal CDF
const erf = (x) => {
  const s = Math.sign(x)
  x = Math.abs(x)
  const t = 1 / (1 + 0.3275911 * x)
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x)
  return s * y
}
export const Phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2))

// The strongest push an edge can give (light on the right of position e), over all edge positions.
// Closed form: R(e) = sign * c * [ Phi(-e/sigma_c) - k * Phi(-e/sigma_s) ]
export function bestEdge(p) {
  const sc = p.center, ss = sc * p.surroundW
  const sign = p.type === 'on' ? 1 : -1
  let best = -Infinity, at = 0
  for (let i = 0; i <= 200; i++) {
    const e = -SPAN + i * 0.1
    const R = sign * p.contrast * (Phi(-e / sc) - p.strength * Phi(-e / ss))
    if (R > best) { best = R; at = e }
  }
  return { R: best, e: at }
}