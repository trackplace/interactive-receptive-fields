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

export function response(p) {
  const d = 0.25
  let sum = 0
  for (let x = -14; x <= 14; x += d) for (let y = -14; y <= 14; y += d) sum += rf(x, y, p) * stim(x, y, p)
  const R = sum * d * d
  return Math.max(0, Math.min(120, 20 + 100 * R)) // 20 Hz baseline
}

// where the DoG crosses zero = boundary between centre and surround
export function boundary(p) {
  if (p.strength < 0.05) return 2 * p.center
  const sc = p.center, ss = sc * p.surroundW
  const num = 2 * Math.log((ss * ss) / (p.strength * sc * sc))
  const den = 1 / (sc * sc) - 1 / (ss * ss)
  return num > 0 ? Math.sqrt(num / den) : sc
}
