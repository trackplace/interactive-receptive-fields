import { useEffect, useRef, useState } from 'react'
import { confetti } from './confetti'

export const TOUR_STEPS = [
  {
    title: 'Welcome',
    target: null,
    text: 'This is a working model of one retinal ganglion cell. Take a quick tour of each section, then experiment freely.',
  },
  {
    title: 'Learn as you go',
    target: null,
    text: 'Words with a dotted underline are clickable: hover for a one-line hint, click for a full explanation. You can also open the menu (top left) at any time to jump to another frame.',
  },
  {
    title: 'Cell type',
    target: '#cell-type-row',
    text: 'ON-center cells fire more when light hits their centre. OFF-center cells fire more when their centre goes dark. Switch between them to see the receptive field flip.',
  },
  {
    title: 'Parameters',
    target: '#parameters',
    text: 'Change the size and strength of the centre and surround, then choose a stimulus: a spot, an edge, or uniform light. Move it around and change its contrast.',
  },
  {
    title: 'Receptive field',
    target: '#receptive-field-panel',
    text: 'The cell as seen from above. Amber regions excite it, blue regions suppress it. The dashed shape is your stimulus.',
  },
  {
    title: 'DoG graph',
    target: '#dog-panel',
    text: 'A slice through the middle of the receptive field. A narrow positive Gaussian combined with a wider negative Gaussian forms the Difference of Gaussians (DoG) curve. This shows how the centre and surround contribute differently to the cell’s response. Click the ⓘ next to the title to see how the model is calculated and what the curve means.',
  },
  {
    title: 'Cell response',
    target: '#response-panel',
    text: 'The oscilloscope shows the voltage inside the cell (mV) over time (s). The line above it shows how the rate is calculated from your stimulus and the receptive field. Slow it down with the Speed menu, and click the ⓘ next to the title to follow every step. Try uniform illumination: centre and surround cancel and the rate barely changes.',
  },
]

export default function Tour({ startAt = 0, onClose }) {
  const [i, setI] = useState(startAt)
  const step = TOUR_STEPS[i]

  const [pos, setPos] = useState('')
  const spot = useRef(null)
  const cur = useRef(null)

  // The spotlight is animated frame by frame (eased toward the target's live bounding box),
  // so it glides smoothly between steps and tracks the page while it scrolls.
  useEffect(() => {
    const el = step.target ? document.querySelector(step.target) : null
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      // keep the popup out of the way of what it is describing
      const r = el.getBoundingClientRect()
      setPos(r.left + r.width / 2 < window.innerWidth * 0.3 ? 'right' : r.top + r.height / 2 > window.innerHeight * 0.55 ? 'top' : '')
    } else setPos('')
    const node = spot.current
    node.classList.toggle('nocut', !el)
    let raf, prev = performance.now()
    const tick = (now) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(0.05, (now - prev) / 1000)
      prev = now
      let tg
      if (el) {
        const r = el.getBoundingClientRect()
        tg = { l: r.left - 8, t: r.top - 8, w: r.width + 16, h: r.height + 16 }
      } else tg = { l: window.innerWidth / 2, t: window.innerHeight / 2, w: 0, h: 0 }
      const c = cur.current || (cur.current = { l: window.innerWidth / 2, t: window.innerHeight / 2, w: 0, h: 0 })
      const k = 1 - Math.exp(-dt * 10)
      for (const key in c) c[key] += (tg[key] - c[key]) * k
      node.style.transform = `translate(${c.l}px, ${c.t}px)`
      node.style.width = c.w + 'px'
      node.style.height = c.h + 'px'
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [step])

  const last = i === TOUR_STEPS.length - 1

  // pop confetti from the button, then close the tour a beat later so the pop is seen
  const finish = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    confetti(r.left + r.width / 2, r.top + r.height / 2)
    setTimeout(onClose, 350)
  }

  return (
    <>
    <div className="tour-spot" ref={spot} />
    <div className={'tour-popup ' + pos} role="dialog" aria-label="Guided tour">
      <h3>{step.title}</h3>
      <p>{step.text}</p>
      <div className="tour-actions">
        <button className="btn ghost" onClick={onClose}>
          Skip tour
        </button>
        <span className="tour-count">
          {i + 1} of {TOUR_STEPS.length}
        </span>
        {i > 0 && (
          <button className="btn ghost" onClick={() => setI(i - 1)}>
            Back
          </button>
        )}
        <button className={'btn' + (last ? ' fun' : '')} onClick={(e) => (last ? finish(e) : setI(i + 1))}>
          {last ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
    </>
  )
}
