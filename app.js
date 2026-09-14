const crops = [
  { id: 'olive', name: 'Olive', note: 'Resilient anchor crop', demand: 5400, yield: 8.8, efficiency: 92, mix: 58 },
  { id: 'citrus', name: 'Citrus', note: 'High-value, higher demand', demand: 9200, yield: 9.4, efficiency: 68, mix: 27 },
  { id: 'veg', name: 'Vegetables', note: 'Flexible summer block', demand: 6900, yield: 8.1, efficiency: 76, mix: 15 }
];

const regions = {
  andalusia: {
    name: 'Andalusia', country: 'Spain', summary: 'Severe water pressure',
    note: 'A dry winter and constrained reservoir storage are tightening summer allocations.',
    rainfall: 186, rainfallNormalDelta: -38, rainfallMonthly: [74, 52, 32, 18, 7, 3], rainfallStatus: 'red',
    waterTrend: [42, 40, 38, 36, 34, 31, 29],
    reservoir: 29, reservoirTrend: 'falling', reservoirStatus: 'red',
    drought: 4.4, droughtLabel: 'Severe · allocation risk', droughtStatus: 'red',
    soil: 21, soilLabel: 'Root-zone estimate · very low', soilStatus: 'red',
    irrigation: 4100000, irrigationCoverage: 64, irrigationLabel: 'Cooperative allocation · constrained', irrigationStatus: 'yellow',
    overallStatus: 'red', overallLabel: 'Severe drought', resourceLabel: 'Critical', stress: 5
  },
  puglia: {
    name: 'Puglia', country: 'Italy', summary: 'Elevated seasonal pressure',
    note: 'Patchy spring rain has slowed recharge, while storage remains adequate for prioritised crops.',
    rainfall: 264, rainfallNormalDelta: -19, rainfallMonthly: [91, 68, 49, 31, 17, 8], rainfallStatus: 'yellow',
    waterTrend: [44, 45, 44, 46, 47, 46, 46],
    reservoir: 46, reservoirTrend: 'stable', reservoirStatus: 'yellow',
    drought: 3.1, droughtLabel: 'Moderate · monitor demand', droughtStatus: 'yellow',
    soil: 34, soilLabel: 'Root-zone estimate · below target', soilStatus: 'yellow',
    irrigation: 5200000, irrigationCoverage: 78, irrigationLabel: 'Cooperative allocation · adequate', irrigationStatus: 'yellow',
    overallStatus: 'yellow', overallLabel: 'Moderate drought', resourceLabel: 'Watch', stress: 3
  },
  algarve: {
    name: 'Algarve', country: 'Portugal', summary: 'Manageable water position',
    note: 'A wetter start to the year has supported storage and soil moisture ahead of peak irrigation.',
    rainfall: 318, rainfallNormalDelta: -8, rainfallMonthly: [112, 83, 56, 37, 20, 10], rainfallStatus: 'green',
    waterTrend: [48, 51, 54, 56, 58, 60, 62],
    reservoir: 62, reservoirTrend: 'recovering', reservoirStatus: 'green',
    drought: 2.2, droughtLabel: 'Low · normal monitoring', droughtStatus: 'green',
    soil: 43, soilLabel: 'Root-zone estimate · healthy', soilStatus: 'green',
    irrigation: 6100000, irrigationCoverage: 92, irrigationLabel: 'Cooperative allocation · comfortable', irrigationStatus: 'green',
    overallStatus: 'green', overallLabel: 'Low drought', resourceLabel: 'Stable', stress: 2
  }
};

const state = { region: 'andalusia', water: 4100000, area: 420, stress: 5, focus: 'balanced' };
const stressNames = ['Very low', 'Low', 'Moderate', 'High', 'Severe'];
const qs = (selector) => document.querySelector(selector);
const statusColors = { green: '#4f9563', yellow: '#d49a2f', red: '#c95d46' };

function formatNumber(n) { return Math.round(n).toLocaleString('en-US'); }
function getStressMultiplier() { return 1 + (state.stress - 3) * 0.08; }
function blendedDemand() {
  const base = crops.reduce((sum, c) => sum + c.demand * (c.mix / 100), 0) * state.area;
  return Math.round(base * getStressMultiplier() * (state.focus === 'yield-first' ? 1.04 : state.focus === 'water-first' ? 0.94 : 1));
}

function setStatus(selector, baseClass, status) {
  qs(selector).className = `${baseClass} status-${status}`;
}

function renderClimate() {
  const region = regions[state.region];
  qs('#region-country').textContent = `${region.country.toUpperCase()} · 2026 GROWING SEASON`;
  qs('#region-summary').textContent = region.summary;
  qs('#region-note').textContent = region.note;
  qs('#current-lens').textContent = `${region.name} · ${region.overallLabel.toLowerCase()}`;
  qs('#overall-status').innerHTML = `<i></i>${region.overallLabel}`;
  setStatus('#overall-status', 'status-badge', region.overallStatus);

  qs('#climate-rainfall').textContent = `${region.rainfall} mm`;
  qs('#rainfall-detail').textContent = `Growing season · ${Math.abs(region.rainfallNormalDelta)}% below normal`;
  qs('#climate-reservoir').textContent = `${region.reservoir}%`;
  qs('#reservoir-detail').textContent = `Regional storage · ${region.reservoirTrend}`;
  qs('#climate-drought').textContent = `${region.drought.toFixed(1)} / 5`;
  qs('#drought-detail').textContent = region.droughtLabel;
  qs('#climate-soil').textContent = `${region.soil}%`;
  qs('#soil-detail').textContent = region.soilLabel;
  qs('#climate-irrigation').textContent = `${formatNumber(region.irrigation)} m³`;
  qs('#irrigation-detail').textContent = region.irrigationLabel;

  setStatus('#rainfall-card', 'climate-kpi', region.rainfallStatus);
  setStatus('#reservoir-card', 'climate-kpi', region.reservoirStatus);
  setStatus('#drought-card', 'climate-kpi', region.droughtStatus);
  setStatus('#soil-card', 'climate-kpi', region.soilStatus);
  setStatus('#irrigation-card', 'climate-kpi', region.irrigationStatus);
  setStatus('#resource-status', 'chart-status-pill', region.overallStatus);
  qs('#resource-status').textContent = region.resourceLabel;
  qs('#baseline-location').textContent = `${region.name} · ${region.country}`;
  qs('#rainfall-total-label').textContent = `${region.rainfall} mm total`;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const rainfallMax = Math.max(...region.rainfallMonthly, 120);
  qs('#rainfall-chart').style.setProperty('--chart-color', statusColors[region.rainfallStatus]);
  qs('#rainfall-chart').setAttribute('aria-label', `${region.name} monthly rainfall from January to June, totalling ${region.rainfall} millimetres`);
  qs('#rainfall-chart').innerHTML = region.rainfallMonthly.map((value, index) => `
    <div class="rainfall-column"><em>${value}</em><b style="height:${Math.max(4, (value / rainfallMax) * 92)}%"></b><span>${months[index]}</span></div>
  `).join('');

  qs('#water-sparkline').style.setProperty('--spark-color', statusColors[region.overallStatus]);
  qs('#water-sparkline').setAttribute('aria-label', `${region.name} reservoir trend ending at ${region.reservoir} percent`);
  qs('#water-sparkline').innerHTML = region.waterTrend.map((value) => `<i style="height:${Math.max(8, (value / 70) * 100)}%"></i>`).join('');
  qs('#water-budget-panel').style.setProperty('--demand-color', statusColors[region.overallStatus]);

  const resources = [
    { label: 'Reservoir', value: region.reservoir, suffix: '%', status: region.reservoirStatus },
    { label: 'Soil moisture', value: region.soil, suffix: '%', status: region.soilStatus },
    { label: 'Irrigation cover', value: region.irrigationCoverage, suffix: '%', status: region.irrigationStatus }
  ];
  qs('#resource-chart').innerHTML = resources.map((item) => `
    <div class="resource-row">
      <span>${item.label}</span>
      <div class="resource-track"><b style="width:${item.value}%;--bar-color:${statusColors[item.status]}"></b></div>
      <strong>${item.value}${item.suffix}</strong>
    </div>
  `).join('');
}

function applyRegion(regionId) {
  const region = regions[regionId];
  state.region = regionId;
  state.water = region.irrigation;
  state.stress = region.stress;
  qs('#water').value = String(region.irrigation);
  qs('#stress').value = String(region.stress);
  renderClimate();
  render();
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
  const seasonalValues = crops.map((crop) => Math.round(crop.demand * state.area * (crop.mix / 100) * multiplier * modeMultiplier));
  qs('#scenario-grid').innerHTML = crops.map((crop, index) => {
    const seasonal = seasonalValues[index];
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
  document.querySelectorAll('[data-crop-row]').forEach((row, index) => {
    row.querySelector('.bar-track i').style.width = `${Math.min(100, (seasonalValues[index] / Math.max(state.water, 1)) * 100)}%`;
    row.querySelector('em').textContent = `${Math.round(seasonalValues[index] / 1000)}k`;
  });
  qs('#chart-total-demand').style.width = `${Math.min(100, (demand / Math.max(state.water, 1)) * 100)}%`;
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
qs('#region-select').addEventListener('change', (e) => { applyRegion(e.target.value); });
qs('#sign-out').addEventListener('click', () => {
  sessionStorage.removeItem('aquaCropSession');
  window.location.replace('login.html');
});

document.querySelectorAll('.nav-item').forEach((link) => link.addEventListener('click', () => {
  document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active'));
  link.classList.add('active');
}));

applyRegion(state.region);
