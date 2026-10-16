import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { TERMS } from './glossaryData'
import MathModal from './MathModal'

const Ctx = createContext({ openTerm: () => {}, openMath: () => {} })
export const useGlossary = () => useContext(Ctx)

// Wrap the whole app in this once (see App.jsx). It owns the two pop-up boxes.
export function GlossaryProvider({ children }) {
  const [termId, setTermId] = useState(null)
  const [math, setMath] = useState(null) // null = closed, otherwise the starting parameters

  const openTerm = useCallback((id) => {
    setMath(null)
    setTermId(id)
  }, [])
  const openMath = useCallback((params) => {
    setTermId(null)
    setMath(params || {})
  }, [])

  return (
    <Ctx.Provider value={{ openTerm, openMath }}>
      {children}
      {termId && <TermModal id={termId} onClose={() => setTermId(null)} />}
      {math && <MathModal initial={math} onClose={() => setMath(null)} />}
    </Ctx.Provider>
  )
}

// <Term id="retina">retina</Term>: dotted underline, hover shows a short hint, click opens the full box
export function Term({ id, children }) {
  const { openTerm } = useGlossary()
  const t = TERMS[id]
  if (!t) return children
  return (
    <button type="button" className="term" data-short={t.short} onClick={() => openTerm(id)} aria-haspopup="dialog">
      {children}
    </button>
  )
}

function TermModal({ id, onClose }) {
  const { openTerm, openMath } = useGlossary()
  const closeRef = useRef(null)
  const t = TERMS[id]

  useEffect(() => { closeRef.current?.focus() }, [id])
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!t) return null
  return (
    <div className="modal-backdrop" onClick={onClose}>
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
        {t.fact && <p className="fact">💡 {t.fact}</p>}
        {t.math && (
          <button className="btn" onClick={() => openMath()}>Show the maths behind the model</button>
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
    </div>
  )
}
