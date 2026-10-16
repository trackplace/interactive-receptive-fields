import { useEffect, useState } from 'react'
import './stylesheets/App.css'
import Intro from './components/Intro'
import EyeScene from './components/EyeScene'
import Explorer from './components/Explorer'
import Tour from './components/Tour'
import Menu from './components/Menu'
import { GlossaryProvider } from './components/Glossary'

// stage: 'intro' (image + DoG + explanation) -> 'eye' (3 frames: eyeStep 0, 1, 2) -> 'explorer'
export default function App() {
  const [stage, setStage] = useState('intro')
  const [eyeStep, setEyeStep] = useState(0)
  const [tour, setTour] = useState(null) // null = closed, otherwise step index

  useEffect(() => {
    document.body.classList.toggle('explorer-view', stage === 'explorer')
    return () => document.body.classList.remove('explorer-view')
  }, [stage])

  // jump to a frame from the menu: 'intro' | 'eye0' | 'eye1' | 'eye2' | 'explorer'
  const go = (key) => {
    setTour(null)
    if (key === 'intro' || key === 'explorer') setStage(key)
    else {
      setEyeStep(Number(key.replace('eye', '')))
      setStage('eye')
    }
  }
  const current = stage === 'eye' ? 'eye' + eyeStep : stage

  return (
    <GlossaryProvider>
      <Menu
        current={current}
        onGo={go}
        onTour={(i) => {
          setStage('explorer')
          setTour(i)
        }}
      />

      <header className={stage === 'explorer' ? 'compact' : ''}>
        <h1>ON and OFF Retinal Cell Model</h1>
        <hr />
      </header>

      <main className={stage === 'explorer' ? 'wide' : ''}>
        {stage === 'intro' && (
          <Intro onExplore={() => go('eye0')} imageSrc="/interactive-receptive-fields/thelukeymc.jpg" />
        )}

        {stage === 'eye' && (
          <EyeScene
            step={eyeStep}
            onStep={setEyeStep}
            onBack={() => setStage('intro')}
            onExplain={() => {
              setStage('explorer')
              setTour(0)
            }}
          />
        )}

        {stage === 'explorer' && <Explorer />}
      </main>

      {stage === 'explorer' && tour !== null && <Tour key={tour} startAt={tour} onClose={() => setTour(null)} />}
    </GlossaryProvider>
  )
}