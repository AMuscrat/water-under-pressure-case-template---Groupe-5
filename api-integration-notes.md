# Live API integration

The main AquaCrop page uses the existing Open-Meteo public APIs from the live Farm Inputs prototype. Geocoding resolves the selected location, then a 7-day forecast provides ET0, precipitation, and maximum temperature. If the live call fails, the dashboard keeps its labelled mock regional values rather than breaking.

No API key is required for these public Open-Meteo endpoints.
