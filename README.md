# Carlo Ditalo — The Neon Empire

A personal portfolio as a **drivable 3D neon city** (Three.js): you spawn in a car at the torii
gate and drive the land — every building is a shipped project, the skills are a construction site,
and live visitors drift through the streets as warm paper lanterns. Drive with WASD/arrows or
tap/click the street; nav links auto-drive you there. No build step — plain HTML/CSS/JS with
Three.js vendored as an ES module.

Live at **https://itzyjago.github.io** (GitHub Pages) with a Netlify twin hosting the presence API.

## The pieces

```
carlo-portfolio/
├── index.html                    # the 3D experience (capability-gated)
├── lite.html                     # classic 2D site — fallback + user preference
├── dashboard.html                # "District Watch": private live-visitor dashboard
├── css/empire.css                # 3D overlay UI     css/styles.css → lite site
├── js/empire/                    # world, landmarks, car, drive controls, chase cam,
│                                 #   districts, overlay, presence client
│   └── config.js                 # ← NETLIFY_SITE + presence endpoint config
├── js/vendor/three.module.min.js # Three.js r166, vendored (importmap)
├── js/main.js                    # lite-site JS
├── netlify/functions/presence.mjs# presence API (Netlify Functions 2.0 + Blobs)
├── netlify.toml                  # publish config + function routing
└── assets/                       # resume PDF, favicon, og-image
```

Visitors without WebGL / importmap support, with `prefers-reduced-motion`, or who choose the
**LITE** link are served `lite.html`. `?force3d` returns to the 3D site; `?lite` previews the
lite one.

## Preview locally

```bash
npx netlify dev        # serves the site AND the presence function at :8888
# or, static-only (presence disabled):
python -m http.server 8000
```

## Live presence

- Public: a "N in the district" badge + lanterns, via anonymous 12s heartbeats to `/api/presence`.
- Private: `dashboard.html` shows who's on the site (section, country, device, referrer) — gated
  by the `PRESENCE_DASHBOARD_KEY` environment variable set in the Netlify UI.
- `js/empire/config.js` → `NETLIFY_SITE` must hold the Netlify site URL so the GitHub Pages
  origin can reach the API.

## ✉️ Enable the contact form (1 minute)

The form works out of the box in fallback mode (opens the visitor's email app). To receive
submissions in your inbox: get a free Access Key at **https://web3forms.com**, then paste it in
**both** `index.html` and `lite.html`:

```html
<input type="hidden" name="access_key" value="YOUR_WEB3FORMS_ACCESS_KEY" />
```

## Deploy

Push to `main` — GitHub Pages serves the site, and the connected Netlify site auto-builds the
presence function from the same repo.

## Customize

- **Palette:** `PALETTE` in `js/empire/config.js` (+ CSS tokens at the top of `css/empire.css`).
- **Districts:** `STOP_META` in config.js and `DISTRICTS` in `js/empire/districts.js`.
- **Content:** panels live in `index.html`; the lite site mirrors them in `lite.html`.
- **Resume:** replace `assets/Carlo-Ditalo-Resume.pdf`.
