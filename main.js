// =====================================================================
// ON/OFF retinal ganglion cell model (difference of Gaussians)
// =====================================================================
//
// MODEL IN ONE PARAGRAPH
// The receptive field (RF) weight at a point is
//     w(x, y) = sign * [ Gc(x, y) - k * Gs(x, y) ]
// Gc = center Gaussian, Gs = surround Gaussian (wider), k = surround strength,
// sign = +1 for an ON-center cell and -1 for an OFF-center cell.
// The stimulus S(x, y) is the contrast relative to the grey background
// (0 = background, +1 = brighter, -1 = darker).
// Drive = sum over all points of S(x, y) * w(x, y).
// Firing rate = baseline + gain * drive (never below 0).
// Spikes are then drawn at random with that rate.
// =====================================================================


// ---------------------------------------------------------------------
// 1. SETTINGS (change these numbers to tune the simulation)
// ---------------------------------------------------------------------
const VIEW = 15;          // the drawings show x from -VIEW to +VIEW
const BASELINE = 10;      // spikes/s when nothing happens
const GAIN = 80;          // how strongly drive changes the firing rate
const MAX_RATE = 200;     // firing rate can't exceed this

const DT = 0.001;         // spike simulation step: 1 ms
const T_TOTAL = 2;        // seconds shown in the response panel
const T_ON = 0.5;         // stimulus switches on at 0.5 s
const T_OFF = 1.5;        // and off at 1.5 s

const AMBER = [245, 166, 35];   // light excites the cell
const BLUE = [46, 117, 214];    // light suppresses the cell


// ---------------------------------------------------------------------
// 2. FINDING THE ELEMENTS ON THE PAGE
// ---------------------------------------------------------------------
const $ = (id) => document.getElementById(id);

const sliders = {
  centerWidth: $("center-width"),
  surroundWidth: $("surround-width"),
  surroundStrength: $("surround-strength"),
  contrast: $("contrast"),
  spotRadius: $("spot-radius"),
  position: $("position"),
};
const outputs = {
  centerWidth: $("o-center-width"),
  surroundWidth: $("o-surround-width"),
  surroundStrength: $("o-surround-strength"),
  contrast: $("o-contrast"),
  spotRadius: $("o-spot-radius"),
  position: $("o-position"),
};
const stimulusSelect = $("stimulus-type");
const radios = document.querySelectorAll('input[name="cell-type"]');

const rfCanvas = $("receptive-field");
const dogCanvas = $("dog-graph");
const respCanvas = $("response-graph");
const rfCtx = rfCanvas.getContext("2d");
const dogCtx = dogCanvas.getContext("2d");
const respCtx = respCanvas.getContext("2d");
const readout = $("readout");


// ---------------------------------------------------------------------
// 3. READING THE CONTROLS INTO ONE OBJECT
// ---------------------------------------------------------------------
function readParams() {
  const cell = document.querySelector('input[name="cell-type"]:checked').value;
  const sigmaC = Number(sliders.centerWidth.value);
  return {
    sign: cell === "on" ? 1 : -1,
    sigmaC: sigmaC,
    sigmaS: sigmaC * Number(sliders.surroundWidth.value), // surround = multiple of center
    k: Number(sliders.surroundStrength.value),
    stim: stimulusSelect.value,
    contrast: Number(sliders.contrast.value),
    radius: Number(sliders.spotRadius.value),
    pos: Number(sliders.position.value),
  };
}


// ---------------------------------------------------------------------
// 4. THE MATH: GAUSSIANS, DoG, STIMULUS
// ---------------------------------------------------------------------

// 2D Gaussian that adds up to 1 over the whole plane. r2 = x*x + y*y.
function gaussian(r2, sigma) {
  return Math.exp(-r2 / (2 * sigma * sigma)) / (2 * Math.PI * sigma * sigma);
}

// RF weight at (x, y). Positive = light excites, negative = light suppresses.
function weight(x, y, p) {
  const r2 = x * x + y * y;
  return p.sign * (gaussian(r2, p.sigmaC) - p.k * gaussian(r2, p.sigmaS));
}

// Stimulus contrast at (x, y): 0 = grey background.
function stimulusValue(x, y, p) {
  if (p.stim === "spot") {
    const dx = x - p.pos;
    return dx * dx + y * y <= p.radius * p.radius ? p.contrast : 0;
  }
  if (p.stim === "edge") {
    return x < p.pos ? -p.contrast : p.contrast; // dark side vs bright side
  }
  return p.contrast; // uniform illumination
}

// Add up stimulus * weight over a grid covering the whole region that matters.
function computeDrive(p) {
  const step = Math.max(p.sigmaC / 4, 0.1);          // fine enough for the center
  const extent = Math.max(22, 3.5 * p.sigmaS);       // wide enough for the surround
  let sum = 0;
  for (let x = -extent + step / 2; x < extent; x += step) {
    for (let y = -extent + step / 2; y < extent; y += step) {
      const s = stimulusValue(x, y, p);
      if (s !== 0) sum += s * weight(x, y, p);
    }
  }
  return sum * step * step;
}

function driveToRate(drive) {
  return Math.min(MAX_RATE, Math.max(0, BASELINE + GAIN * drive));
}

// 1D cross-section through the middle (y = 0), used by the graph.
function computeProfile(p) {
  const n = 301;
  const prof = { x: [], center: [], surround: [], sum: [], stim: [], peak: 0 };
  for (let i = 0; i < n; i++) {
    const x = -VIEW + (2 * VIEW * i) / (n - 1);
    const c = p.sign * gaussian(x * x, p.sigmaC);
    const s = -p.sign * p.k * gaussian(x * x, p.sigmaS);
    prof.x.push(x);
    prof.center.push(c);
    prof.surround.push(s);
    prof.sum.push(c + s);
    prof.stim.push(stimulusValue(x, 0, p));
    prof.peak = Math.max(prof.peak, Math.abs(c), Math.abs(s), Math.abs(c + s));
  }
  return prof;
}


// ---------------------------------------------------------------------
// 5. DRAWING THE RECEPTIVE FIELD + STIMULUS (2D)
// ---------------------------------------------------------------------
function drawReceptiveField(p, prof) {
  const W = rfCanvas.width;
  const H = rfCanvas.height;
  const scale = W / (2 * VIEW);          // pixels per world unit
  const img = rfCtx.createImageData(W, H);

  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const x = (px + 0.5 - W / 2) / scale;
      const y = (py + 0.5 - H / 2) / scale;

      // Grey level of the stimulus (0.5 = background)
      const grey = (0.5 + 0.5 * stimulusValue(x, y, p)) * 255;

      // Tint it amber/blue depending on the RF weight
      const w = weight(x, y, p);
      const a = Math.min(1, Math.abs(w) / prof.peak) * 0.6;
      const col = w > 0 ? AMBER : BLUE;

      const i = (py * W + px) * 4;
      img.data[i] = grey * (1 - a) + col[0] * a;
      img.data[i + 1] = grey * (1 - a) + col[1] * a;
      img.data[i + 2] = grey * (1 - a) + col[2] * a;
      img.data[i + 3] = 255;
    }
  }
  rfCtx.putImageData(img, 0, 0);

  // Outline of the stimulus so it stays visible
  rfCtx.save();
  rfCtx.strokeStyle = "#000";
  rfCtx.lineWidth = 2;
  rfCtx.setLineDash([6, 4]);
  const sx = W / 2 + p.pos * scale;
  if (p.stim === "spot") {
    rfCtx.beginPath();
    rfCtx.arc(sx, H / 2, p.radius * scale, 0, 2 * Math.PI);
    rfCtx.stroke();
  } else if (p.stim === "edge") {
    rfCtx.beginPath();
    rfCtx.moveTo(sx, 0);
    rfCtx.lineTo(sx, H);
    rfCtx.stroke();
  }
  // Thin line showing where the DoG graph takes its slice
  rfCtx.setLineDash([2, 4]);
  rfCtx.lineWidth = 1;
  rfCtx.strokeStyle = "rgba(0,0,0,0.5)";
  rfCtx.beginPath();
  rfCtx.moveTo(0, H / 2);
  rfCtx.lineTo(W, H / 2);
  rfCtx.stroke();
  rfCtx.restore();
}


// ---------------------------------------------------------------------
// 6. DRAWING THE DoG GRAPH (1D slice)
// ---------------------------------------------------------------------
function drawDoG(p, prof) {
  const ctx = dogCtx;
  const W = dogCanvas.width;
  const H = dogCanvas.height;
  const L = 14, R = 14, T = 34, B = 40;      // margins
  const pw = W - L - R;
  const ph = H - T - B;
  const yMax = prof.peak * 1.2;

  const xPix = (x) => L + ((x + VIEW) / (2 * VIEW)) * pw;
  const yPix = (v) => T + ph / 2 - (v / yMax) * (ph / 2);

  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, W, H);

  // (a) Shade the part of the combined curve the stimulus covers
  const dx = (2 * VIEW) / (prof.x.length - 1);
  const barW = (pw * dx) / (2 * VIEW) + 1;
  for (let i = 0; i < prof.x.length; i++) {
    const s = prof.stim[i];
    if (s === 0) continue;
    const v = prof.sum[i];
    ctx.fillStyle = s * v > 0 ? "rgba(245,166,35,0.5)" : "rgba(46,117,214,0.5)";
    const top = v >= 0 ? yPix(v) : yPix(0);
    ctx.fillRect(xPix(prof.x[i]) - barW / 2, top, barW, (Math.abs(v) / yMax) * (ph / 2));
  }

  // (b) Axes: zero line and a marker at the RF center
  ctx.strokeStyle = "#999";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(L, yPix(0));
  ctx.lineTo(W - R, yPix(0));
  ctx.stroke();
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  ctx.moveTo(xPix(0), T);
  ctx.lineTo(xPix(0), T + ph);
  ctx.stroke();
  ctx.setLineDash([]);

  // x-axis ticks
  ctx.fillStyle = "#000";
  ctx.font = "12px system-ui, sans-serif";
  ctx.textAlign = "center";
  for (let t = -10; t <= 10; t += 5) {
    ctx.fillText(String(t), xPix(t), T + ph + 16);
  }
  ctx.fillText("Position (relative to RF center)", W / 2, H - 6);

  // helper to draw a curve
  function curve(values, color, width, dash) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(dash || []);
    ctx.beginPath();
    for (let i = 0; i < values.length; i++) {
      const X = xPix(prof.x[i]);
      const Y = yPix(values[i]);
      if (i === 0) ctx.moveTo(X, Y);
      else ctx.lineTo(X, Y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // (c) Stimulus profile (scaled to fit in the plot)
  curve(prof.stim.map((s) => s * 0.7 * yMax), "#666", 2, [6, 4]);

  // (d) The three DoG curves
  curve(prof.center, "#2a9d8f", 2);
  curve(prof.surround, "#9b5de5", 2);
  curve(prof.sum, "#111", 3);

  // (e) Legend
  const items = [
    ["Center", "#2a9d8f"],
    ["Surround", "#9b5de5"],
    ["Combined", "#111"],
    ["Stimulus", "#666"],
  ];
  ctx.textAlign = "left";
  let lx = L;
  for (const [label, color] of items) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(lx, 16);
    ctx.lineTo(lx + 16, 16);
    ctx.stroke();
    ctx.fillStyle = "#000";
    ctx.fillText(label, lx + 20, 20);
    lx += 20 + ctx.measureText(label).width + 14;
  }
}


// ---------------------------------------------------------------------
// 7. SPIKES AND THE RESPONSE PANEL
// ---------------------------------------------------------------------
const N_STEPS = Math.round(T_TOTAL / DT);
let randoms = [];

// Fixed random numbers: the spike pattern stays stable while you move a
// slider and only changes when you click the response graph.
function resample() {
  randoms = Array.from({ length: N_STEPS }, () => Math.random());
}

function generateSpikes(stimRate) {
  const spikes = [];
  for (let i = 0; i < N_STEPS; i++) {
    const t = i * DT;
    const rate = t >= T_ON && t < T_OFF ? stimRate : BASELINE;
    if (randoms[i] < rate * DT) spikes.push(t); // spike with probability rate*dt
  }
  return spikes;
}

function drawResponse(stimRate, spikes) {
  const ctx = respCtx;
  const W = respCanvas.width;
  const H = respCanvas.height;
  const L = 60, R = 20, T = 12, B = 34;
  const pw = W - L - R;
  const ph = H - T - B;
  const tx = (t) => L + (t / T_TOTAL) * pw;

  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, W, H);

  // Stimulus-on window
  ctx.fillStyle = "#f0f0f0";
  ctx.fillRect(tx(T_ON), T, tx(T_OFF) - tx(T_ON), ph);
  ctx.fillStyle = "#555";
  ctx.font = "12px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("stimulus on", (tx(T_ON) + tx(T_OFF)) / 2, T + 12);

  // Rate trace (top part)
  const rTop = T + 20;
  const rBottom = T + ph * 0.55;
  const rateMax = Math.max(40, Math.ceil((Math.max(stimRate, BASELINE) * 1.2) / 20) * 20);
  const rY = (r) => rBottom - (r / rateMax) * (rBottom - rTop);

  ctx.fillStyle = "#000";
  ctx.textAlign = "right";
  ctx.fillText("0", L - 8, rBottom + 4);
  ctx.fillText(String(rateMax), L - 8, rTop + 4);
  ctx.save();
  ctx.translate(14, (rTop + rBottom) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.fillText("Rate (spikes/s)", 0, 0);
  ctx.restore();

  ctx.strokeStyle = "#999";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(L, rBottom);
  ctx.lineTo(W - R, rBottom);
  ctx.stroke();

  ctx.strokeStyle = "#d9822b";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(tx(0), rY(BASELINE));
  ctx.lineTo(tx(T_ON), rY(BASELINE));
  ctx.lineTo(tx(T_ON), rY(stimRate));
  ctx.lineTo(tx(T_OFF), rY(stimRate));
  ctx.lineTo(tx(T_OFF), rY(BASELINE));
  ctx.lineTo(tx(T_TOTAL), rY(BASELINE));
  ctx.stroke();

  // Spike ticks (bottom part)
  const sTop = T + ph * 0.65;
  const sBottom = T + ph;
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  for (const t of spikes) {
    ctx.moveTo(tx(t), sTop);
    ctx.lineTo(tx(t), sBottom);
  }
  ctx.stroke();
  ctx.fillStyle = "#000";
  ctx.textAlign = "right";
  ctx.fillText("Spikes", L - 8, (sTop + sBottom) / 2 + 4);

  // Time axis
  ctx.strokeStyle = "#999";
  ctx.beginPath();
  ctx.moveTo(L, sBottom + 2);
  ctx.lineTo(W - R, sBottom + 2);
  ctx.stroke();
  ctx.fillStyle = "#000";
  ctx.textAlign = "center";
  for (let t = 0; t <= T_TOTAL + 1e-9; t += 0.5) {
    ctx.fillText(t.toFixed(1), tx(t), sBottom + 16);
  }
  ctx.fillText("Time (s)", W / 2, H - 4);
}


// ---------------------------------------------------------------------
// 8. PUTTING IT ALL TOGETHER
// ---------------------------------------------------------------------
function updateLabels(p) {
  for (const key in sliders) {
    outputs[key].textContent = Number(sliders[key].value).toFixed(2);
  }
  // Hide sliders that don't apply to the chosen stimulus
  $("r-spot-radius").style.display = p.stim === "spot" ? "" : "none";
  $("r-position").style.display = p.stim === "uniform" ? "none" : "";
}

function update() {
  const p = readParams();
  updateLabels(p);

  const prof = computeProfile(p);
  const drive = computeDrive(p);
  const stimRate = driveToRate(drive);
  const spikes = generateSpikes(stimRate);

  drawReceptiveField(p, prof);
  drawDoG(p, prof);
  drawResponse(stimRate, spikes);

  const inWindow = spikes.filter((t) => t >= T_ON && t < T_OFF).length;
  readout.textContent =
    `Baseline: ${BASELINE} spikes/s. During the stimulus: ${stimRate.toFixed(1)} spikes/s ` +
    `(${inWindow} spikes in 1 s). Click the graph below to draw new random spikes.`;
}

// Re-run everything whenever any control changes
for (const key in sliders) sliders[key].addEventListener("input", update);
stimulusSelect.addEventListener("change", update);
radios.forEach((r) => r.addEventListener("change", update));
respCanvas.style.cursor = "pointer";
respCanvas.addEventListener("click", () => {
  resample();
  update();
});

resample();
update();