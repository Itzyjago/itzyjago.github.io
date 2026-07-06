/* ===================================================================
   Carlo Ditalo — Portfolio  ·  interactions
   =================================================================== */
(function () {
  'use strict';

  /* ---- current year ---- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---- sticky nav + scroll progress bar ---- */
  var nav = document.getElementById('nav');
  var scrollbar = document.getElementById('scrollbar');
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (y > 30) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
    if (scrollbar) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var p = h > 0 ? y / h : 0;
      scrollbar.style.transform = 'scaleX(' + Math.min(1, Math.max(0, p)) + ')';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- section rail (current-section indicator) ---- */
  var railLinks = document.querySelectorAll('.section-rail a');
  if (railLinks.length && 'IntersectionObserver' in window) {
    var sections = [];
    railLinks.forEach(function (link) {
      var id = link.getAttribute('data-rail');
      var section = document.getElementById(id);
      if (section) sections.push({ id: id, el: section, link: link });
    });
    var railObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var match = sections.find(function (s) { return s.el === entry.target; });
        if (!match) return;
        if (entry.isIntersecting) {
          railLinks.forEach(function (l) { l.classList.remove('active'); });
          match.link.classList.add('active');
        }
      });
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
    sections.forEach(function (s) { railObserver.observe(s.el); });
  }

  /* ---- certificate modal ---- */
  var certModal = document.getElementById('certModal');
  if (certModal) {
    var certModalImg = document.getElementById('certModalImg');
    var certModalTitle = document.getElementById('certModalTitle');
    var certModalOrg = document.getElementById('certModalOrg');
    var lastCertTrigger = null;

    function openCertModal(btn) {
      var img = btn.querySelector('img');
      var title = btn.querySelector('.cert__meta h5');
      var org = btn.querySelector('.cert__org');
      certModalImg.src = img.src;
      certModalImg.alt = img.alt;
      certModalTitle.textContent = title ? title.textContent : '';
      certModalOrg.textContent = org ? org.textContent : '';
      lastCertTrigger = btn;
      certModal.classList.add('open');
      certModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      certModal.querySelector('.cert-modal__close').focus();
    }

    function closeCertModal() {
      certModal.classList.remove('open');
      certModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (lastCertTrigger) lastCertTrigger.focus();
    }

    document.querySelectorAll('.cert').forEach(function (btn) {
      btn.addEventListener('click', function () { openCertModal(btn); });
    });
    certModal.querySelectorAll('[data-cert-close]').forEach(function (el) {
      el.addEventListener('click', closeCertModal);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && certModal.classList.contains('open')) closeCertModal();
    });
  }

  /* ---- theme toggle (light/dark) ---- */
  var themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      var next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  }

  /* ---- mobile menu ---- */
  var toggle = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');
  function closeMenu() {
    links.classList.remove('open');
    toggle.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }
  toggle.addEventListener('click', function () {
    var open = links.classList.toggle('open');
    toggle.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
  });
  links.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', closeMenu);
  });

  /* ---- scroll-reveal ---- */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---- service card spotlight (pointer-tracked glow) ---- */
  document.querySelectorAll('.card').forEach(function (card) {
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* ---- contact form (Web3Forms with graceful mailto fallback) ---- */
  var form = document.getElementById('contactForm');
  var statusEl = document.getElementById('formStatus');
  var submitBtn = document.getElementById('submitBtn');
  var EMAIL = 'ditalocarloisidro11301@gmail.com';

  if (form) {
    var keyField = form.querySelector('input[name="access_key"]');
    var keyConfigured = keyField && keyField.value && keyField.value !== 'YOUR_WEB3FORMS_ACCESS_KEY';

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var name = form.name.value.trim();
      var email = form.email.value.trim();
      var message = form.message.value.trim();

      // Fallback: no key set yet — open the user's email client pre-filled.
      if (!keyConfigured) {
        var subject = encodeURIComponent('Project inquiry from ' + (name || 'your site'));
        var body = encodeURIComponent(message + '\n\n— ' + name + ' (' + email + ')');
        window.location.href = 'mailto:' + EMAIL + '?subject=' + subject + '&body=' + body;
        setStatus('Opening your email app…', 'success');
        return;
      }

      // Submit to Web3Forms via fetch.
      setStatus('Sending…', '');
      submitBtn.disabled = true;
      var data = new FormData(form);

      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' }
      })
        .then(function (res) { return res.json(); })
        .then(function (json) {
          if (json.success) {
            setStatus('Thanks! Your message has been sent. I\'ll get back to you soon.', 'success');
            form.reset();
          } else {
            setStatus('Something went wrong. Email me directly at ' + EMAIL, 'error');
          }
        })
        .catch(function () {
          setStatus('Network error. Email me directly at ' + EMAIL, 'error');
        })
        .finally(function () { submitBtn.disabled = false; });
    });
  }

  function setStatus(msg, type) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = 'form__status' + (type ? ' ' + type : '');
  }
})();
