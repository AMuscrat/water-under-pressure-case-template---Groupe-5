(() => {
  const set = (selector, text) => { const el = document.querySelector(selector); if (el) el.textContent = text; };
  set('#current-lens-note', 'Live Open-Meteo weather/soil + Global Water Watch reservoir data · irrigation availability is an API-derived estimate.');
  set('#water-climate .climate-toolbar p', 'Live Open-Meteo weather and soil data are combined with Global Water Watch reservoir observations. Irrigation availability is estimated from live API inputs and is not an official allocation.');
  set('#reservoir-card .climate-kpi-top span', 'Reservoir availability');
  set('#irrigation-card .climate-kpi-top span', 'Irrigation availability estimate');
  set('#water-climate .mock-data-note', 'Live sources: Open-Meteo weather/soil + Global Water Watch reservoir observations. Irrigation availability is a transparent API-derived estimate, not a legal or cooperative allocation.');
  const methodology = document.querySelectorAll('#methodology .method-grid article');
  if (methodology[0]) methodology[0].querySelector('p').textContent = 'Open-Meteo provides seven-day ET₀, precipitation, maximum temperature and near-surface soil-moisture data for the selected region centroid.';
  if (methodology[1]) { methodology[1].querySelector('h3').textContent = 'Reservoir & irrigation layer'; methodology[1].querySelector('p').textContent = 'Global Water Watch provides near-real-time reservoir observations. The dashboard combines reservoir position, soil moisture, rainfall and ET₀ into an irrigation-availability estimate; it is not an official allocation or permit.'; }
  set('#methodology .methodology-note', 'Important: weather, soil and reservoir observations come from public APIs. Irrigation availability and crop recommendations are derived prototype indicators and must not be treated as official allocations, agronomic advice, or financial advice.');
})();
