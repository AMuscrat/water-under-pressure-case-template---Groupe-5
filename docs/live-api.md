# Live API integration

The Farm Inputs live page uses Open-Meteo directly from the browser.

- Geocoding: `https://geocoding-api.open-meteo.com/v1/search`
- Weather: `https://api.open-meteo.com/v1/forecast`
- Live variables used: daily FAO-56 reference evapotranspiration (ET0), precipitation sum, and maximum temperature.

The crop baseline data remains in `data/crop-baselines-live.js` so live weather and agronomic assumptions stay separate.
