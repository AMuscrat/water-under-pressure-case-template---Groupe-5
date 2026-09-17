(() => {
  const set = (selector, text) => { const el = document.querySelector(selector); if (el) el.textContent = text; };
  set('#current-lens-note', 'Live Open-Meteo weather/soil + Global Water Watch reservoir data · irrigation availability is an API-derived estimate.');
  set('#reservoir-card .climate-kpi-top span', 'Reservoir availability');
  set('#irrigation-card .climate-kpi-top span', 'Irrigation availability estimate');
  set('#water-climate .mock-data-note', 'Live sources: Open-Meteo weather/soil + Global Water Watch reservoir observations. Irrigation availability is a transparent API-derived estimate, not a legal or cooperative allocation.');
})();
