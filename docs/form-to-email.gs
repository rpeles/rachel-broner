/* ==========================================================================
   קבלת פניות מהטופס ושליחתן במייל — Google Apps Script

   למה זה: הדף הוא סטטי (GitHub Pages) ואין לו שרת שיכול לשלוח מייל.
   הסקריפט הזה הוא השרת הקטן שעושה את זה, הוא רץ בחשבון הגוגל שלך,
   הוא חינמי, ואף שירות חיצוני לא רואה את הפניות של הלקוחות.

   --------------------------------------------------------------------------
   התקנה — פעם אחת, בערך חמש דקות:

   1. להיכנס ל-https://script.google.com ולבחור "פרויקט חדש".
   2. למחוק את מה שכתוב בעורך ולהדביק את כל הקובץ הזה במקומו.
   3. לוודא שהכתובות ב-TO למטה הן אלה שאליהן רוצים לקבל את הפניות.
   4. למעלה מימין: "פריסה" ← "פריסה חדשה".
   5. ליד "בחירת סוג" ללחוץ על גלגל השיניים ולבחור "אפליקציית אינטרנט".
   6. להגדיר:
        הפעלה בתור:     אני (הכתובת שלך)
        למי יש גישה:     כל אחד            ← חשוב! אחרת הטופס יקבל שגיאה
   7. ללחוץ "פריסה". בפעם הראשונה גוגל תבקש הרשאה לשלוח מייל בשמך —
      צריך לאשר. אם מופיע מסך "Google hasn't verified this app",
      ללחוץ על "מתקדם" ואז על "מעבר אל..." (זה הסקריפט שלך, זה בסדר).
   8. להעתיק את הכתובת שמתקבלת בסוף (מתחילה ב-https://script.google.com/macros/s/...)
      ולהדביק אותה ב-js/config.js בשדה webhookUrl.

   אחרי שינוי בקוד צריך לפרוס מחדש: "פריסה" ← "ניהול פריסות" ←
   העיפרון ← "גרסה: חדשה" ← "פריסה". הכתובת נשארת אותה כתובת.

   --------------------------------------------------------------------------
   כשההפעלות מסתיימות בהצלחה אבל מייל לא מגיע:

   הסיבה השכיחה היא סינון ספאם. הפנייה נשלחת משרתי גוגל אל תיבה
   שמנוהלת בספק אחר (myinbox), והספק הזה עלול לסווג אותה כספאם.

   1. לבדוק בתיקיית הספאם / דואר זבל בתיבה של הדומיין, ואם ההודעה שם
      לסמן "לא ספאם" ולהוסיף את כתובת השולח לאנשי הקשר.
   2. הסקריפט שולח גם עותק לתיבת הגוגל שמריצה אותו (ראו
      ALSO_COPY_TO_SELF למטה) — שם ההודעה כמעט תמיד עוברת.
   3. לאבחון: לפתוח בדפדפן את כתובת הפריסה עם ?check=1 בסוף.
      מוחזר לאן נשלח, מי מריץ, וכמה מיילים נשארו במכסה היומית.
      מכסה 0 פירושה שנגמרה המכסה להיום (100 נמענים ביום בחשבון רגיל).
   ========================================================================== */

/* הכתובות שאליהן יגיעו הפניות מהטופס. שתיהן, בכוונה:

   1. הכתובת העסקית בדומיין — זו שמוצגת באתר וזו שנקראת ביום-יום.
   2. כתובת הג'ימייל — רשת ביטחון. הסקריפט רץ בשרתי גוגל, ומייל מגוגל
      לגוגל כמעט אף פעם לא נתפס כספאם, בניגוד לתיבה בדומיין שמנוהלת
      בספק אחר (myinbox). אם פנייה תיעלם שם, יש עותק כאן.

   כל פנייה צורכת נמען אחד מהמכסה היומית עבור כל כתובת ברשימה
   (100 נמענים ביום בחשבון רגיל), כלומר כ-50 פניות ביום. */
const TO = [
  'rachel@rachelbroner.co.il',
  '0533597303r@gmail.com'
];

/* עותק לתיבת הגוגל שמריצה את הסקריפט. היום זו ממילא אחת הכתובות
   שב-TO, ולכן הדגל הזה לא מוסיף נמען — הוא נשאר למקרה שהרשימה
   למעלה תשתנה ותכלול רק כתובות חיצוניות. */
const ALSO_COPY_TO_SELF = true;

/* שם השולח כפי שיופיע בתיבה */
const FROM_NAME = 'טופס האתר';


function recipients() {
  /* slice כדי לעבוד על עותק — בלי זה כל הרצה הייתה מוסיפה נמענים
     לרשימה המקורית עצמה */
  const list = TO.slice();
  if (ALSO_COPY_TO_SELF) {
    const self = Session.getEffectiveUser().getEmail();
    if (self && list.indexOf(self) === -1) list.push(self);
  }
  /* סינון כפילויות וכתובות ריקות — כתובת שמופיעה פעמיים גורמת
     לגוגל לשלוח שני עותקים ולחייב פעמיים במכסה */
  return list
    .map(function (a) { return String(a).trim(); })
    .filter(function (a, i, arr) { return a && arr.indexOf(a) === i; })
    .join(',');
}


function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);

    /* מלכודת ספאם — הדף חוסם אותה גם בצד הלקוח, וזו שכבה שנייה
       למקרה שבוט שולח ישירות לכאן ועוקף את הדף. */
    if (d.company_website) return reply(true);

    const lines = [
      'פנייה חדשה מהאתר',
      '',
      'שם:      ' + (d.fullName || '—'),
      'עסק:     ' + (d.businessName || '—'),
      'טלפון:   ' + (d.phone || '—'),
      'אימייל:  ' + (d.email || '—'),
      '',
      'הצורך:   ' + (d.need || '—')
    ];

    if (d.message) lines.push('', 'מה מעסיק אותם:', d.message);

    lines.push(
      '',
      '——————————————',
      'נשלח מ: ' + (d.pageUrl || ''),
      'זמן:    ' + formatTime(d.submittedAt)
    );

    const opts = {
      to:      recipients(),
      subject: 'פנייה מהאתר — ' + (d.fullName || 'ללא שם'),
      body:    lines.join('\n'),
      name:    FROM_NAME
    };

    /* כך אפשר ללחוץ "השב" במייל והתשובה הולכת ישר ללקוח.
       כתובות בדומיינים שמורים כמו example.com מדלגות על זה — הן
       מעלות את הסיכוי שמסנני ספאם יתפסו את ההודעה. */
    if (isRealEmail(d.email)) opts.replyTo = d.email;

    MailApp.sendEmail(opts);

    return reply(true);

  } catch (err) {
    /* הפנייה לא תלך לאיבוד בשקט: נשלח לעצמנו את השגיאה עם הגוף הגולמי */
    try {
      MailApp.sendEmail({
        to: recipients(),
        subject: 'שגיאה בטופס האתר',
        body: 'השגיאה:\n' + err + '\n\nמה שהתקבל:\n' + (e && e.postData ? e.postData.contents : '(ריק)'),
        name: FROM_NAME
      });
    } catch (ignored) {}
    return reply(false);
  }
}


/* פתיחת הכתובת בדפדפן — בדיקה מהירה שהפריסה עלתה.
   הוספת ?check=1 לסוף הכתובת מחזירה אבחון: לאן נשלח, מי מריץ,
   וכמה מיילים נשארו במכסה היומית. שימושי כשמייל לא מגיע. */
function doGet(e) {
  const wantsCheck = e && e.parameter && e.parameter.check;
  if (!wantsCheck) {
    return ContentService
      .createTextOutput('הטופס מחובר ופעיל.')
      .setMimeType(ContentService.MimeType.TEXT);
  }
  return ContentService
    .createTextOutput(JSON.stringify({
      ok:             true,
      sendsTo:        recipients(),
      runsAs:         Session.getEffectiveUser().getEmail(),
      remainingQuota: MailApp.getRemainingDailyQuota(),
      scriptTime:     Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'dd/MM/yyyy HH:mm')
    }))
    .setMimeType(ContentService.MimeType.JSON);
}


/* בדיקה ידנית מתוך העורך: מריצים את הפונקציה ובודקים שהמייל הגיע */
function testSend() {
  doPost({ postData: { contents: JSON.stringify({
    fullName: 'בדיקה', businessName: 'עסק לדוגמה',
    phone: '050-0000000', email: 'test@example.com',
    need: 'אני רוצה לבנות מערכת לעסק',
    message: 'זו הודעת בדיקה מהסקריפט.',
    pageUrl: 'https://rachelbroner.co.il/',
    submittedAt: new Date().toISOString()
  })}});
}


function reply(ok) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: ok }))
    .setMimeType(ContentService.MimeType.JSON);
}

function isRealEmail(v) {
  if (typeof v !== 'string') return false;
  const s = v.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) return false;
  /* דומיינים שמורים לדוגמאות — לא כתובות אמיתיות */
  return !/@(example\.(com|org|net)|test|localhost)$/i.test(s);
}

function formatTime(iso) {
  if (!iso) return '';
  try {
    return Utilities.formatDate(new Date(iso), 'Asia/Jerusalem', 'dd/MM/yyyy HH:mm');
  } catch (e) {
    return iso;
  }
}
