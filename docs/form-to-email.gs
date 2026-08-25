/* ==========================================================================
   קבלת פניות מהטופס ושליחתן במייל — Google Apps Script

   למה זה: הדף הוא סטטי (GitHub Pages) ואין לו שרת שיכול לשלוח מייל.
   הסקריפט הזה הוא השרת הקטן שעושה את זה, הוא רץ בחשבון הגוגל שלך,
   הוא חינמי, ואף שירות חיצוני לא רואה את הפניות של הלקוחות.

   --------------------------------------------------------------------------
   התקנה — פעם אחת, בערך חמש דקות:

   1. להיכנס ל-https://script.google.com ולבחור "פרויקט חדש".
   2. למחוק את מה שכתוב בעורך ולהדביק את כל הקובץ הזה במקומו.
   3. לוודא שהכתובת ב-TO למטה היא הכתובת שאליה רוצים לקבל את הפניות.
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
   ========================================================================== */

/* הכתובת שאליה יגיעו הפניות */
const TO = 'rachel@rachelbroner.co.il';

/* שם השולח כפי שיופיע בתיבה */
const FROM_NAME = 'טופס האתר';


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

    MailApp.sendEmail({
      to:      TO,
      subject: 'פנייה מהאתר — ' + (d.fullName || 'ללא שם'),
      body:    lines.join('\n'),
      name:    FROM_NAME,
      /* כך אפשר ללחוץ "השב" במייל והתשובה הולכת ישר ללקוח */
      replyTo: isEmail(d.email) ? d.email : TO
    });

    return reply(true);

  } catch (err) {
    /* הפנייה לא תלך לאיבוד בשקט: נשלח לעצמנו את השגיאה עם הגוף הגולמי */
    try {
      MailApp.sendEmail({
        to: TO,
        subject: 'שגיאה בטופס האתר',
        body: 'השגיאה:\n' + err + '\n\nמה שהתקבל:\n' + (e && e.postData ? e.postData.contents : '(ריק)'),
        name: FROM_NAME
      });
    } catch (ignored) {}
    return reply(false);
  }
}


/* פתיחת הכתובת בדפדפן — בדיקה מהירה שהפריסה עלתה */
function doGet() {
  return ContentService
    .createTextOutput('הטופס מחובר ופעיל.')
    .setMimeType(ContentService.MimeType.TEXT);
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

function isEmail(v) {
  return typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}

function formatTime(iso) {
  if (!iso) return '';
  try {
    return Utilities.formatDate(new Date(iso), 'Asia/Jerusalem', 'dd/MM/yyyy HH:mm');
  } catch (e) {
    return iso;
  }
}
