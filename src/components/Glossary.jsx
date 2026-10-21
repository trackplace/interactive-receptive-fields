import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { TERMS } from './glossaryData'
import MathModal from './MathModal'
import RateModal from './RateModal'
import EyeFigure from './EyeFigure'
import RetinaFigure from './RetinaFigure'
import ReceptiveFieldFigure from './ReceptiveFieldFigure'
import { RETINA_PARTS } from './retinaModel'

const Ctx = createContext({ openTerm: () => {}, openMath: () => {}, openRate: () => {}, hoverPart: null, setHoverPart: () => {} })
export const useGlossary = () => useContext(Ctx)

// Wrap the whole app in this once (see App.jsx). It owns the pop-up boxes.
export function GlossaryProvider({ children }) {
  const [termId, setTermId] = useState(null)
  const [math, setMath] = useState(null) // null = closed, otherwise the starting parameters
  const [rate, setRate] = useState(null) // same, for the firing-rate box
  const [hoverPart, setHoverPart] = useState(null) // the part of the eye whose word the mouse is over (lights up in the 3D eye)

  const openTerm = useCallback((id) => {
    setHoverPart(null)
    setMath(null)
    setRate(null)
    setTermId(id)
  }, [])
  const openMath = useCallback((params) => {
    setTermId(null)
    setRate(null)
    setMath(params || {})
  }, [])
  const openRate = useCallback((params) => {
    setTermId(null)
    setMath(null)
    setRate(params || {})
  }, [])

  return (
    <Ctx.Provider value={{ openTerm, openMath, openRate, hoverPart, setHoverPart }}>
      {children}
      {termId && <TermModal id={termId} onClose={() => setTermId(null)} />}
      {math && <MathModal initial={math} onClose={() => setMath(null)} />}
      {rate && <RateModal initial={rate} onClose={() => setRate(null)} />}
    </Ctx.Provider>
  )
}

// <Term id="retina">retina</Term>: dotted underline, hover shows a short hint, click opens the full box
export function Term({ id, children }) {
  const { openTerm, setHoverPart } = useGlossary()
  const t = TERMS[id]
  if (!t) return children
  // words for a part of the eye (they have a `part` in glossaryData.js) light that part up while hovered or focused
  const on = t.part ? () => setHoverPart(t.part) : undefined
  const off = t.part ? () => setHoverPart(null) : undefined
  return (
    <button
      type="button"
      className="term"
      data-short={t.short}
      onClick={() => openTerm(id)}
      onMouseEnter={on}
      onMouseLeave={off}
      onFocus={on}
      onBlur={off}
      aria-haspopup="dialog"
    >
      {children}
    </button>
  )
}

function TermModal({ id, onClose }) {
  const { openTerm, openMath, openRate } = useGlossary()
  const closeRef = useRef(null)
  const t = TERMS[id]

  useEffect(() => { closeRef.current?.focus() }, [id])
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!t) return null
  // words for a part of the eye open as two halves: the explanation on the left, the eye with that part lit up on the right
  const split = Boolean(t.part || t.rf)
  return (
    <div className={'modal-backdrop' + (split ? ' eye-split' : '')} onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={t.title} onClick={(e) => e.stopPropagation()}>
        <button ref={closeRef} className="modal-close" onClick={onClose} aria-label="Close">×</button>
        <span className="tag">{t.cat}</span>
        <h3>{t.title}</h3>
        <p className="lead">{t.short}</p>
        {t.body.map((para, i) => <p key={i}>{para}</p>)}
        {t.does && (
          <div className="does">
            <strong>What it does</strong>
            <p>{t.does}</p>
          </div>
        )}
        {t.fact && <p className="fact"><strong>Did you know?</strong> {t.fact}</p>}
        {t.math && (
          <button className="btn" onClick={() => openMath()}>Show the maths behind the model</button>
        )}
        {t.rate && (
          <button className="btn" onClick={() => openRate()}>Show how the firing rate is calculated</button>
        )}
        {t.related?.length > 0 && (
          <div className="related">
            <span>Related:</span>
            {t.related.filter((r) => TERMS[r]).map((r) => (
              <button key={r} className="btn ghost" onClick={() => openTerm(r)}>{TERMS[r].title}</button>
            ))}
          </div>
        )}
      </div>
         {split && (t.rf ? <ReceptiveFieldFigure view={t.rf} /> : RETINA_PARTS[t.part] ? <RetinaFigure part={t.part} /> : <EyeFigure part={t.part} />)}
    </div>
  )
}