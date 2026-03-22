# Tauri Icons / אייקוני Tauri

תיקייה זו מכילה את האייקונים של האפליקציה בפורמטים שונים.

## מצב נוכחי ✅

האייקונים נוצרו אוטומטית באמצעות Tauri CLI ותקינים לחלוטין לבנייה.

## קבצים קיימים

### נדרש עבור Tauri:
- ✅ `icon.ico` (7,627 bytes) - Windows icon
- ✅ `icon.icns` (53,104 bytes) - macOS icon  
- ✅ `32x32.png` (981 bytes) - Small icon
- ✅ `128x128.png` (2,409 bytes) - Medium icon
- ✅ `128x128@2x.png` (1,234 bytes) - High-DPI icon
- ✅ `icon.png` (2,409 bytes) - Default icon

### נוסף עבור Windows Store:
- ✅ `StoreLogo.png`
- ✅ `Square30x30Logo.png` - `Square310x310Logo.png`

## יצירת אייקונים מחדש

### אוטומטי (מומלץ):
```bash
node scripts/generate-tauri-icons.js
```

הסקריפט:
1. יוצר אייקון PNG בסיס (256x256) עם עיצוב פשוט
2. משתמש ב-Tauri CLI ליצירת כל הפורמטים
3. מאמת שכל הקבצים נוצרו

### ידני (עם אייקון מותאם אישית):

אם יש לך אייקון משלך:

```bash
# צור אייקון PNG באיכות גבוהה (512x512 מומלץ)
# ואז הרץ:
npx tauri icon path/to/your-icon.png
```

או דרך cmd (אם יש בעיות עם PowerShell):
```cmd
cmd /c "npx tauri icon path/to/your-icon.png"
```

## דרישות לאייקון מותאם אישית

- **פורמט**: PNG עם רקע שקוף (RGBA)
- **גודל מינימלי**: 512x512 פיקסלים
- **גודל מומלץ**: 1024x1024 פיקסלים
- **צורה**: מרובעת (יחס 1:1)
- **תוכן**: פשוט וברור, נראה טוב בגדלים קטנים

## כלים מקוונים

אם אין לך Tauri CLI או Node.js:
- **ICO**: https://www.icoconverter.com/
- **ICNS**: https://cloudconvert.com/png-to-icns
- **Resize**: https://www.iloveimg.com/resize-image

## הערות

- האייקונים הנוכחיים נוצרו אוטומטית ופונקציונליים
- הם מכילים עיצוב פשוט (גרדיאנט כחול עם צורה לבנה)
- לפני שחרור לייצור, מומלץ להחליף באייקון ממותג
- כל האייקונים מועברים למאגר Git כדי להבטיח בניות CI/CD עובדות
- הסקריפט רץ אוטומטית ב-CI/CD אם האייקונים חסרים

## פתרון בעיות

### "failed to decode icon"
זה אומר שקובץ האייקון לא תקין. הרץ:
```bash
node scripts/generate-tauri-icons.js
```

### "npx: command not found"
וודא ש-Node.js מותקן. אם יש בעיות עם PowerShell, השתמש ב-cmd:
```cmd
cmd /c "node scripts/generate-tauri-icons.js"
```

### אייקון לא נראה טוב
ערוך את `scripts/create-base-icon.js` או צור אייקון משלך והרץ:
```bash
npx tauri icon your-custom-icon.png
```
