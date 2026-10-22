import { useEffect, useRef, useState } from 'react'
import { REFS, SLIDES, CHOICES } from './sources'

// one reference: full text, what it is used for, and links
function Ref({ r }) {
  return (
    <li className="src-item">
      <p className="src-full">{r.full}</p>
      <p className="src-used"><strong>Used for:</strong> {r.used}</p>
      <p className="src-links">
        {r.doi && <a href={'https://doi.org/' + r.doi} target="_blank" rel="noopener noreferrer">doi.org/{r.doi}</a>}
        {r.pmid && <a href={'https://pubmed.ncbi.nlm.nih.gov/' + r.pmid + '/'} target="_blank" rel="noopener noreferrer">PubMed {r.pmid}</a>}
        {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer">Open the page</a>}
      </p>
    </li>
  )
}

function SourcesModal({ slide, onClose }) {
  const [all, setAll] = useState(false)
  const closeRef = useRef(null)
  const info = SLIDES[slide]
  useEffect(() => { closeRef.current?.focus() }, [])
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const here = (info?.ids || []).filter((id) => REFS[id])
  const everything = Object.keys(REFS)
  const ids = all || !info ? everything : here

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal sources-modal" role="dialog" aria-modal="true" aria-label="Sources" onClick={(e) => e.stopPropagation()}>
        <button ref={closeRef} className="modal-close" onClick={onClose} aria-label="Close">×</button>
        <span className="tag">Sources</span>
        <h3>{all || !info ? 'All sources' : 'Sources for this slide: ' + info.title}</h3>
        <p className="lead">
          The scientific claims on {all || !info ? 'these slides' : 'this slide'} can be checked against the references below. Click a link to open the original paper or page.
        </p>

        <ul className="src-list">
          {ids.map((id) => <Ref key={id} r={REFS[id]} />)}
        </ul>

        {(all || !info || info.choices) && (
          <section className="src-choices">
            <h4>What is a modelling choice, not a measurement</h4>
            <p className="note">The simulator is a simplified model. These parts are chosen for clarity and are not taken from a paper:</p>
            <ul>{CHOICES.map((c) => <li key={c}>{c}</li>)}</ul>
          </section>
        )}

        {info && (
          <button className="btn ghost src-toggle" onClick={() => setAll((v) => !v)}>
            {all ? 'Show only this slide' : 'Show all sources of the project'}
          </button>
        )}
      </div>
    </div>
  )
}

const SEEN = 'sources-hint-seen'
const get = () => { try { return sessionStorage.getItem(SEEN) } catch { return null } }
const put = () => { try { sessionStorage.setItem(SEEN, '1') } catch { /* private window: the hint just shows again */ } }

// A book button in the top-right corner of every screen. `slide` is the current slide key (see SLIDES in sources.js).
export default function SourcesButton({ slide }) {
  const [open, setOpen] = useState(false)
  const [hint, setHint] = useState(false)

  // the first time, a small speech bubble points at the book so people know it is there
  useEffect(() => {
    if (get()) return
    const show = setTimeout(() => setHint(true), 2500)
    const hide = setTimeout(() => { setHint(false); put() }, 12000)
    return () => { clearTimeout(show); clearTimeout(hide) }
  }, [])

  const openIt = () => { setHint(false); put(); setOpen(true) }

  return (
    <>
      <button type="button" className="sources-btn" onClick={openIt} aria-haspopup="dialog" aria-label="Open the sources for this slide" title="Sources for this slide">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 6.5C10 5 7 4.6 4 5v13c3-.4 6 0 8 1.5 2-1.5 5-1.9 8-1.5V5c-3-.4-6 0-8 1.5z" />
          <path d="M12 6.5v13" />
        </svg>
      </button>
      {hint && !open && (
        <div className="sources-hint" role="status">
          <span>Click on the book to discover the sources</span>
          <button type="button" aria-label="Dismiss" onClick={() => { setHint(false); put() }}>×</button>
        </div>
      )}
      {open && <SourcesModal slide={slide} onClose={() => setOpen(false)} />}
    </>
  )
}