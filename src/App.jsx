import { useEffect, useState } from 'react'
import './stylesheets/App.css'
import Intro from './components/Intro'
import EyeScene from './components/EyeScene'
import Explorer from './components/Explorer'
import Tour from './components/Tour'
import Menu from './components/Menu'

// stage: 'intro' (image + DoG + explanation) -> 'eye' (zoom sequence) -> 'explorer'
export default function App() {
  const [stage, setStage] = useState('intro')
  const [tour, setTour] = useState(null) // null = closed, otherwise step index
  const [tourDone, setTourDone] = useState(false)

  useEffect(() => {
    document.body.classList.toggle('explorer-view', stage === 'explorer')
    return () => document.body.classList.remove('explorer-view')
  }, [stage])

  return (
    <>
      <header className={stage === 'explorer' ? 'compact' : ''}>
        <h1>ON and OFF Retinal Cell Model</h1>
        <hr />
      </header>

      <main className={stage === 'explorer' ? 'wide' : ''}>
        {stage === 'intro' && <Intro onExplore={() => setStage('eye')} imageSrc="/interactive-receptive-fields/thelukeymc.jpg" />}

        {stage === 'eye' && (
          <EyeScene
            onExplain={() => {
              setStage('explorer')
              setTour(0)
            }}
          />
        )}

        {stage === 'explorer' && <Explorer />}
      </main>

      {stage === 'explorer' && tour !== null && (
        <Tour
          startAt={tour}
          onClose={() => {
            setTour(null)
            setTourDone(true)
          }}
        />
      )}

      {stage === 'explorer' && tourDone && tour === null && (
        <Menu onPick={setTour} onRestart={() => { setTourDone(false); setStage('intro') }} />
      )}
    </>
  )
}
