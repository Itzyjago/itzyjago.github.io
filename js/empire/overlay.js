/* DOM overlay: district panels, nav fast-travel, live badge, contact form. */
import { STOP_META } from './config.js';

const EMAIL = 'ditalocarloisidro11301@gmail.com';

export function createOverlay({ onFastTravel } = {}) {
  const panels = new Map(STOP_META.map((m) => [m.id, document.getElementById(`panel-${m.id}`)]));
  const blockReadout = document.getElementById('blockReadout');
  let onDistrictChange = null;

  /* ---- nav links: the car drives you there ---- */
  document.querySelectorAll('[data-stop-link]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      if (onFastTravel) onFastTravel(a.dataset.stopLink);
      document.getElementById('navLinks')?.classList.remove('open');
    });
  });

  /* ---- deep link: which district to spawn at ---- */
  const hash = location.hash.replace('#', '');
  const initialDistrict =
    STOP_META.find((m) => m.id === hash || (hash === 'work' && m.id === 'projects'))?.id || null;

  /* ---- lite mode: every road out persists the preference ---- */
  document.querySelectorAll('a[href^="lite.html"]').forEach((a) => {
    a.addEventListener('click', () => {
      try { localStorage.setItem('preferLite', '1'); } catch { /* ok */ }
    });
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

  /* ---- district panels ---- */
  let currentDistrict = undefined; /* undefined = not yet set; null = open road */
  function showDistrict(id) {
    if (id === currentDistrict) return;
    currentDistrict = id;
    panels.forEach((panel, pid) => panel?.classList.toggle('visible', pid === id));
    const meta = STOP_META.find((m) => m.id === id);
    if (blockReadout) {
      blockReadout.textContent = meta ? `BLK ${meta.num} · ${meta.en}` : 'OPEN ROAD';
    }
    if (meta) {
      history.replaceState(null, '',
        meta.id === 'hero' ? location.pathname + location.search : '#' + meta.id);
    }
    if (onDistrictChange) onDistrictChange(id);
  }

  /* ---- drive hint ---- */
  const hint = document.getElementById('driveHint');
  if (hint && (matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window)) {
    hint.textContent = 'TAP THE STREET — THE CAR DRIVES YOU THERE';
  }
  let hintHidden = false;
  function hideHint() {
    if (hintHidden || !hint) return;
    hintHidden = true;
    hint.classList.add('hidden');
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

  document.getElementById('year')?.append(String(new Date().getFullYear()));

  return {
    showDistrict,
    setLiveCount,
    hideHint,
    initialDistrict,
    set onDistrictChange(fn) { onDistrictChange = fn; },
    hideLoader() {
      const l = document.getElementById('loader');
      if (l) { l.classList.add('done'); setTimeout(() => l.remove(), 900); }
    },
  };
}
