import { useState } from 'react'
import './stylesheets/App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <section id="controls" className="box">

        <div id="cell-type-row">
          <strong>Cell type =</strong>

          <label>
            <input
              type="radio"
              name="cell-type"
              value="on"
              defaultChecked
            />
            ON-center
          </label>

          <label>
            <input
              type="radio"
              name="cell-type"
              value="off"
            />
            OFF-center
          </label>
        </div>

        <hr />

        <h2>Parameters =</h2>

        <ol id="parameters">

          <li className="row">
            <label htmlFor="center-width">Center width</label>
            <input
              type="range"
              id="center-width"
              min="0.5"
              max="3"
              step="0.1"
              defaultValue="1"
            />
            <output id="o-center-width"></output>
          </li>

          <li className="row">
            <label htmlFor="surround-width">
              Surround width (× center)
            </label>
            <input
              type="range"
              id="surround-width"
              min="1.5"
              max="6"
              step="0.1"
              defaultValue="3"
            />
            <output id="o-surround-width"></output>
          </li>

          <li className="row">
            <label htmlFor="surround-strength">
              Surround strength
            </label>
            <input
              type="range"
              id="surround-strength"
              min="0"
              max="2"
              step="0.05"
              defaultValue="0.9"
            />
            <output id="o-surround-strength"></output>
          </li>

          <li className="row">
            <label htmlFor="stimulus-type">Stimulus type</label>

            <select id="stimulus-type" defaultValue="spot">
              <option value="spot">Circular spot</option>
              <option value="edge">Light-dark edge</option>
              <option value="uniform">Uniform illumination</option>
            </select>

            <span></span>
          </li>

          <li className="row">
            <label htmlFor="contrast">Contrast: dark to bright</label>
            <input
              type="range"
              id="contrast"
              min="-1"
              max="1"
              step="0.05"
              defaultValue="0.5"
            />
            <output id="o-contrast"></output>
          </li>

          <li className="row" id="r-spot-radius">
            <label htmlFor="spot-radius">Spot radius</label>
            <input
              type="range"
              id="spot-radius"
              min="0.5"
              max="10"
              step="0.1"
              defaultValue="2"
            />
            <output id="o-spot-radius"></output>
          </li>

          <li className="row" id="r-position">
            <label htmlFor="position">
              Horizontal stimulus position
            </label>
            <input
              type="range"
              id="position"
              min="-10"
              max="10"
              step="0.1"
              defaultValue="0"
            />
            <output id="o-position"></output>
          </li>

        </ol>
      </section>

      <section id="visuals">

        <div id="receptive-field-panel" className="box">
          <h2>Receptive field and stimulus</h2>

          <canvas id="receptive-field" width="450" height="350">
            Receptive field visualization.
          </canvas>

          <p className="note">
            Amber: light excites the cell. Blue: light suppresses it.
          </p>
        </div>

        <div id="dog-panel" className="box">
          <h2>DoG graph</h2>

          <canvas id="dog-graph" width="450" height="350">
            Cross-section of receptive field sensitivity.
          </canvas>

          <p className="note">
            Horizontal slice through the field center.
          </p>
        </div>

      </section>

      <section id="response-panel" className="box">
        <h2>Action potentials (predicted cell response)</h2>

        <p id="readout"></p>

        <canvas id="response-graph" width="900" height="250">
          Predicted response graph.
        </canvas>
      </section>
    </>
  )
}

export default App
