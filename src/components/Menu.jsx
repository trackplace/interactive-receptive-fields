import { useState } from 'react'
import { TOUR_STEPS } from './Tour'

export default function Menu({ onPick, onRestart }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button className="burger" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span></span>
        <span></span>
        <span></span>
      </button>

      {open && (
        <nav className="menu-panel">
          <h3>Guided tour</h3>
          <ul>
            {TOUR_STEPS.map((s, i) => (
              <li key={s.title}>
                <button
                  onClick={() => {
                    setOpen(false)
                    onPick(i)
                  }}
                >
                  {s.title}
                </button>
              </li>
            ))}
          </ul>
          <button className="btn ghost" onClick={onRestart}>
            Restart from the beginning
          </button>
        </nav>
      )}
    </>
  )
}
