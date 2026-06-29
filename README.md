# Carlo Ditalo — Personal Portfolio

A static, single-page portfolio site (dark + neon theme) built to win freelance clients **and**
support job hunting. No build step — plain HTML, CSS, and vanilla JS.

## Preview locally

Just open `index.html` in a browser, or run a tiny static server (better, so the contact form's
`fetch` works without file-origin issues):

```bash
# Python
python -m http.server 8000
# then open http://localhost:8000
```

## File structure

```
carlo-portfolio/
├── index.html        # all sections
├── css/styles.css    # theme + layout + responsive
├── js/main.js        # nav, scroll-reveal, contact form
├── assets/           # resume PDF, favicon, og-image
└── README.md
```

## ✉️ Enable the contact form (1 minute)

The form works **out of the box** in fallback mode: it opens the visitor's email app pre-filled.
To receive submissions in your inbox instead (recommended):

1. Go to **https://web3forms.com** and enter your email — you'll get a free **Access Key**.
2. Open `index.html`, find this line, and paste your key:
   ```html
   <input type="hidden" name="access_key" value="YOUR_WEB3FORMS_ACCESS_KEY" />
   ```
3. Done. Submissions now arrive at the email you registered. (Free plan covers plenty of messages.)

## 🚀 Deploy to GitHub Pages

1. Create a new repo on GitHub (e.g. `Itzyjago/portfolio` — or `Itzyjago.github.io` for a root URL).
2. Push these files:
   ```bash
   cd carlo-portfolio
   git init
   git add .
   git commit -m "Personal portfolio site"
   git branch -M main
   git remote add origin https://github.com/Itzyjago/portfolio.git
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Build and deployment → Source: `Deploy from a branch`**,
   pick branch `main` / folder `/ (root)`, save.
4. Your site goes live at `https://Itzyjago.github.io/portfolio/` in ~1 minute.

> Tip: For a clean `https://itzyjago.github.io` URL, name the repo `Itzyjago.github.io` instead.

## Customize

- **Colors:** edit the `--neon`, `--neon-2`, and background tokens at the top of `css/styles.css`.
- **Content:** all copy lives in `index.html` (sections are clearly commented).
- **Resume:** replace `assets/Carlo-Ditalo-Resume.pdf` to update the download.
