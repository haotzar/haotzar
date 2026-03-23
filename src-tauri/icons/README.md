# Tauri Icons / אייקוני Tauri

תיקייה זו מכילה את האייקונים של האפליקציה בפורמטים שונים.

## מצב נוכחי ✅

האייקונים נוצרו מהקובץ `public/icon.png` ותקינים לחלוטין לבנייה.

## קבצים קיימים

### נדרש עבור Tauri:
- ✅ `icon.ico` - Windows icon
- ✅ `icon.icns` - macOS icon  
- ✅ `32x32.png` - Small icon
- ✅ `128x128.png` - Medium icon
- ✅ `128x128@2x.png` - High-DPI icon
- ✅ `icon.png` - Default icon

### נוסף עבור Windows Store:
- ✅ `StoreLogo.png`
- ✅ `Square30x30Logo.png` - `Square310x310Logo.png`

## יצירת אייקונים מחדש

אם תרצה ליצור אייקונים חדשים מאייקון מותאם אישית:

1. החלף את הקובץ `public/icon.png` באייקון שלך (512x512 פיקסלים מומלץ)
2. הרץ את הפקודה:

```bash
npx tauri icon public/icon.png
```

או דרך cmd (אם יש בעיות עם PowerShell):
```cmd
cmd /c "npx tauri icon public/icon.png"
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

- האייקונים הנוכחיים נוצרו מ-`public/icon.png`
- כל האייקונים מועברים למאגר Git כדי להבטיח בניות CI/CD עובדות
- הבנייה לא תנסה ליצור אייקונים אוטומטית - הם חייבים להיות קיימים מראש

## פתרון בעיות

### "failed to decode icon"
זה אומר שקובץ האייקון לא תקין. צור אותם מחדש:
```bash
npx tauri icon public/icon.png
```

### "npx: command not found"
וודא ש-Node.js מותקן. אם יש בעיות עם PowerShell, השתמש ב-cmd:
```cmd
cmd /c "npx tauri icon public/icon.png"
```

### אייקון לא נראה טוב
החלף את `public/icon.png` באייקון חדש והרץ:
```bash
npx tauri icon public/icon.png
```
