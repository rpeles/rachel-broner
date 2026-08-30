/* ==========================================================================
   analytics.js — סטטיסטיקות שימוש
   ללא תלויות חיצוניות. הקובץ עצמאי לחלוטין: אם הוא נחסם, נכשל או נמחק,
   שום דבר אחר באתר לא נשבר.

   מה נמדד כאן:
     • כמה שניות כל מבקר שהה מול כל סקשן  → "איפה הם התעניינו יותר"
     • עד לאן גללו                         → 25 / 50 / 75 / 100 אחוז
     • לחיצות על CTA וקישורים יוצאים
   (ספירת המבקרים, המקורות והמדינות מגיעה מ-Umami עצמו, בלי קוד)

   כלל ברזל: שום ערך שמבקר הקליד בטופס לא נכנס לכאן.
   ========================================================================== */

(function () {
  'use strict';

  /* בפיתוח מקומי Umami שותק (ראו data-domains ב-index.html). כאן מדפיסים
     לקונסולה במקום, כדי שאפשר יהיה לבדוק את החיווט בלי לזהם נתונים אמיתיים. */
  var DEBUG = location.protocol === 'file:' ||
              /^(localhost|127\.|192\.168\.|0\.0\.0\.0|$)/.test(location.hostname);

  /* ======================================================================
     העטיפה — נקודת הכניסה היחידה לשליחת אירוע

     window.umami נבדק בזמן הקריאה ולא בזמן הטעינה, כי הסקריפט של Umami
     הוא defer ולכן רץ אחרי הקובץ הזה. ה-try/catch הוא מה שמבטיח שחוסם
     פרסומות או תקלת רשת לא יפילו את הדף.
     ====================================================================== */
  function track(name, props) {
    if (DEBUG && window.console) console.log('[track]', name, props || '');
    try {
      var u = window.umami;
      if (u && typeof u.track === 'function') u.track(name, props);
    } catch (e) { /* נחסם, נכשל, לא נטען — בשתיקה */ }
  }

  window.track = track;

  /* ======================================================================
     זמן שהייה לפי סקשן

     תצפיתן נפרד לגמרי מזה של אנימציות ה-reveal ב-main.js: זה שם מדולג
     כשהמשתמש ביקש prefers-reduced-motion, ובנוסף מפסיק להאזין אחרי
     החשיפה הראשונה. שניהם פוסלים אותו למדידה מתמשכת.
     ====================================================================== */
  if (!('IntersectionObserver' in window)) return;

  var SECTIONS = ['top', 'about', 'work', 'solutions', 'testimonials', 'contact', 'news'];

  var secs   = {};             // id → שניות שנצברו
  var sent   = {};             // id → שניות שכבר נשלחו (מונע ספירה כפולה)
  var active = null;           // הסקשן שנקרא כרגע
  var depth  = 0;              // עומק גלילה מקסימלי באחוזים
  var lastAct = Date.now();    // הפעולה האחרונה של המשתמש
  var flushes = 0;

  /* rootMargin שלילי מכווץ את אזור הבדיקה לפס צר באמצע המסך, וסקשן נחשב
     "נקרא כרגע" רק כשהוא חוצה אותו. זה מה שפותר סקשנים שגבוהים מהמסך —
     עליהם threshold רגיל לעולם לא היה נורה — ומבטיח שתמיד בדיוק אחד פעיל. */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var id = entry.target.id;
      if (entry.isIntersecting) active = id;
      else if (active === id) active = null;
    });
  }, { threshold: 0, rootMargin: '-45% 0px -45% 0px' });

  SECTIONS.forEach(function (id) {
    var el = document.getElementById(id);
    if (el) io.observe(el);
  });

  /* פעימה של שנייה: מוסיפים שנייה לסקשן הפעיל. גלילה הלוך־ושוב לא דורשת
     טיפול מיוחד — המונים פשוט ממשיכים להצטבר לאותן מגירות. */
  setInterval(function () {
    var scrollable = document.documentElement.scrollHeight - window.innerHeight;
    var pct = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 100;
    if (pct >= 95)      depth = 100;
    else if (pct >= 75) depth = Math.max(depth, 75);
    else if (pct >= 50) depth = Math.max(depth, 50);
    else if (pct >= 25) depth = Math.max(depth, 25);

    if (document.hidden) return;                  // לשונית ברקע לא נספרת
    if (Date.now() - lastAct > 60000) return;     // קם והלך עם הלשונית פתוחה
    if (active) secs[active] = (secs[active] || 0) + 1;
  }, 1000);

  ['scroll', 'keydown', 'pointerdown'].forEach(function (ev) {
    window.addEventListener(ev, function () { lastAct = Date.now(); }, { passive: true });
  });

  /* ======================================================================
     שליחה — אירוע אחד מרוכז במקום אירוע לכל יציאה מסקשן

     נשלחים הפרשים בלבד (מה שנצבר מאז השליחה הקודמת), כי visibilitychange
     נורה בכל החלפת לשונית באמצע הקריאה. כך אין ספירה כפולה, ומי שמחליף
     לשוניות לא נקטע באמצע.
     ====================================================================== */
  function flush() {
    if (flushes >= 6) return;                     // הגנה מפני מקרה קיצון

    var payload = {}, total = 0, any = false;

    SECTIONS.forEach(function (id) {
      var delta = (secs[id] || 0) - (sent[id] || 0);
      if (delta > 0) {
        payload[id] = delta;                      // סקשנים בלי זמן מושמטים
        sent[id] = secs[id];
        any = true;
      }
      total += secs[id] || 0;
    });

    if (!any) return;

    payload.total = total;
    payload.depth = depth;
    flushes++;
    track('dwell', payload);
  }

  /* visibilitychange הוא הטריגר האמין בכל הפלטפורמות — הוא נורה בהחלפת
     לשונית, במזעור חלון, במעבר אפליקציה באייפון ולפני ניווט החוצה, ובאותו
     רגע הדף עדיין חי לגמרי ולכן שליחה רגילה עוברת.
     המאזין הזה נרשם לפני זה של Umami (הסקריפט שלו הוא defer ורץ אחרינו),
     ולכן האירוע נכנס לתור שלו בדיוק לפני שהוא מרוקן אותו. */
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('pagehide', flush);

  /* ======================================================================
     לחיצות

     מאזין אחד מוענק על document, ולא מאזינים בודדים על כל קישור: מסלול
     השגיאה של הטופס מזריק קישורי mailto:/tel: ל-DOM בזמן ריצה, וגם ה-href
     של הוואטסאפ נכתב בזמן ריצה — מאזין שנקשר בטעינה היה מפספס את שניהם.
     ====================================================================== */
  function zone(el) {
    if (el.closest('#nav'))            return 'nav';
    if (el.closest('#mobileMenu'))     return 'menu';
    if (el.closest('#stickyCta'))      return 'sticky';
    if (el.closest('.newsletter-bar')) return 'news';
    if (el.closest('.footer'))         return 'footer';
    var section = el.closest('section[id]');
    return section ? section.id : 'other';
  }

  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;

    var href = a.getAttribute('href') || '';
    var to;

    if (href.indexOf('tel:') === 0)                        to = 'phone';
    else if (href.indexOf('mailto:') === 0)                to = 'mail';
    else if (href.indexOf('wa.me') > -1)                   to = 'whatsapp';
    else if (href.indexOf('news.rachelbroner.co.il') > -1) to = 'newsletter';
    else if (href === '#contact')                          to = 'contact';
    else if (href === '#work')                             to = 'work';
    else return;                                           // שאר הקישורים לא מעניינים

    track('cta', { to: to, from: zone(a) });
  });

})();
