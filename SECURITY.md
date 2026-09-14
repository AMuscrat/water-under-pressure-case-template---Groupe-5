# AquaCrop Decision Lab security notes

This prototype is browser-based, so the hardening focuses on reducing common web exposure without adding unnecessary infrastructure.

## Controls enabled

- **Content Security Policy:** limits scripts/styles/resources to the application and the two Open-Meteo hosts used by the live weather integration; blocks plugins and framing.
- **MIME sniffing protection:** `X-Content-Type-Options: nosniff`.
- **Referrer control:** `strict-origin-when-cross-origin` to avoid sending full paths to external origins.
- **Permissions minimisation:** camera, microphone, geolocation and payment browser capabilities are disabled. The app uses server-side geocoding through Open-Meteo instead of requesting browser geolocation permission.
- **HTTPS enforcement:** HSTS is enabled for the deployed site.
- **API exposure:** no API key is stored in the browser for Open-Meteo. Only explicitly allowed Open-Meteo origins are permitted by the CSP.

## Remaining prototype limitation

The demo uses client-side `sessionStorage` for its simple login gate. This is suitable for a classroom prototype but is **not authentication** for production use. A production deployment should use server-managed authentication, secure cookies, CSRF protection where applicable, and server-side API mediation for any privileged or keyed integrations.
