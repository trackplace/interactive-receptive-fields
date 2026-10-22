import { useEffect, useRef } from 'react'
import { paintEye, paintBeam, paintHighlight, EYE_W, EYE_H, EYE_PARTS } from './eyePainter'

// The eye cross-section as a flat picture, with one part lit up. Used on the right half of the explanation box.
// It paints the same picture as the 3D eye, so both look alike.
export default function EyeFigure({ part }) {
  const base = useRef(null)
  const glow = useRef(null)

  // the eye itself, painted once: the eye, then the beam of light added on top
  useEffect(() => {
    const cv = base.current
    cv.width = EYE_W
    cv.height = EYE_H
    const g = cv.getContext('2d')
    paintEye(g)
    const beam = document.createElement('canvas')
    beam.width = EYE_W
    beam.height = EYE_H
    paintBeam(beam.getContext('2d'))
    g.globalCompositeOperation = 'lighter'
    g.drawImage(beam, 0, 0)
    g.globalCompositeOperation = 'source-over'
  }, [])

  // the lit-up part, painted again whenever another word is chosen
  useEffect(() => {
    const cv = glow.current
    cv.width = EYE_W
    cv.height = EYE_H
    paintHighlight(cv.getContext('2d'), part)
  }, [part])

  return (
    <figure className="eye-figure" onClick={(e) => e.stopPropagation()}>
      <div className="eye-stage">
        <canvas ref={base} className="eye-base" role="img" aria-label="Cross-section of the human eye" />
        <canvas ref={glow} key={part} className="eye-glow" aria-hidden="true" />
      </div>
      <figcaption>
        Lit up in the eye: <strong>{EYE_PARTS[part] || part}</strong>
      </figcaption>
    </figure>
  )
}