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

  /* שליחת אירוע לסטטיסטיקות. הכינוי המקומי מבטיח שהכול ממשיך לעבוד גם אם
     analytics.js נחסם על ידי חוסם פרסומות, נכשל בטעינה או נמחק. */
  var track = window.track || function () {};

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

  /* אזורים שבהם ה-CTA הדביק מסתתר: הטופס — כי הוא כבר מוביל לשם —
     ורצועת הניוזלטר, שיש בה כפתור אדום משלה ושניהם היו מתנגשים על המסך. */
  var ctaFreeZones = $$('#contact, .newsletter-bar');

  function updateStickyCta() {
    if (!stickyCta) return;
    var pastHero = hero ? window.scrollY > (hero.offsetHeight * 0.7) : window.scrollY > 400;
    var inFreeZone = ctaFreeZones.some(function (el) {
      var r = el.getBoundingClientRect();
      return r.top < window.innerHeight && r.bottom > 0;
    });
    stickyCta.classList.toggle('is-visible', pastHero && !inFreeZone);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', updateStickyCta);
  onScroll();

  /* ======================================================================
     מסע העבודה — הסמן נוסע במסלול מתפתל בין תחנות של גלגלי שיניים.

     שני דברים חייבים להיות מדויקים כדי שהתחנה תיצבע בדיוק כשהסמן מגיע:
     1. התחנות והסמן נמדדים על אותו סרגל — אורך המסלול בפועל.
     2. תנועת הסמן לינארית. עם האטה, מיקומו לא פרופורציונלי לזמן,
        והצביעה הייתה מתרחשת אחרי שהוא כבר עבר.
     ====================================================================== */
  (function buildFlow() {
    var stage = $('#flowStage');
    var path  = $('#flowPath');
    if (!stage || !path || !path.getTotalLength) return;

    var STAGES = ['אפיון', 'תכנון', 'בנייה', 'בדיקות', 'תיקונים', 'הטמעה', 'ליווי'];
    var N   = STAGES.length;
    var DUR = 11;      // אורך הלולאה בשניות
    var T0  = 5;       // אחוז שבו הסמן יוצא לדרך
    var T1  = 70;      // אחוז שבו הוא נוחת על המטרה
    var SPAN = 0.88;   // התחנות תופסות 88% מהמסלול; השאר מוביל לסיום

    var VB_W = 360, VB_H = 520;
    var len = path.getTotalLength();
    var css = '';

    // צורת גלגל השיניים של התחנה — 9 שיניים, טבעת חלולה עם טבור
    var GEAR = 'M38.73,21.19L42.91,22.15A19,19 0 0 1 42.91,25.85L38.73,26.81A15,15 0 0 1 37.09,31.32L39.68,34.73A19,19 0 0 1 37.29,37.57L33.48,35.62A15,15 0 0 1 29.33,38.02L29.11,42.30A19,19 0 0 1 25.46,42.94L23.79,39.00A15,15 0 0 1 19.07,38.17L16.15,41.30A19,19 0 0 1 12.94,39.45L14.20,35.35A15,15 0 0 1 11.12,31.68L6.87,32.21A19,19 0 0 1 5.60,28.73L9.19,26.40A15,15 0 0 1 9.19,21.60L5.60,19.27A19,19 0 0 1 6.87,15.79L11.12,16.32A15,15 0 0 1 14.20,12.65L12.94,8.55A19,19 0 0 1 16.15,6.70L19.07,9.83A15,15 0 0 1 23.79,9.00L25.46,5.06A19,19 0 0 1 29.11,5.70L29.33,9.98A15,15 0 0 1 33.48,12.38L37.29,10.43A19,19 0 0 1 39.68,13.27L37.09,16.68A15,15 0 0 1 38.73,21.19Z';

    STAGES.forEach(function (name, i) {
      var frac = i / (N - 1) * SPAN;              // מיקום התחנה על המסלול
      var at   = T0 + (T1 - T0) * frac;           // הרגע שבו הסמן נמצא שם
      var pt   = path.getPointAtLength(len * frac);

      var el = document.createElement('div');
      el.className = 'flow__st ' + (pt.x > VB_W / 2 ? 'flow__st--left' : 'flow__st--right');
      el.style.left = (pt.x / VB_W * 100) + '%';
      el.style.top  = (pt.y / VB_H * 100) + '%';
      el.innerHTML =
        '<svg class="flow__gear" viewBox="0 0 48 48" aria-hidden="true">' +
        '<path class="ring" d="' + GEAR + '"/><circle class="hub" cx="24" cy="24" r="4.5"/></svg>' +
        '<span class="flow__lbl">' + name + '</span>';
      stage.appendChild(el);

      // מספר הסיבובים מעוגל לשלם, אחרת סוף הלולאה קופץ ביחס להתחלה
      var turns = Math.max(1, Math.round(DUR * (100 - at) / 100 / 3.2));
      var pre   = (at - 0.4).toFixed(2);

      css += '@keyframes flow-spin-' + i + '{0%,' + at.toFixed(2) + '%{transform:rotate(0deg)}' +
             '100%{transform:rotate(' + (turns * 360) + 'deg)}}';
      css += '@keyframes flow-ring-' + i + '{0%,' + pre + '%{stroke:rgba(255,255,255,.22);fill:rgba(255,255,255,.03)}' +
             at.toFixed(2) + '%{stroke:#FF6E73;fill:rgba(224,38,45,.30)}' +
             (at + 3).toFixed(2) + '%,100%{stroke:#E0262D;fill:rgba(224,38,45,.20)}}';
      css += '@keyframes flow-hub-' + i + '{0%,' + pre + '%{fill:rgba(255,255,255,.22)}' +
             at.toFixed(2) + '%,100%{fill:#FF6E73}}';
      css += '@keyframes flow-lbl-' + i + '{0%,' + pre + '%{color:#8E909B}' +
             at.toFixed(2) + '%,100%{color:#F4F5F7}}';

      var ease = 'cubic-bezier(.22,.61,.36,1)';
      el.querySelector('.flow__gear').style.animation = 'flow-spin-' + i + ' ' + DUR + 's linear infinite';
      el.querySelector('.ring').style.animation       = 'flow-ring-' + i + ' ' + DUR + 's ' + ease + ' infinite';
      el.querySelector('.hub').style.animation        = 'flow-hub-'  + i + ' ' + DUR + 's ' + ease + ' infinite';
      el.querySelector('.flow__lbl').style.animation  = 'flow-lbl-'  + i + ' ' + DUR + 's ' + ease + ' infinite';
    });

    // המסלול נצבע ולינארית, בדיוק בקצב הסמן
    path.style.strokeDasharray  = len;
    path.style.strokeDashoffset = len;
    css += '.flow__prog{animation:flow-draw ' + DUR + 's linear infinite}';
    css += '@keyframes flow-draw{0%,' + T0 + '%{stroke-dashoffset:' + len + '}' +
           T1 + '%,100%{stroke-dashoffset:0}}';

    var d = path.getAttribute('d');
    css += '.flow__cursor{offset-path:path("' + d + '");offset-rotate:0deg;offset-anchor:87.5% 4.8%;' +
           'animation:flow-move ' + DUR + 's linear infinite}';
    css += '@keyframes flow-move{0%{offset-distance:0%;opacity:0}3%{opacity:1}' +
           T0 + '%{offset-distance:0%}' + T1 + '%,95%{offset-distance:100%;opacity:1}' +
           '100%{offset-distance:100%;opacity:0}}';

    css += '.flow__fin{animation:flow-fin ' + DUR + 's cubic-bezier(.22,.61,.36,1) infinite}';
    css += '@keyframes flow-fin{0%,72%{opacity:0;transform:scale(.7)}84%{opacity:1;transform:scale(1.06)}' +
           '90%,100%{opacity:1;transform:scale(1)}}';
    css += '.flow__pulse{animation:flow-pulse ' + DUR + 's cubic-bezier(.22,.61,.36,1) infinite}';
    css += '@keyframes flow-pulse{0%,74%{opacity:0;transform:scale(.8)}80%{opacity:.85;transform:scale(1)}' +
           '92%,100%{opacity:0;transform:scale(1.5)}}';
    css += '.flow__mark svg{animation:flow-turn ' + DUR + 's linear infinite}';
    css += '@keyframes flow-turn{0%,72%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}';

    if (reduceMotion) return;   // בלי תנועה — ה-CSS הסטטי כבר מציג את התמונה הסופית
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  })();

  /* ======================================================================
     Lightbox — הגדלת צילומי מסך של פרויקטים
     ====================================================================== */
  var lightbox      = $('#lightbox');
  var lightboxImg   = $('#lightboxImg');
  var lightboxFrame = $('#lightboxFrame');
  var lightboxCap   = $('#lightboxCaption');
  var lightboxX     = $('#lightboxClose');
  var lastFocused   = null;
  var demoId        = null;   // איזה דמו פתוח כרגע, לצורך מדידת זמן הצפייה
  var demoAt        = 0;

  function openLightbox(trigger) {
    if (!lightbox) return;
    lastFocused = trigger;

    var demo = trigger.getAttribute('data-demo');
    if (demo) {
      lightbox.setAttribute('data-kind', 'demo');
      lightboxFrame.src = demo;
      demoId = demo.replace(/^demos\//, '').replace(/\.html$/, '');
      demoAt = Date.now();
      track('demo', { id: demoId });
    } else {
      lightbox.setAttribute('data-kind', 'image');
      lightboxImg.src = trigger.getAttribute('data-zoom');
      lightboxImg.alt = trigger.querySelector('img') ? trigger.querySelector('img').alt : '';
    }

    lightboxCap.textContent = trigger.getAttribute('data-caption') || '';
    lightbox.classList.add('is-open');
    document.body.classList.add('is-locked');
    // אלמנט שזה עתה יצא מ-visibility:hidden אינו בר-מיקוד עד שמחושבת לו פריסה.
    // קריאת offsetHeight מאלצת reflow סינכרוני; ה-timeout הוא רשת ביטחון.
    void lightbox.offsetHeight;
    lightboxX.focus();
    if (document.activeElement !== lightboxX) {
      setTimeout(function () { lightboxX.focus(); }, 50);
    }
  }

  function closeLightbox() {
    if (!lightbox || !lightbox.classList.contains('is-open')) return;
    lightbox.classList.remove('is-open');
    document.body.classList.remove('is-locked');

    if (demoId) {
      track('demo_end', { id: demoId, sec: Math.round((Date.now() - demoAt) / 1000) });
      demoId = null;
    }

    if (lastFocused && lastFocused.focus) lastFocused.focus();
    // משחררים את המדיה רק אחרי אנימציית היציאה.
    // איפוס ה-iframe חשוב במיוחד — אחרת הדמו ממשיך לרוץ ברקע.
    setTimeout(function () {
      if (lightbox.classList.contains('is-open')) return;
      lightboxImg.src = '';
      lightboxFrame.src = '';
      lightbox.removeAttribute('data-kind');
    }, 300);
  }

  $$('[data-zoom], [data-demo]').forEach(function (btn) {
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

    /* השדה "אז מה כן?" מוצג רק כשנבחרה האפשרות "אחר" */
    var needOtherField = $('#needOtherField');
    var needOtherInput = $('#needOther');

    function isOtherSelected() {
      var picked = form.querySelector('input[name="need"]:checked');
      return !!picked && picked.value === 'אחר';
    }

    function syncNeedOther(focusIt) {
      if (!needOtherField) return;
      var show = isOtherSelected();
      needOtherField.hidden = !show;
      if (!show) {
        needOtherInput.value = '';
        setFieldError('needOther', false);
      } else if (focusIt) {
        needOtherInput.focus();
      }
    }

    form.addEventListener('change', function (e) {
      if (e.target.name === 'need') syncNeedOther(true);
    });
    syncNeedOther(false);   // המצב ההתחלתי, גם אחרי רענון שמשחזר בחירה

    /* focusin ולא input — כדי לספור גם מי שנגע בטופס ונטש בלי להקליד כלום */
    var formStarted = false;
    form.addEventListener('focusin', function () {
      if (formStarted) return;
      formStarted = true;
      track('form_start');
    });

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

      // "אחר" בלי הסבר לא אומר לי כלום — לכן הפירוט נדרש
      var otherBad = isOtherSelected() && !needOtherInput.value.trim();
      setFieldError('needOther', otherBad);
      if (otherBad) {
        ok = false;
        firstBad = firstBad || needOtherInput;
      }

      if (firstBad && firstBad.focus) firstBad.focus();
      return ok;
    }

    function collect() {
      var need = form.querySelector('input[name="need"]:checked');
      var needValue = need ? need.value : '';
      var needOther = needOtherInput ? needOtherInput.value.trim() : '';
      // כשנבחר "אחר", הפירוט מצורף לערך עצמו כדי שהפנייה תהיה מובנת בלי הצלבה
      if (needValue === 'אחר' && needOther) needValue = 'אחר: ' + needOther;

      return {
        fullName:     form.elements.fullName.value.trim(),
        businessName: form.elements.businessName.value.trim(),
        phone:        form.elements.phone.value.trim(),
        email:        form.elements.email.value.trim(),
        need:         needValue,
        needOther:    needOther,
        message:      form.elements.message.value.trim(),
        source:       'landing-page',
        pageUrl:      window.location.href,
        submittedAt:  new Date().toISOString()
      };
    }

    function asPlainText(d) {
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

    /* גיבוי אם השליחה נכשלה: קישור מייל מוכן עם כל הפרטים,
       כדי שפנייה לא תלך לאיבוד גם כשהשרת לא זמין. */
    function buildMailtoUrl(d) {
      return 'mailto:' + (CFG.email || '') +
             '?subject=' + encodeURIComponent('פנייה מהאתר — ' + d.fullName) +
             '&body=' + encodeURIComponent(asPlainText(d));
    }

    function fallbackHtml(d) {
      return '<a href="' + buildMailtoUrl(d) + '"><strong>שליחה במייל</strong></a>' +
             (CFG.phone ? ' או בטלפון <a href="tel:' + CFG.phone + '" dir="ltr">' + CFG.phone + '</a>' : '') + '.';
    }

    /* שליחה לשרת שמעביר את הפנייה למייל.
       ניסיון ראשון: fetch רגיל (מחזיר סטטוס אמיתי אם השרת מגדיר CORS).
       גיבוי: no-cors — עובד מול Make / n8n / Google Apps Script שלא מחזירים CORS.
       ב-no-cors התשובה אטומה, ולכן אי אפשר לדעת אם השרת קיבל — זה המחיר
       של שליחה מדף סטטי בלי שרת משלנו. */
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
        // אילו שדות נכשלו — נקרא ישירות מהסימון ש-setFieldError כבר עשה ב-DOM
        track('form_error', {
          f: $$('[data-error-for]', form)
               .filter(function (el) { return el.style.display === 'block'; })
               .map(function (el) { return el.getAttribute('data-error-for'); })
               .join(',')
        });
        return;
      }

      var data = collect();

      /* קוראים את בחירת הרדיו הגולמית ולא את data.need: ל-data.need כבר מוזג
         הטקסט החופשי של "אחר", וטקסט שהמבקרת הקלידה לא נשלח לסטטיסטיקות.
         חייב להיקרא כאן — form.reset() בהמשך מנקה את הבחירה. */
      var needPicked = form.querySelector('input[name="need"]:checked');
      var needBase   = needPicked ? needPicked.value : '';

      // אין כתובת שליחה מוגדרת → לא מעמידים פנים שנשלח, ומציעים דרך חלופית
      if (!CFG.webhookUrl) {
        showStatus('error',
          '<strong>הטופס עדיין לא מחובר.</strong><br>' +
          'בינתיים אפשר ליצור קשר ישירות: ' + fallbackHtml(data));
        return;
      }

      submitBtn.classList.add('is-loading');
      submitBtn.disabled = true;
      var originalLabel = submitBtn.textContent;
      submitBtn.textContent = 'שולח…';

      sendToWebhook(CFG.webhookUrl, data)
        .then(function () {
          form.reset();
          syncNeedOther(false);   // reset מנקה את הבחירה, אבל לא מסתיר את השדה
          showStatus('ok', '<strong>תודה, הפנייה התקבלה.</strong><br>אחזור אליכם באופן אישי בהקדם.');
          track('form_sent', { need: needBase });
        })
        .catch(function () {
          showStatus('error',
            'משהו השתבש בשליחה. אפשר ' + fallbackHtml(data));
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
      if (name === 'needOther') setFieldError('needOther', false);
    });

  }

})();
