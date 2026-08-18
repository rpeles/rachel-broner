# רחל ברונר — דף נחיתה | בניית מערכות ניהול לעסקים

דף נחיתה סטטי. **בלי npm, בלי build, בלי תלויות.**
פותחים את `index.html` בדפדפן וזהו.

---

## מבנה הפרויקט

```
index.html              ← כל התוכן. כל סקשן מסומן בהערה.
css/
  tokens.css            ← צבעים, פונטים, מרווחים — כל שינוי גלובלי מתחיל כאן
  base.css              ← reset, טיפוגרפיה, אנימציות
  components.css        ← ניווט, כפתורים, כרטיסים, טופס, פוטר
  sections.css          ← פריסה ייחודית לכל סקשן
js/
  config.js             ← ⚙️ webhook + פרטי קשר — הקובץ היחיד שחייבים לערוך
  main.js               ← ניווט, אנימציות, לוגיקת טופס
assets/
  logo-broner.png          ← קובץ המקור. לא מוצג באתר — כל השאר נחתכו ממנו
  logo-name.png            ← שורת השם בלבד → ניווט
  logo-wordmark-light.png  ← הלוגו המלא בלבן → פוטר כהה
  favicon.png              ← גלגל השיניים מהלוגו → אייקון הטאב
  og-image.png             ← 1200×630, תמונת שיתוף לרשתות
  projects/             ← צילומי מסך לפרויקטים (ראו README שם)
DECISIONS.md            ← החלטות עיצוב ותוכן שהתקבלו
```

---

## 3 דברים לעשות לפני העלייה לאוויר

### 1. לחבר את הטופס

פותחים את `js/config.js` ומדביקים את כתובת ה-Webhook:

```js
webhookUrl: "https://hook.eu2.make.com/xxxxxxxxx",
```

**עד שזה ריק — הטופס פותח וואטסאפ** עם כל פרטי הפנייה מסודרים,
כך שאף ליד לא הולך לאיבוד. אפשר לעלות לאוויר גם ככה.

<details>
<summary>אופציה חינמית לגמרי — Google Apps Script</summary>

1. Google Sheets חדש → כותרות בשורה 1:
   `submittedAt | fullName | businessName | phone | email | need | message`
2. `Extensions` → `Apps Script` → הדביקו:

```js
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var d = JSON.parse(e.postData.contents);
  sheet.appendRow([
    d.submittedAt, d.fullName, d.businessName,
    d.phone, d.email, d.need, d.message
  ]);
  return ContentService.createTextOutput('ok');
}
```

3. `Deploy` → `New deployment` → סוג **Web app** →
   `Execute as: Me`, `Who has access: Anyone`
4. מעתיקים את ה-URL ל-`webhookUrl`.

</details>

### 2. להחליף את ה-placeholders

חפשו בקובץ `index.html` את הסימן `⚠️` — שם נמצא כל התוכן הזמני:

- [ ] **פרויקטים** — צילומי מסך + טקסט (ראו `assets/projects/README.md`)
- [ ] **המלצה** — המלצה אמיתית אחת. אין להמציא.
- [ ] **תמונת פורטרט** — `assets/rachel.jpg`
- [ ] **canonical URL** — בתגית `<link rel="canonical">` בראש הקובץ
- [ ] **OG image** — `assets/og-image.png` בגודל 1200×630

### 3. להעלות לאוויר

| שירות | איך |
|---|---|
| **Netlify Drop** | גוררים את התיקייה ל-[app.netlify.com/drop](https://app.netlify.com/drop). הכי מהיר. |
| **Cloudflare Pages** | חינם, מהיר בישראל, תומך בדומיין מותאם |
| **GitHub Pages** | דוחפים לריפו → Settings → Pages |

כולם חינמיים ותומכים בדומיין משלכם.

---

## איך עורכים תוכן

כל הטקסטים נמצאים ב-`index.html`, מסודרים לפי סקשנים עם הערות:

```html
<!-- ====== שלושת המסלולים (§11) ====== -->
```

**לשנות צבע?** רק `css/tokens.css`:

```css
--c-accent: #D42127;   /* האדום מהלוגו */
--c-ink:    #0D0D0D;
```

**להוסיף פרויקט?** משכפלים בלוק `<article class="card project">` בסקשן `#work`.

**סדר הסקשנים:**
```
בית (Hero) · קצת עלי · פתרונות (3 מסלולים) · פרויקטים (3) · צור קשר · פוטר
```

---

## מה כבר מטופל

- ✅ Mobile First + responsive מלא
- ✅ RTL תקין
- ✅ HTML סמנטי, `alt` לתמונות, labels לטופס, ניווט מקלדת, skip link
- ✅ `prefers-reduced-motion` — אנימציות נכבות למי שביקש
- ✅ SEO: title, description, canonical, Open Graph, JSON-LD
- ✅ ולידציה בטופס + מלכודת ספאם
- ✅ אפס תלויות חיצוניות (רק פונט Heebo מ-Google Fonts)
