const crops = [
  { id: 'olive', name: 'Olive', note: 'Resilient anchor crop', demand: 5400, yield: 8.8, efficiency: 92, mix: 58 },
  { id: 'citrus', name: 'Citrus', note: 'High-value, higher demand', demand: 9200, yield: 9.4, efficiency: 68, mix: 27 },
  { id: 'veg', name: 'Vegetables', note: 'Flexible summer block', demand: 6900, yield: 8.1, efficiency: 76, mix: 15 }
];

const state = { water: 520000, area: 420, stress: 3, focus: 'balanced' };
const stressNames = ['Very low', 'Low', 'Moderate', 'High', 'Severe'];
const qs = (selector) => document.querySelector(selector);

function formatNumber(n) { return Math.round(n).toLocaleString('en-US'); }
function getStressMultiplier() { return 1 + (state.stress - 3) * 0.08; }
function blendedDemand() {
  const base = crops.reduce((sum, c) => sum + c.demand * (c.mix / 100), 0) * state.area * 0.01;
  return Math.round(base * getStressMultiplier() * (state.focus === 'yield-first' ? 1.04 : state.focus === 'water-first' ? 0.94 : 1));
}

function recommendation() {
  const demand = blendedDemand();
  const fit = Math.max(0, Math.min(100, (state.water / Math.max(demand, 1)) * 78));
  const stressPenalty = (state.stress - 1) * 3;
  const focusBonus = state.focus === 'water-first' ? 7 : state.focus === 'yield-first' ? -4 : 4;
  const score = Math.round(Math.max(42, Math.min(96, fit - stressPenalty + focusBonus)));
  return {
    score,
    title: score < 62 ? 'Shift more area toward olive' : score < 76 ? 'Reduce citrus exposure' : 'Keep 55–60% of area in olive',
    copy: score < 62
      ? 'The water buffer is thin. Reduce high-demand blocks, prioritise efficient irrigation, and keep a larger reserve for peak heat.'
      : score < 76
        ? 'Citrus is creating most of the pressure. Protect the highest-value parcels and rebalance flexible hectares toward the lower-demand mix.'
        : 'Use olive as the anchor crop, keep a smaller citrus block, and reserve flexible area for lower-water summer crops.'
  };
}

function renderScenarios() {
  const demand = blendedDemand();
  const multiplier = getStressMultiplier();
  const modeMultiplier = state.focus === 'water-first' ? 0.93 : state.focus === 'yield-first' ? 1.04 : 1;
  qs('#scenario-grid').innerHTML = crops.map((crop) => {
    const seasonal = Math.round(crop.demand * state.area * (crop.mix / 100) * multiplier * modeMultiplier);
    const pressure = Math.min(100, Math.round((seasonal / Math.max(state.water, 1)) * 100));
    const isRecommended = crop.id === 'olive';
    return `<article class="scenario-card ${isRecommended ? 'recommended' : ''}">
      <div class="scenario-top"><span class="crop-name">${crop.name}</span>${isRecommended ? '<span class="scenario-tag">RECOMMENDED</span>' : ''}</div>
      <p class="scenario-desc">${crop.note}</p>
      <div class="scenario-metrics">
        <div class="metric"><span>Water need</span><strong>${formatNumber(seasonal)} m³</strong></div>
        <div class="metric"><span>Yield index</span><strong>${crop.yield.toFixed(1)} / 10</strong></div>
        <div class="metric"><span>Efficiency</span><strong>${crop.efficiency}%</strong></div>
        <div class="metric"><span>Mock area</span><strong>${crop.mix}%</strong></div>
      </div>
      <div class="scenario-bar"><span style="width:${Math.min(100, pressure)}%"></span></div>
      <div class="scenario-foot"><span>Water pressure</span><strong>${pressure}%</strong></div>
    </article>`;
  }).join('');
  qs('#chart-total-demand').style.width = `${Math.min(100, (demand / Math.max(state.water, 1)) * 79)}%`;
  qs('#chart-total-label').textContent = `${Math.round(demand / 1000)}k`;
}

function render() {
  qs('#water-value').textContent = `${formatNumber(state.water)} m³`;
  qs('#area-value').textContent = `${state.area} ha`;
  qs('#stress-value').textContent = stressNames[state.stress - 1];
  qs('#kpi-water').textContent = formatNumber(state.water);

  const demand = blendedDemand();
  const buffer = ((state.water - demand) / Math.max(demand, 1)) * 100;
  const efficiency = Math.max(45, Math.min(96, Math.round(100 - (demand / Math.max(state.water, 1)) * 25 - (state.stress - 3) * 5)));
  const rec = recommendation();

  qs('#kpi-demand').textContent = formatNumber(demand);
  qs('#kpi-buffer').textContent = `${buffer >= 0 ? '+' : ''}${buffer.toFixed(1)}% buffer`;
  qs('#kpi-buffer').className = `chip ${buffer >= 5 ? 'positive' : 'neutral'}`;
  qs('#kpi-efficiency').textContent = `${efficiency}%`;
  qs('#efficiency-bar').style.width = `${efficiency}%`;
  qs('#kpi-mix').textContent = rec.score >= 68 ? 'Olive-led' : 'Rebalance';
  qs('#kpi-alert').textContent = state.stress >= 4 ? 'High heat weeks' : 'Watch heat weeks';
  qs('#recommendation-score').textContent = rec.score;
  qs('#recommendation-title').textContent = rec.title;
  qs('#recommendation-copy').textContent = rec.copy;
  qs('#chart-status').textContent = buffer >= 0 ? 'Within budget' : 'Over budget';
  qs('#chart-status').style.color = buffer >= 0 ? '#4f7e58' : '#b6523f';
  renderScenarios();
}

qs('#water').addEventListener('input', (e) => { state.water = Number(e.target.value); render(); });
qs('#area').addEventListener('input', (e) => { state.area = Number(e.target.value); render(); });
qs('#stress').addEventListener('input', (e) => { state.stress = Number(e.target.value); render(); });
qs('#scenario-select').addEventListener('change', (e) => { state.focus = e.target.value; render(); });

document.querySelectorAll('.nav-item').forEach((link) => link.addEventListener('click', () => {
  document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active'));
  link.classList.add('active');
}));

render();
