import { useEffect, useRef, useState } from 'react'

const W = 360
const H = 270

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

// Difference of Gaussians: narrow blur (centre) minus wide blur (surround)
function applyDoG(ctx) {
  const img = ctx.getImageData(0, 0, W, H)
  const gray = new Float32Array(W * H)
  for (let i = 0; i < W * H; i++) {
    const d = img.data
    gray[i] = (0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]) / 255
  }
  const centre = blur(gray, W, H, 1.2)
  const surround = blur(gray, W, H, 3.6)
  for (let i = 0; i < W * H; i++) {
    const v = Math.max(0, Math.min(255, (0.5 + 5 * (centre[i] - surround[i])) * 255))
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v
    img.data[i * 4 + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
}

function EdgeImage({ filtered, src }) {
  const origRef = useRef(null)
  const dogRef = useRef(null)

  useEffect(() => {
    const oc = origRef.current.getContext('2d')
    const dc = dogRef.current.getContext('2d', { willReadFrequently: true })
    const finish = () => {
      dc.drawImage(origRef.current, 0, 0)
      applyDoG(dc)
    }
    if (src) {
      const im = new Image()
      im.onload = () => {
        oc.drawImage(im, 0, 0, W, H)
        finish()
      }
      im.src = src
    } else {
      drawScene(oc)
      finish()
    }
  }, [src])

  return (
    <div className="edge-image">
      <canvas ref={origRef} width={W} height={H} />
      <canvas ref={dogRef} width={W} height={H} className={filtered ? 'show' : ''} />
    </div>
  )
}

export default function Intro({ onExplore, imageSrc }) {
  const [filtered, setFiltered] = useState(false)
  return (
    <div className="split">
      <div className="side">
        {!filtered ? (
          <button className="btn" onClick={() => setFiltered(true)}>
            Extract edges
          </button>
        ) : (
          <div className="card fade-in">
            <p>
              This is what the receptive fields in your eyes are doing. Each retinal cell compares the light in a
              small centre with the light in the ring around it, so flat areas cancel out and only changes in
              brightness, like edges, send a strong signal to your brain.
            </p>
            <p>That comparison is modelled by a difference of Gaussians.</p>
            <button className="btn" onClick={onExplore}>
              Explore →
            </button>
          </div>
        )}
      </div>
      <div className="stage-visual">
        <EdgeImage filtered={filtered} src={imageSrc} />
      </div>
    </div>
  )
}
