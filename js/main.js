/* ==========================================================================
   main.js — ניווט, אנימציות חשיפה, CTA דביק, טופס
   ללא תלויות חיצוניות.
   ========================================================================== */

(function () {
  'use strict';

  var CFG = window.SITE_CONFIG || {};
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ======================================================================
     שנה בפוטר
     ====================================================================== */
  var yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ======================================================================
     פרטי קשר מהקונפיג
     ====================================================================== */
  function buildWhatsappUrl(text) {
    return 'https://wa.me/' + (CFG.phoneIntl || '') + '?text=' + encodeURIComponent(text || '');
  }

  var waBtn = $('#stickyWhatsapp');
  if (waBtn) waBtn.href = buildWhatsappUrl(CFG.whatsappGreeting);

  var linkPhone = $('#linkPhone');
  if (linkPhone && CFG.phone) linkPhone.href = 'tel:' + CFG.phone;

  var linkMail = $('#linkMail');
  if (linkMail && CFG.email) linkMail.href = 'mailto:' + CFG.email;

  /* ======================================================================
     ניווט — צל בגלילה
     ====================================================================== */
  var nav = $('#nav');

  function onScroll() {
    if (nav) nav.classList.toggle('is-stuck', window.scrollY > 8);
    updateStickyCta();
    updateActiveLink();
  }

  /* ======================================================================
     תפריט מובייל
     ====================================================================== */
  var toggle = $('#navToggle');
  var menu   = $('#mobileMenu');

  function setMenu(open) {
    if (!toggle || !menu) return;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'סגירת תפריט' : 'פתיחת תפריט');
    menu.classList.toggle('is-open', open);
    document.body.classList.toggle('is-locked', open);
  }

  if (toggle) {
    toggle.addEventListener('click', function () {
      setMenu(toggle.getAttribute('aria-expanded') !== 'true');
    });
  }

  $$('.mobile-menu__link, .mobile-menu .btn').forEach(function (link) {
    link.addEventListener('click', function () { setMenu(false); });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    setMenu(false);
    if (typeof closeLightbox === 'function') closeLightbox();
  });

  /* ======================================================================
     אנימציות חשיפה (§26 — עדינות בלבד)
     ====================================================================== */
  var revealEls = $$('.reveal');

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    revealEls.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ======================================================================
     סימון הקישור הפעיל בניווט
     ====================================================================== */
  var navLinks = $$('.nav__link');
  var watched  = navLinks
    .map(function (l) { return document.getElementById(l.getAttribute('href').slice(1)); })
    .filter(Boolean);

  /* נבחר סקשן אחד בלבד: האחרון שהתחיל מעל קו ה-40% של המסך.
     חישוב ישיר במקום IntersectionObserver — כששני סקשנים נחתכים יחד,
     תצפית מבוססת-אירועים יכלה להשאיר שני קישורים מסומנים. */
  function updateActiveLink() {
    if (!watched.length) return;
    var line = window.innerHeight * 0.4;
    var current = null;

    watched.forEach(function (sec) {
      if (sec.getBoundingClientRect().top <= line) current = sec;
    });

    // בתחתית הדף מסמנים תמיד את הסקשן האחרון
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 4) {
      current = watched[watched.length - 1];
    }

    navLinks.forEach(function (l) {
      l.classList.toggle('is-active', !!current && l.getAttribute('href') === '#' + current.id);
    });
  }

  /* ======================================================================
     CTA דביק במובייל — מופיע אחרי ה-Hero, נעלם באזור הטופס
     ====================================================================== */
  var stickyCta = $('#stickyCta');
  var hero      = $('#top');
  var contact   = $('#contact');

  function updateStickyCta() {
    if (!stickyCta) return;
    var pastHero = hero ? window.scrollY > (hero.offsetHeight * 0.7) : window.scrollY > 400;
    var inContact = false;
    if (contact) {
      var r = contact.getBoundingClientRect();
      inContact = r.top < window.innerHeight && r.bottom > 0;
    }
    stickyCta.classList.toggle('is-visible', pastHero && !inContact);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', updateStickyCta);
  onScroll();

  /* ======================================================================
     Lightbox — הגדלת צילומי מסך של פרויקטים
     ====================================================================== */
  var lightbox    = $('#lightbox');
  var lightboxImg = $('#lightboxImg');
  var lightboxCap = $('#lightboxCaption');
  var lightboxX   = $('#lightboxClose');
  var lastFocused = null;

  function openLightbox(trigger) {
    if (!lightbox) return;
    lastFocused = trigger;
    lightboxImg.src = trigger.getAttribute('data-zoom');
    lightboxImg.alt = trigger.querySelector('img') ? trigger.querySelector('img').alt : '';
    lightboxCap.textContent = trigger.getAttribute('data-caption') || '';
    lightbox.classList.add('is-open');
    document.body.classList.add('is-locked');
    // האלמנט עדיין visibility:hidden ברגע הוספת המחלקה — פוקוס מיידי נכשל בשקט
    requestAnimationFrame(function () { lightboxX.focus(); });
  }

  function closeLightbox() {
    if (!lightbox || !lightbox.classList.contains('is-open')) return;
    lightbox.classList.remove('is-open');
    document.body.classList.remove('is-locked');
    if (lastFocused && lastFocused.focus) lastFocused.focus();
    // משחררים את התמונה רק אחרי אנימציית היציאה
    setTimeout(function () {
      if (!lightbox.classList.contains('is-open')) lightboxImg.src = '';
    }, 300);
  }

  $$('[data-zoom]').forEach(function (btn) {
    btn.addEventListener('click', function () { openLightbox(btn); });
  });

  if (lightbox) {
    lightboxX.addEventListener('click', closeLightbox);
    // לחיצה על הרקע סוגרת; לחיצה על התמונה עצמה לא
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeLightbox();
    });
  }

  /* ======================================================================
     טופס
     ====================================================================== */
  var form      = $('#leadForm');
  var statusBox = $('#formStatus');
  var submitBtn = $('#submitBtn');

  if (form) {

    var REQUIRED_TEXT = ['fullName', 'phone', 'email'];

    function showStatus(type, html) {
      if (!statusBox) return;
      statusBox.className = 'form__status is-shown ' + (type === 'ok' ? 'is-ok' : 'is-error');
      statusBox.innerHTML = html;
    }

    function clearStatus() {
      if (statusBox) statusBox.className = 'form__status';
    }

    function setFieldError(name, hasError) {
      var input = form.elements[name];
      var el = input && input.length ? input[0] : input;
      var wrapper = el && el.closest ? el.closest('.field, .fieldset') : null;
      var errorEl = form.querySelector('[data-error-for="' + name + '"]');

      if (wrapper) wrapper.classList.toggle('has-error', hasError);
      if (errorEl) errorEl.style.display = hasError ? 'block' : 'none';
      if (el && el.setAttribute && !el.length) {
        el.setAttribute('aria-invalid', hasError ? 'true' : 'false');
      }
    }

    function isValidEmail(v) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
    }

    function isValidPhone(v) {
      var digits = v.replace(/\D/g, '');
      return digits.length >= 9 && digits.length <= 15;
    }

    function validate() {
      var ok = true;
      var firstBad = null;

      REQUIRED_TEXT.forEach(function (name) {
        var el = form.elements[name];
        var value = (el.value || '').trim();
        var bad = !value;

        if (!bad && name === 'email') bad = !isValidEmail(value);
        if (!bad && name === 'phone') bad = !isValidPhone(value);

        setFieldError(name, bad);
        if (bad) { ok = false; firstBad = firstBad || el; }
      });

      var need = form.querySelector('input[name="need"]:checked');
      setFieldError('need', !need);
      if (!need) {
        ok = false;
        firstBad = firstBad || form.querySelector('input[name="need"]');
      }

      if (firstBad && firstBad.focus) firstBad.focus();
      return ok;
    }

    function collect() {
      var need = form.querySelector('input[name="need"]:checked');
      return {
        fullName:     form.elements.fullName.value.trim(),
        businessName: form.elements.businessName.value.trim(),
        phone:        form.elements.phone.value.trim(),
        email:        form.elements.email.value.trim(),
        need:         need ? need.value : '',
        message:      form.elements.message.value.trim(),
        source:       'landing-page',
        pageUrl:      window.location.href,
        submittedAt:  new Date().toISOString()
      };
    }

    function asWhatsappText(d) {
      return [
        'פנייה חדשה מהאתר',
        '',
        'שם: ' + d.fullName,
        d.businessName ? 'עסק: ' + d.businessName : '',
        'טלפון: ' + d.phone,
        'אימייל: ' + d.email,
        '',
        'הצורך: ' + d.need,
        d.message ? '' : '',
        d.message ? 'מה מעסיק אותי: ' + d.message : ''
      ].filter(function (line, i, arr) {
        return !(line === '' && arr[i - 1] === '');
      }).join('\n');
    }

    /* שליחה ל-webhook.
       ניסיון ראשון: fetch רגיל (מחזיר סטטוס אמיתי אם ה-webhook מגדיר CORS).
       גיבוי: no-cors — עובד מול Make / n8n / Google Apps Script שלא מחזירים CORS. */
    function sendToWebhook(url, data) {
      var body = JSON.stringify(data);

      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body
      }).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return true;
      }).catch(function () {
        return fetch(url, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: body
        }).then(function () { return true; });
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      clearStatus();

      // מלכודת ספאם — בוט שמילא את השדה המוסתר
      if (form.elements.company_website && form.elements.company_website.value) return;

      if (!validate()) {
        showStatus('error', 'חסרים כמה פרטים — סימנתי אותם למעלה.');
        return;
      }

      var data = collect();

      // אין webhook מוגדר → מעבר לוואטסאפ עם כל הפרטים
      if (!CFG.webhookUrl) {
        window.open(buildWhatsappUrl(asWhatsappText(data)), '_blank', 'noopener');
        showStatus('ok', '<strong>נפתח וואטסאפ עם הפרטים שלכם.</strong><br>שלחו את ההודעה ואחזור אליכם בהקדם.');
        return;
      }

      submitBtn.classList.add('is-loading');
      submitBtn.disabled = true;
      var originalLabel = submitBtn.textContent;
      submitBtn.textContent = 'שולח…';

      sendToWebhook(CFG.webhookUrl, data)
        .then(function () {
          form.reset();
          showStatus('ok', '<strong>תודה, הפנייה התקבלה.</strong><br>אחזור אליכם באופן אישי בהקדם.');
        })
        .catch(function () {
          showStatus('error',
            'משהו השתבש בשליחה. ' +
            '<a href="' + buildWhatsappUrl(asWhatsappText(data)) + '" target="_blank" rel="noopener"><strong>שלחו לי בוואטסאפ</strong></a>' +
            ' או במייל ' + (CFG.email || '') + '.');
        })
        .finally(function () {
          submitBtn.classList.remove('is-loading');
          submitBtn.disabled = false;
          submitBtn.textContent = originalLabel;
        });
    });

    // ניקוי שגיאה תוך כדי הקלדה
    form.addEventListener('input', function (e) {
      var name = e.target.name;
      if (REQUIRED_TEXT.indexOf(name) > -1) setFieldError(name, false);
      if (name === 'need') setFieldError('need', false);
    });

  }

})();
