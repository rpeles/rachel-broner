/* ==========================================================================
   עצירת תנועה — הכפתור בפוטר, והזיכרון בין ביקורים.

   למה זה קיים: התקן דורש שלמי שנתקל בתנועה שמתחילה מעצמה ונמשכת מעל
   חמש שניות תהיה דרך לעצור אותה **בתוך הדף**. הגדרת מערכת ההפעלה
   (prefers-reduced-motion) מכובדת גם היא, אבל היא לא נחשבת מנגנון בדף.

   למה בראש הדף ולא בסופו: הקובץ נטען סינכרונית ב-<head> כדי שהמחלקה
   תיקבע לפני הציור הראשון. אם הוא היה רץ בסוף, מי שכבר ביקש לעצור היה
   רואה הבזק של אנימציה בכל טעינה.

   הבחירה נשמרת ב-localStorage בלבד — בדפדפן של הגולש, בלי עוגייה
   ובלי ששום דבר יוצא החוצה.
   ========================================================================== */

(function () {
  'use strict';

  var KEY  = 'rb-motion';
  var root = document.documentElement;

  /* גלישה פרטית או חסימת אחסון זורקת חריגה — ואז פשוט אין זיכרון,
     הכפתור ממשיך לעבוד לביקור הנוכחי. */
  function read() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function write(v) {
    try { localStorage.setItem(KEY, v); } catch (e) {}
  }

  if (read() === 'off') root.classList.add('no-motion');

  /* הכפתור מוסתר כברירת מחדל ב-CSS ונחשף רק כאן: בלי JS הוא לא היה
     עושה כלום, וכפתור מת גרוע מכפתור שלא קיים. */
  root.classList.add('has-motion-toggle');

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('motionToggle');
    if (!btn) return;

    /* התווית עצמה משתנה, בלי aria-pressed: לקהל לא טכנולוגי
       "הפעלת תנועה" ברור הרבה יותר מכפתור קבוע שמצבו נסתר. */
    function label() {
      btn.textContent = root.classList.contains('no-motion')
        ? 'הפעלת תנועה'
        : 'עצירת תנועה';
    }

    label();

    btn.addEventListener('click', function () {
      write(root.classList.toggle('no-motion') ? 'off' : 'on');
      label();
    });
  });
})();
