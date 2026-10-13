// Tiny dependency-free confetti burst. Call confetti(x, y) with viewport coordinates.
const COLORS = ['#ffb938', '#ffd166', '#5b8cff', '#5eead4', '#a78bfa', '#ff7eb6', '#ffffff']

export function confetti(x, y) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const cv = document.createElement('canvas')
  Object.assign(cv.style, { position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2000 })
  document.body.appendChild(cv)
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const W = window.innerWidth, H = window.innerHeight
  cv.width = W * dpr
  cv.height = H * dpr
  const ctx = cv.getContext('2d')
  ctx.scale(dpr, dpr)

  const parts = []
  const burst = (n, spread, angle, speed) => {
    for (let i = 0; i < n; i++) {
      const a = angle + (Math.random() - 0.5) * spread
      const v = speed * (0.4 + Math.random() * 0.9)
      parts.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        w: 6 + Math.random() * 7, h: 4 + Math.random() * 5,
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
        c: COLORS[i % COLORS.length], round: Math.random() < 0.3,
        life: 0, max: 2.2 + Math.random() * 1.2, wob: Math.random() * 6,
      })
    }
  }
  burst(120, 1.7, -Math.PI / 2, 950) // upward fan
  burst(60, Math.PI * 2, 0, 520) // radial pop

  let last = performance.now()
  const step = (now) => {
    const dt = Math.min(0.033, (now - last) / 1000)
    last = now
    ctx.clearRect(0, 0, W, H)
    let alive = false
    for (const p of parts) {
      p.life += dt
      if (p.life > p.max) continue
      alive = true
      const drag = Math.exp(-1.6 * dt)
      p.vx *= drag
      p.vy = p.vy * drag + 900 * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.rot += p.vr
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.scale(1, Math.cos(p.life * 10 + p.wob)) // flutter
      ctx.globalAlpha = Math.min(1, (p.max - p.life) / 0.6)
      ctx.fillStyle = p.c
      ctx.shadowColor = p.c
      ctx.shadowBlur = 8
      if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.h / 1.5, 0, 7); ctx.fill() }
      else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
      ctx.restore()
    }
    if (alive) requestAnimationFrame(step)
    else cv.remove()
  }
  requestAnimationFrame(step)
}