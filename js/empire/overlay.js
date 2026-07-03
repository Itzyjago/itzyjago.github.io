/* DOM overlay: panels, district-map HUD, nav, live badge, contact form. */
import { STOP_META } from './config.js';

const EMAIL = 'ditalocarloisidro11301@gmail.com';

export function createOverlay(rig) {
  const panels = STOP_META.map((m) => document.getElementById(`panel-${m.id}`));
  const dmapButtons = [];
  let currentStop = -1;
  let onStopChange = null;

  /* ---- scroll metrics ---- */
  const spacer = document.getElementById('scrollSpacer');
  function scrollRange() {
    return Math.max(1, document.documentElement.scrollHeight - innerHeight);
  }
  function progress() {
    return Math.min(1, Math.max(0, (scrollY || 0) / scrollRange()));
  }
  function scrollToStop(i, smooth = true) {
    scrollTo({ top: rig.progressForStop(i) * scrollRange(), behavior: smooth ? 'smooth' : 'auto' });
  }

  /* ---- district map HUD ---- */
  const dmap = document.getElementById('dmapStops');
  const dmapFill = document.getElementById('dmapFill');
  STOP_META.forEach((m, i) => {
    const b = document.createElement('button');
    b.className = 'dmap__stop';
    b.innerHTML = `<span class="dmap__k">${m.num}</span><span class="dmap__n">${m.en}</span>`;
    b.setAttribute('aria-label', `Go to ${m.en}`);
    b.addEventListener('click', () => scrollToStop(i));
    dmap.appendChild(b);
    dmapButtons.push(b);
  });

  const blockReadout = document.getElementById('blockReadout');

  /* ---- nav links + hash deep links ---- */
  document.querySelectorAll('[data-stop-link]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const i = STOP_META.findIndex((m) => m.id === a.dataset.stopLink);
      if (i >= 0) scrollToStop(i);
      document.getElementById('navLinks')?.classList.remove('open');
    });
  });
  const hash = location.hash.replace('#', '');
  const hashIdx = STOP_META.findIndex((m) => m.id === hash || (hash === 'work' && m.id === 'projects'));
  if (hashIdx > 0) setTimeout(() => scrollToStop(hashIdx, false), 60);

  /* ---- lite mode ---- */
  document.getElementById('liteLink')?.addEventListener('click', () => {
    try { localStorage.setItem('preferLite', '1'); } catch { /* ok */ }
  });

  /* ---- mobile nav toggle ---- */
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  navToggle?.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
  });

  /* ---- live badge ---- */
  const badge = document.getElementById('liveBadge');
  const badgeN = document.getElementById('liveCount');
  function setLiveCount(n) {
    if (!badge) return;
    if (n > 0) {
      badge.classList.add('on');
      badgeN.textContent = String(n);
    } else {
      badge.classList.remove('on');
    }
  }

  /* ---- contact form (same behavior as lite site) ---- */
  const form = document.getElementById('contactForm');
  const statusEl = document.getElementById('formStatus');
  const submitBtn = document.getElementById('submitBtn');
  function setStatus(msg, kind) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = 'form__status' + (kind ? ' form__status--' + kind : '');
  }
  if (form) {
    const keyField = form.querySelector('input[name="access_key"]');
    const keyConfigured = keyField && keyField.value && keyField.value !== 'YOUR_WEB3FORMS_ACCESS_KEY';
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = form.name.value.trim();
      const email = form.email.value.trim();
      const message = form.message.value.trim();
      if (!keyConfigured) {
        const subject = encodeURIComponent('Project inquiry from ' + (name || 'your site'));
        const body = encodeURIComponent(message + '\n\n— ' + name + ' (' + email + ')');
        location.href = `mailto:${EMAIL}?subject=${subject}&body=${body}`;
        setStatus('Opening your email app…', 'success');
        return;
      }
      setStatus('Sending…', '');
      submitBtn.disabled = true;
      fetch('https://api.web3forms.com/submit', {
        method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' },
      })
        .then((r) => r.json())
        .then((j) => {
          if (j.success) { setStatus("Thanks! Your message has been sent. I'll get back to you soon.", 'success'); form.reset(); }
          else setStatus('Something went wrong. Email me directly at ' + EMAIL, 'error');
        })
        .catch(() => setStatus('Network error. Email me directly at ' + EMAIL, 'error'))
        .finally(() => { submitBtn.disabled = false; });
    });
  }

  /* ---- per-frame sync ---- */
  const scrollHint = document.getElementById('scrollHint');
  function sync() {
    const p = progress();
    rig.setProgress(p);

    const stop = rig.stopIndexAt(rig.p);
    if (stop !== currentStop) {
      currentStop = stop;
      const meta = STOP_META[stop];
      dmapButtons.forEach((b, i) => b.classList.toggle('active', i === stop));
      if (blockReadout) {
        blockReadout.textContent = `BLK ${meta.num} · ${meta.en}`;
      }
      if (onStopChange) onStopChange(meta.id);
    }
    if (dmapFill) dmapFill.style.height = `${rig.p * 100}%`;
    if (scrollHint) scrollHint.classList.toggle('hidden', p > 0.015);

    panels.forEach((panel, i) => {
      if (!panel) return;
      const a = rig.dwellAmount(rig.p, i);
      if (a <= 0.02) {
        panel.classList.remove('visible');
      } else {
        panel.classList.add('visible');
        panel.style.opacity = a;
      }
    });
  }

  /* keyboard: arrows jump between stops */
  addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, select')) return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); scrollToStop(Math.min(5, currentStop + 1)); }
    if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); scrollToStop(Math.max(0, currentStop - 1)); }
  });

  document.getElementById('year')?.append(String(new Date().getFullYear()));

  return {
    sync,
    setLiveCount,
    set onStopChange(fn) { onStopChange = fn; },
    hideLoader() {
      const l = document.getElementById('loader');
      if (l) { l.classList.add('done'); setTimeout(() => l.remove(), 900); }
    },
  };
}
