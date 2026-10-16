import { useState } from 'react'
import { TOUR_STEPS } from './Tour'
import { EYE_STEP_TITLES } from './EyeScene'

// every frame of the website, in order
const FRAMES = [
  { key: 'intro', label: 'Edges in an image' },
  { key: 'eye0', label: EYE_STEP_TITLES[0] },
  { key: 'eye1', label: EYE_STEP_TITLES[1] },
  { key: 'eye2', label: EYE_STEP_TITLES[2] },
  { key: 'explorer', label: 'Simulator' },
]

export default function Menu({ current, onGo, onTour }) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <>
      <button className="burger" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span></span>
        <span></span>
        <span></span>
      </button>

      {open && (
        <>
          <div className="menu-scrim" onClick={close} />
          <nav className="menu-panel">
            <h3>Go to</h3>
            <ul>
              {FRAMES.map((f, i) => (
                <li key={f.key}>
                  <button
                    className={f.key === current ? 'active' : ''}
                    aria-current={f.key === current ? 'page' : undefined}
                    onClick={() => { close(); onGo(f.key) }}
                  >
                    <b>{i + 1}</b> {f.label}
                  </button>
                </li>
              ))}
            </ul>

            <h3>Guided tour of the simulator</h3>
            <ul>
              {TOUR_STEPS.map((s, i) => (
                <li key={s.title}>
                  <button onClick={() => { close(); onTour(i) }}>{s.title}</button>
                </li>
              ))}
            </ul>
          </nav>
        </>
      )}
    </>
  )
}
