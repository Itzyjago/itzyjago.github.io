# Carlo Ditalo — Portfolio

A clean, professional personal portfolio: neutral black/white/gray palette, light + dark mode,
no build step — plain HTML/CSS/JS.

Live at **https://itzyjago.github.io** (GitHub Pages), with a Netlify twin.

## The pieces

```
carlo-portfolio/
├── index.html      # the site
├── css/styles.css  # all styles — palette tokens (incl. dark mode) at the top
├── js/main.js      # nav, scroll-reveal, theme toggle, contact form
└── assets/         # resume PDF, favicon, og-image, certificates
```

## Preview locally

```bash
python -m http.server 8000
```

## Theme

Light/dark is a `data-theme` attribute on `<html>`, toggled by the button in the nav and
persisted to `localStorage`. Defaults to the visitor's OS preference on first visit. All colors
are CSS custom properties defined at the top of `css/styles.css` — the `@media (prefers-color-scheme: dark)`
block and the `:root[data-theme="dark"]` block hold the same values so both the system-preference
fallback and the explicit toggle stay in sync.

## ✉️ Enable the contact form (1 minute)

The form works out of the box in fallback mode (opens the visitor's email app). To receive
submissions in your inbox: get a free Access Key at **https://web3forms.com**, then paste it into
`index.html`:

```html
<input type="hidden" name="access_key" value="YOUR_WEB3FORMS_ACCESS_KEY" />
```

## Deploy

Push to `main` — GitHub Pages serves the site, and the connected Netlify site auto-builds from the
same repo.

## Customize

- **Palette:** CSS custom properties at the top of `css/styles.css` (light values in `:root`, dark
  values in the `@media (prefers-color-scheme: dark)` and `:root[data-theme="dark"]` blocks).
- **Content:** all sections live in `index.html`.
- **Resume:** replace `assets/Carlo-Ditalo-Resume.pdf`.
- **Certificates:** add images to `assets/certs/` and a matching `.cert` card in the Certifications
  block of `index.html`.
