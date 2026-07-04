# The Neon Empire — 3D Portfolio Rebuild (Design Spec)

**Date:** 2026-07-04 · **Site:** https://itzyjago.github.io (repo `Itzyjago/Itzyjago.github.io`)
**Approved concept:** Full 3D experience — a Japanese cyber-city ("The Neon Empire") where Carlo's projects are the buildings and his skills are the structure. Plus real-time visitor visibility: a public "viewing now" presence and a private live dashboard.

## 1. Concept

A stylized neon-Tokyo district at night rendered in Three.js, using the existing brand palette (teal `#36f1cd`, purple `#7c5cff`, dark `#07080d`). Scrolling flies the camera along a spline path through the district. Portfolio content appears as DOM overlay panels synced to camera stops (content stays selectable, accessible, and SEO-visible — no text baked into WebGL).

### Journey map (scroll order)

| Stop | Landmark | Content |
|---|---|---|
| 1. Arrival | Glowing **torii gate**, city skyline, name in neon signage | Hero: name, role, pitch, Hire Me / Résumé, socials, portrait chip |
| 2. Services Row | Neon market street of 4 stalls/signs | 4 service cards (Full-Stack, AI Automation, API & Integrations, Backend & DB) |
| 3. HQ Pagoda | Multi-tier neon **pagoda** = Carlo HQ | About text + 4 stats (2+ yrs, 7+ platforms, 3 live, 100% ownership) |
| 4. Empire District | Six **project buildings** with animated neon signage: IDS, MERIDIAN, GROWTHOS towers (tallest, "LIVE" beacons) + TalentFlow, Hope IS, EmpowerEd blocks | Project panels with description, tags, live links |
| 5. The Structure | Building **under construction**: glowing steel frame; beams labeled with skills | Skills groups (Languages, Frontend, DB, AI & Automation, APIs & DevOps, Reporting) |
| 6. Rooftop Beacon | Rooftop with light beam into the sky | Contact links (email, WhatsApp, LinkedIn, GitHub) + Web3Forms contact form |

### Live-visitor integration
- Each concurrent visitor renders as a **floating paper lantern** drifting over the city.
- Public badge: "● N in the district right now" near the hero.
- Both degrade gracefully: if the presence server is unreachable, lanterns/badge simply don't appear.

## 2. Architecture

### Frontend (this repo, stays GitHub Pages / no build step)
- **`index.html`** — the 3D experience. Fixed full-screen canvas + scrollable DOM overlay sections.
- **`lite.html`** — the current 2D site, preserved verbatim (nav links adjusted). Auto-redirect target when: no WebGL2, `prefers-reduced-motion: reduce`, or `?lite`. A "Lite mode" toggle is always in the 3D nav; choice persisted in localStorage.
- **`dashboard.html`** — private realtime dashboard (see §4).
- **`js/vendor/three.module.min.js`** — vendored Three.js (pinned version, no CDN dependency), loaded via import map. *Deviation from the earlier Vite recommendation:* vendored no-build keeps the current push-to-main = live deploy with zero repo-settings changes; scene code is all procedural so bundle-size benefits of Vite are negligible here.
- **`js/empire/`** — ES modules: `main.js` (bootstrap, fallback check), `world.js` (scene, lights, fog, ground grid, skyline), `landmarks.js` (torii, pagoda, project buildings, construction frame, beacon), `signage.js` (canvas-texture neon signs), `camera-path.js` (Catmull-Rom spline + scroll sync), `lanterns.js` (visitor lanterns), `presence.js` (WS client), `overlay.js` (panel show/hide by scroll progress).
- All geometry procedural (boxes, cylinders, planes, emissive materials, canvas textures). No downloaded models. Target < 600 KB JS total, 60 fps on mid hardware, pixel ratio capped at 2, bloom-free (emissive + fog instead of postprocessing) to stay light.

### Presence — serverless, GitHub-only (revised 2026-07-04 per user: no Coolify, code lives only in the portfolio repo)

> **SUPERSEDED (2026-07-04, same day):** the user connected the repo to Netlify, so the shipped
> implementation is a **Netlify Function + Netlify Blobs** at `/api/presence` (POST heartbeats,
> GET count, keyed GET roster gated by the `PRESENCE_DASHBOARD_KEY` env var, geo from Netlify's
> edge context). The MQTT design below was never shipped; kept for the record.
- No backend at all. Realtime presence rides a **public MQTT-over-WebSocket broker** (primary `wss://broker.emqx.io:8084/mqtt`, fallback `wss://broker.hivemq.com:8884/mqtt`), vendored `mqtt.min.js`.
- Topic namespace `itzyjago/neon-empire/v1/`: each visitor gets a random session id and publishes `hb/<id>` heartbeats (every 10 s + on section change) with `{t, sec, dev, bro, ref, cc}` — timestamp, current section, device class, browser, referrer *hostname only*, ISO country code (from a free client-side IP API, `api.country.is` → `ipwho.is` fallback; omitted if both fail). `bye/<id>` on unload.
- Every open tab subscribes to `hb/+` and `bye/+`; live count = unique ids heartbeating within the last 30 s. Badge and lanterns update from this.
- `dashboard.html` subscribes to the same feed and renders the roster (flag/country, device+browser, current district stop, referrer host, time on site). It is unlinked + `noindex` — obscurity, not auth. Known trade-offs, accepted: public broker means the coarse anonymous feed is technically readable by anyone, no true dashboard auth, and free-broker availability is best-effort (everything no-ops gracefully when unreachable). Upgrade path if ever wanted: a tiny self-hosted WS server swaps in behind `presence.js` without touching the rest.

## 3. Fallbacks & accessibility
- Lite mode as above; skip-to-content link; overlay panels are semantic HTML identical in content to the current site.
- `prefers-reduced-motion` → lite. Page hidden (tab switch) → rAF paused, WS stays connected.
- Mobile: 3D works (lower density skyline, no shadows) but a "Lite" prompt is shown on very small screens.

## 4. Private dashboard
- `dashboard.html` asks for the key once (stored in localStorage), connects as dashboard role.
- Shows: live count, per-visitor rows (flag/country, device+browser, current section, referrer, time on site), and a simple session log for the current dashboard session. In-brand dark/neon styling. No historical analytics (YAGNI — this is "who's looking right now").

## 5. Testing & verification
- Presence server: unit test for roster/broadcast logic (node --test), run locally before deploy.
- Frontend: Playwright drive — load, WebGL canvas present, scroll to each stop, panels visible, lite fallback via `?lite`, presence badge with local server running.
- Live verification after deploy: itzyjago.github.io renders 3D, counter shows ≥1, dashboard sees the visitor.

## 6. Out of scope
- Historical analytics, visitor identity, chat. GLTF/model assets. Vite/build pipeline. Changing the résumé/content copy (carried over verbatim).
