# האויצר - מאגר ספרים תורני

אפליקציה דסקטופ להצגת ספרים תורניים בפורמט PDF וטקסט, בנויה עם React ו-Tauri.

## תכונות

- 📚 הצגת קבצי PDF וטקסט
- 🔍 חיפוש בספרים
- 📑 ניהול כרטיסיות מרובות
- 🌙 מצב יום/לילה
- ⚙️ הגדרות מותאמות אישית
- 🕐 זמני היום
- 📖 ספרים שנפתחו לאחרונה

## דרישות מערכת

- Windows 10/11
- Node.js 16+
- Rust (עבור Tauri)

## התקנה ופיתוח

### הכנת סביבת הפיתוח

1. שכפל את המאגר:
```bash
git clone https://github.com/orayta-library/fluent-ui-app.git
cd fluent-ui-app
```

2. התקן תלויות:
```bash
npm install
```

3. התקן Rust ו-Tauri (אם לא מותקן):
```bash
# התקן Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# התקן Tauri CLI
cargo install tauri-cli
```

### הרצה במצב פיתוח

```bash
npm run tauri:dev
```

### בנייה לפרודקשן

#### Tauri
```bash
npm run tauri:build
```

הקובץ המבוצע יווצר בתיקייה `src-tauri/target/release/bundle/`

#### Electron
```bash
npm run electron:build:win
```

הקובץ המבוצע יווצר בתיקייה `release/`

### בנייה אוטומטית ב-GitHub Actions

הפרויקט כולל workflow אוטומטי שבונה את האפליקציה עבור:
- **Tauri** - בנייה עם Rust
- **Electron** - בנייה עם Node.js

הבנייה מתבצעת אוטומטית בכל push ל-main או בעת יצירת tag חדש.

**הערה חשובה**: תיקיית `books/` לא נכללת בבנייה האוטומטית. משתמשים צריכים להוסיף ספרים ידנית לאחר ההתקנה.

### יצירת אייקונים

האפליקציה כוללת אייקונים שנוצרו אוטומטית. ליצירת אייקונים מחדש:

```bash
# יצירה אוטומטית עם עיצוב ברירת מחדל
node scripts/tools.js icons:tauri

# או עם אייקון מותאם אישית
npx tauri icon path/to/your-icon.png
```

לפרטים נוספים, ראה [תיעוד אייקונים](src-tauri/icons/README.md).

## מבנה הפרויקט

```
├── src/                    # קוד React
│   ├── App.jsx            # רכיב ראשי
│   ├── TextViewer.jsx     # מציג טקסט
│   ├── Settings.jsx       # הגדרות
│   └── utils/             # כלי עזר
├── src-tauri/             # קוד Tauri (Rust)
├── books/                 # ספרים (PDF וטקסט)
├── public/                # קבצים סטטיים
└── electron/              # תמיכה ב-Electron (אופציונלי)
```

## הוספת ספרים

### בפיתוח
הוסף קבצי PDF או טקסט לתיקייה `books/` והם יופיעו אוטומטית באפליקציה.

### באפליקציה המותקנת

#### Tauri
לאחר התקנת האפליקציה, הספרים נמצאים בתיקייה:
- **Windows**: `%LOCALAPPDATA%\com.haotzer.app\books`
- **macOS**: `~/Library/Application Support/com.haotzer.app/books`
- **Linux**: `~/.local/share/com.haotzer.app/books`

העתק את קבצי ה-PDF והטקסט שלך לתיקייה זו.

#### Electron
באלקטרון, הספרים נטענים ישירות מתיקיית `books/` שבתיקיית האפליקציה.

### מיקום תיקיית הספרים
האפליקציה תציג את המיקום המדויק של תיקיית הספרים בהודעת שגיאה אם לא נמצאו ספרים.

## בניית אינדקס חיפוש

האפליקציה משתמשת ב-Meilisearch לחיפוש מהיר. לבניית אינדקס, השתמש בסקריפט הפייתון:

### דרישות
```bash
pip install pymupdf requests
```

### בניית אינדקס לקבצי PDF
```bash
cd meilisearch/אינדקס מהיר
python indexer.py pdf --input "../../books/hebrewbooks" --index pdf_pages
```

### בניית אינדקס לספרי אוצריא
```bash
# אינדקס ספרים (מטא-דאטה)
python indexer.py books --db "../../books/אוצריא/seforim.db" --index otzaria_books

# אינדקס שורות (תוכן מלא - לוקח זמן!)
python indexer.py lines --db "../../books/אוצריא/seforim.db" --index otzaria_lines
```

### אפשרויות נוספות
```bash
# הצגת עזרה
python indexer.py --help

# בדיקת סטטיסטיקות אינדקס
python indexer.py stats --index pdf_pages

# מחיקת אינדקס
python indexer.py delete --index old_index
```

**הערה**: ודא ש-Meilisearch רץ לפני בניית האינדקס. האפליקציה מפעילה אותו אוטומטית.

## טכנולוגיות

- **Frontend**: React 18, Vite, Fluent UI
- **Backend**: Tauri (Rust)
- **Styling**: CSS Modules
- **Build**: GitHub Actions

## תרומה

1. צור Fork של המאגר
2. צור ענף חדש (`git checkout -b feature/amazing-feature`)
3. בצע Commit לשינויים (`git commit -m 'Add amazing feature'`)
4. דחף לענף (`git push origin feature/amazing-feature`)
5. פתח Pull Request

## רישיון

פרויקט זה מופץ תחת רישיון MIT. ראה `LICENSE` לפרטים נוספים.

## יצירת קשר

לשאלות או הצעות, פתח Issue במאגר.
