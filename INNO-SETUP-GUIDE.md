# מדריך התקנה ושימוש ב-Inno Setup

## התקנת Inno Setup

### הורדה והתקנה
1. הורד את Inno Setup מהאתר הרשמי: https://jrsoftware.org/isdl.php
2. הורד את הגרסה האחרונה (Inno Setup 6.x)
3. התקן את התוכנה במחשב שלך

### הוספת Inno Setup ל-PATH (אופציונלי)
כדי להריץ את הפקודה `iscc` מכל מקום:
1. פתח את הגדרות המערכת (System Properties)
2. לחץ על "Environment Variables"
3. הוסף את הנתיב `C:\Program Files (x86)\Inno Setup 6` ל-PATH

## בניית המתקין

### שלב 1: בניית האפליקציה
```bash
npm run build:electron
```

### שלב 2: יצירת קבצי ה-unpacked
```bash
npm run electron:build:win
```
או
```bash
electron-builder --win --x64 --dir
```

### שלב 3: בניית המתקין עם Inno Setup

#### אופציה 1: דרך npm script (מומלץ)
```bash
npm run build:installer
```
זה ירוץ את הסקריפט `scripts/build-inno-installer.js` שמטפל בכל התהליך אוטומטית.

#### אופציה 2: דרך npm script פשוט
```bash
npm run electron:build:inno
```

#### אופציה 3: ידנית
```bash
iscc installer.iss
```

#### אופציה 4: דרך ה-GUI של Inno Setup
1. פתח את Inno Setup Compiler
2. פתח את הקובץ `installer.iss`
3. לחץ על Build > Compile

#### אופציה 5: דרך קובץ batch
```bash
build-installer.cmd
```

## בניה אוטומטית עם GitHub Actions

הפרויקט כולל שני workflows ל-Inno Setup:

### Workflow 1: build.yml (בניה כללית)
מריץ אוטומטית כאשר:
- יש push ל-branch main
- יש tag חדש (v*)
- יש pull request

הוא בונה שלושה סוגי מתקינים:
1. NSIS (electron-builder ברירת מחדל)
2. Inno Setup (מתקין מותאם אישית)
3. Tauri (גרסה קלה)

### Workflow 2: build-inno.yml (ייעודי ל-Inno Setup)
ניתן להריץ ידנית:
1. עבור ל-Actions tab ב-GitHub
2. בחר "Build Inno Setup Installer"
3. לחץ "Run workflow"
4. (אופציונלי) הזן מספר גרסה
5. לחץ "Run workflow"

המתקין יהיה זמין להורדה ב-Artifacts של ה-workflow run.

### הורדת המתקין מ-GitHub Actions
1. עבור ל-Actions tab
2. בחר את ה-workflow run הרצוי
3. גלול למטה ל-Artifacts
4. הורד את `inno-setup-installer.zip`
5. חלץ את הקובץ והפעל את המתקין

## קובץ ההגדרות (installer.iss)

הקובץ `installer.iss` מכיל את כל ההגדרות של המתקין:

### הגדרות עיקריות שניתן לשנות:

```ini
; שם האפליקציה
#define MyAppName "haotzar"

; גרסה
#define MyAppVersion "1.0.0"

; מפרסם
#define MyAppPublisher "האוצר Team"

; נתיב ברירת מחדל להתקנה
DefaultDirName={autopf}\{#MyAppName}

; דרישות הרשאות (lowest = ללא admin, admin = דורש admin)
PrivilegesRequired=lowest

; שפות
[Languages]
Name: "hebrew"; MessagesFile: "compiler:Languages\Hebrew.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"
```

### משימות (Tasks)
```ini
[Tasks]
Name: "desktopicon"; Description: "צור קיצור דרך בשולחן העבודה"
Name: "quicklaunchicon"; Description: "צור קיצור דרך בסרגל המשימות"
```

## תיקון בעיות נפוצות

### שגיאה: "iscc is not recognized"
**פתרון:** הוסף את Inno Setup ל-PATH או השתמש בנתיב המלא:
```bash
"C:\Program Files (x86)\Inno Setup 6\iscc.exe" installer.iss
```

### שגיאה: "Source file not found"
**פתרון:** ודא שהרצת את `electron-builder --win --x64 --dir` לפני בניית המתקין.
התיקייה `release\win-unpacked` חייבת להיות קיימת.

### שגיאה: "License file not found"
**פתרון:** ודא שקובץ LICENSE קיים בתיקיית הפרויקט, או הסר את השורה:
```ini
LicenseFile=LICENSE
```

### שגיאה: "Icon file not found"
**פתרון:** ודא שהאייקון קיים ב-`src-tauri\icons\icon.ico` או עדכן את הנתיב:
```ini
SetupIconFile=public\icon.ico
```

## התאמה אישית

### שינוי שפת ברירת המחדל
ערוך את הקובץ `installer.iss`:
```ini
[Setup]
ShowLanguageDialog=yes  ; יציג בחירת שפה
```

### הוספת קבצים נוספים
```ini
[Files]
Source: "path\to\file.txt"; DestDir: "{app}"; Flags: ignoreversion
```

### הרצת פקודות לאחר ההתקנה
```ini
[Run]
Filename: "{app}\setup-script.bat"; Description: "Run setup"; Flags: postinstall
```

## יתרונות Inno Setup על פני NSIS

1. **קל יותר לקריאה ועריכה** - תחביר פשוט וברור
2. **תמיכה מובנית בעברית** - קבצי שפה מוכנים
3. **גודל מתקין קטן יותר** - דחיסה יעילה
4. **קוד פתוח** - ללא עלויות רישוי
5. **תיעוד מצוין** - מדריכים ודוגמאות רבות
6. **GUI נוח** - עורך גרפי לבניית המתקין

## קישורים שימושיים

- [תיעוד רשמי של Inno Setup](https://jrsoftware.org/ishelp/)
- [דוגמאות סקריפטים](https://jrsoftware.org/ishelp/index.php?topic=scriptsamples)
- [רשימת פרמטרים](https://jrsoftware.org/ishelp/index.php?topic=setup_parameters)
