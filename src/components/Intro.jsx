import { useEffect, useRef, useState } from 'react'
import { Term } from './Glossary'

const W = 360
const H = 270
const RESEARCH_QUESTION =
  'How does the Difference-of-Gaussians model explain why ON- and OFF-center retinal ganglion cells respond most strongly to edges rather than uniform light?'

// Placeholder picture, used when no imageSrc is passed
function drawScene(ctx) {
  const g = ctx.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, '#f4d58d')
  g.addColorStop(1, '#5b8def')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#2b2d42'
  ctx.fillRect(40, 150, 120, 90)
  ctx.fillStyle = '#ef476f'
  ctx.beginPath()
  ctx.arc(250, 90, 55, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.moveTo(200, 240)
  ctx.lineTo(280, 140)
  ctx.lineTo(340, 240)
  ctx.fill()
  ctx.fillStyle = '#06d6a0'
  ctx.fillRect(0, 235, W, 35)
}

// Separable gaussian blur on a grayscale Float32Array
function blur(src, w, h, s) {
  const r = Math.ceil(s * 3)
  let k = []
  let sum = 0
  for (let i = -r; i <= r; i++) {
    const v = Math.exp(-(i * i) / (2 * s * s))
    k.push(v)
    sum += v
  }
  k = k.map((v) => v / sum)
  const clamp = (v, max) => Math.min(max - 1, Math.max(0, v))
  const tmp = new Float32Array(w * h)
  const out = new Float32Array(w * h)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let a = 0
      for (let i = -r; i <= r; i++) a += src[y * w + clamp(x + i, w)] * k[i + r]
      tmp[y * w + x] = a
    }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let a = 0
      for (let i = -r; i <= r; i++) a += tmp[clamp(y + i, h) * w + x] * k[i + r]
      out[y * w + x] = a
    }
  return out
}

const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

// The photo, plus the same photo after a difference-of-Gaussians filter.
// reveal (0..1) is how much of the picture, from the left, shows the filtered version.
// It is animated as a scanning sweep, and the person can drag across the picture to scrub it.
// k is the surround strength: 0 = cells ignore their surround (blurry photo), 1 = full centre-surround (edges only).
function EdgeImage({ src, started, k, replayKey }) {
  const cv = useRef(null)
  const origC = useRef(null)
  const dogC = useRef(null)
  const base = useRef(null)
  const raf = useRef(0)
  const playing = useRef(false)
  const lensY = useRef(H / 2)
  const [ready, setReady] = useState(false)
  const [reveal, setReveal] = useState(0)

  // load the picture and precompute the centre (narrow blur) and surround (wide blur) once
  useEffect(() => {
    origC.current = document.createElement('canvas')
    dogC.current = document.createElement('canvas')
    ;[origC.current, dogC.current].forEach((c) => { c.width = W; c.height = H })
    const oc = origC.current.getContext('2d', { willReadFrequently: true })
    const done = () => {
      const d = oc.getImageData(0, 0, W, H).data
      const gray = new Float32Array(W * H)
      for (let i = 0; i < W * H; i++) gray[i] = (0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]) / 255
      base.current = { centre: blur(gray, W, H, 1.2), surround: blur(gray, W, H, 3.6) }
      setReady(true)
    }
    if (src) {
      const im = new Image()
      im.onload = () => { oc.drawImage(im, 0, 0, W, H); done() }
      im.onerror = () => { drawScene(oc); done() }
      im.src = src
    } else {
      drawScene(oc)
      done()
    }
  }, [src])

  // re-render the filtered picture whenever the surround strength changes
  useEffect(() => {
    if (!ready) return
    const ctx = dogC.current.getContext('2d')
    const img = ctx.createImageData(W, H)
    const { centre, surround } = base.current
    for (let i = 0; i < W * H; i++) {
      // k = 0: just the blurred photo. k = 1: grey + 5 x (centre - surround), i.e. edges only
      const v = Math.max(0, Math.min(1, 0.5 * k + (1 + 4 * k) * (centre[i] - k * surround[i]))) * 255
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v
      img.data[i * 4 + 3] = 255
    }
    ctx.putImageData(img, 0, 0)
  }, [ready, k])

  // the scanning sweep
  const play = () => {
    cancelAnimationFrame(raf.current)
    playing.current = true
    const t0 = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / 3600)
      setReveal(ease(t))
      if (t < 1) raf.current = requestAnimationFrame(tick)
      else playing.current = false
    }
    raf.current = requestAnimationFrame(tick)
  }
  useEffect(() => {
    if (!started) { setReveal(0); return }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setReveal(1)
    else play()
    return () => cancelAnimationFrame(raf.current)
  }, [started, replayKey])

  // draw: original, filtered part clipped to the left of the scan line, then the scan line and the moving receptive field
  useEffect(() => {
    if (!ready) return
    const ctx = cv.current.getContext('2d')
    const x = reveal * W
    ctx.drawImage(origC.current, 0, 0)
    if (x > 0) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, x, H)
      ctx.clip()
      ctx.drawImage(dogC.current, 0, 0)
      ctx.restore()
    }
    if (reveal > 0.001 && reveal < 0.999) {
      ctx.save()
      ctx.shadowColor = '#5eead4'
      ctx.shadowBlur = 12
      ctx.strokeStyle = '#5eead4'
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
      // the "receptive field" scanning the picture: amber centre, blue surround ring
      const y = playing.current ? H * (0.5 + 0.36 * Math.sin(reveal * Math.PI * 8)) : lensY.current
      ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(91,140,255,0.3)'; ctx.fill()
      ctx.strokeStyle = '#5b8cff'; ctx.lineWidth = 3; ctx.stroke()
      ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2)
      ctx.fillStyle = '#ffb938'; ctx.shadowColor = '#ffb938'; ctx.fill()
      ctx.restore()
    }
  }, [ready, k, reveal])

  // drag across the picture to compare
  const seek = (e) => {
    if (!started) return
    cancelAnimationFrame(raf.current)
    playing.current = false
    const r = cv.current.getBoundingClientRect()
    lensY.current = ((e.clientY - r.top) / r.height) * H
    setReveal(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)))
  }

  return (
    <div className="edge-image">
      <canvas
        ref={cv}
        width={W}
        height={H}
        className={started ? 'seekable' : ''}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); seek(e) }}
        onPointerMove={(e) => { if (e.buttons) seek(e) }}
      />
    </div>
  )
}

// Everyday situations where "only the changes matter", plus two illusions that are caused by the same circuit
function DailyLife() {
  return (
    <section className="box daily fade-in">
      <h2>You use this every second of the day</h2>
      <p className="daily-lead">
        Your retina does not wait for your brain to find the outlines. Cells like the one you are about to simulate do it
        before the signal even leaves your eye.
      </p>

      <div className="daily-grid">
        <div className="daily-card">
          <span className="emoji" aria-hidden="true">🚲</span>
          <h3>Spotting a cyclist at dusk</h3>
          <p>You notice the outline against the road long before you can tell what colour their jacket is.</p>
        </div>
        <div className="daily-card">
          <span className="emoji" aria-hidden="true">📖</span>
          <h3>Reading this page</h3>
          <p>Letters are just edges between dark ink and bright paper. Blur the edges and reading becomes hard.</p>
        </div>
        <div className="daily-card">
          <span className="emoji" aria-hidden="true">🙂</span>
          <h3>Recognising a face</h3>
          <p>The jaw, eyes and mouth are all contrast edges. Your brain starts from the outline your retina already drew.</p>
        </div>
        <div className="daily-card">
          <span className="emoji" aria-hidden="true">☀️</span>
          <h3>Sun to shade</h3>
          <p>A white shirt looks white outdoors and indoors, because cells report contrast with the surroundings, not raw brightness.</p>
        </div>
      </div>

      <h3 className="illusion-title">See it in your own eyes</h3>
      <div className="illusions">
        <figure>
          <svg viewBox="0 0 230 230" role="img" aria-label="Hermann grid: black squares separated by white lines">
            <rect width="230" height="230" fill="#fff" />
            {[0, 1, 2, 3].flatMap((i) =>
              [0, 1, 2, 3].map((j) => <rect key={i + '-' + j} x={10 + i * 55} y={10 + j * 55} width="45" height="45" rx="3" fill="#0a0a0a" />)
            )}
          </svg>
          <figcaption>
            <strong>Hermann grid.</strong> Look at the white crossings: faint grey smudges appear at the ones you are not looking at.
            At a crossing, more of a cell’s surround is bright than in a street, so the surround inhibits it more and the spot
            looks darker. This is the classic explanation; the full story is a bit more complex.
          </figcaption>
        </figure>

        <figure>
          <div className="contrast-pair" role="img" aria-label="Two identical grey squares on a dark and a light background">
            <div className="cp dark"><i /></div>
            <div className="cp light"><i /></div>
          </div>
          <figcaption>
            <strong>Same grey, different look.</strong> Both small squares are exactly the same grey. The one on the dark background
            looks lighter, because its dark surround inhibits the cell less. Your retina compares; it does not measure.
          </figcaption>
        </figure>
      </div>
    </section>
  )
}

export default function Intro({ onExplore, imageSrc }) {
  const [filtered, setFiltered] = useState(false)
  const [k, setK] = useState(1)
  const [replay, setReplay] = useState(0)

  return (
    <div className="intro">
      <aside className="rq box">
        <strong>Our research question</strong>
        <p>{RESEARCH_QUESTION}</p>
      </aside>

      <div className="split">
        <div className="side">
          {!filtered ? (
            <div className="card fade-in">
              <h3 className="card-title">Your brain never sees a photograph</h3>
              <p>
                Each of the roughly one million <Term id="ganglion">retinal ganglion cells</Term> in an eye sends your brain one
                simple message: <em>how different is the light in my tiny spot from the light around it?</em>
              </p>
              <p>Press the button to see what a layer of those cells would report about this photo.</p>
              <button className="btn fun" onClick={() => setFiltered(true)}>
                Extract edges
              </button>
            </div>
          ) : (
            <div className="card fade-in">
              <h3 className="card-title">Flat areas vanish. Edges light up.</h3>
              <p>
                The small circle that swept over the photo is a <Term id="receptivefield">receptive field</Term>. At every spot it
                compares a small <Term id="centre">centre</Term> (amber) with the ring around it, the <Term id="surround">surround</Term> (blue).
                In a flat area, such as a wall or the sky, the two cancel out. At an <Term id="edge">edge</Term> they disagree, and the cell signals loudly.
                The maths behind this is called a <Term id="dog">difference of Gaussians</Term>.
              </p>

              <div className="field">
                <label htmlFor="surround-k">
                  Surround strength: <output>{k.toFixed(2)}</output>
                </label>
                <input
                  id="surround-k" type="range" min="0" max="1" step="0.05" value={k}
                  onChange={(e) => setK(parseFloat(e.target.value))}
                />
                <p className="hint">
                  Drag it to 0: the cells ignore their surround and you just get a blurry photo. Drag it to 1: surround and centre
                  fully compete and only edges remain. The simulator uses the same slider.
                </p>
              </div>

              <div className="card-actions">
                <button className="btn ghost" onClick={() => setReplay((r) => r + 1)}>Replay scan</button>
                <button className="btn" onClick={onExplore}>Explore the eye →</button>
              </div>
            </div>
          )}
        </div>

        <div className="stage-visual">
          <div className="edge-wrap">
            <EdgeImage src={imageSrc} started={filtered} k={k} replayKey={replay} />
            <p className="edge-caption">
              {filtered
                ? 'Left of the scan line: what ganglion cells report. Right: the original photo. Drag across the picture to compare.'
                : 'An ordinary photo: flat areas, details and edges.'}
            </p>
          </div>
        </div>
      </div>

      {filtered && <DailyLife />}
    </div>
  )
}
