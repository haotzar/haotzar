# מדריך בניית אינדקס Meilisearch

סקריפט זה בונה אינדקס חיפוש עבור קבצי PDF וספרי אוצריא.

## התקנה

```bash
pip install pymupdf requests
```

## שימוש בסיסי

### 1. אינדקס קבצי PDF

```bash
python indexer.py pdf --input "../../books/hebrewbooks" --index pdf_pages
```

הסקריפט יסרוק את כל קבצי ה-PDF בתיקייה ויצור אינדקס עם השדות הבאים:
- `id` - מזהה ייחודי לעמוד
- `source_file` - שם הקובץ
- `source_path` - נתיב מלא לקובץ
- `page` - מספר עמוד
- `content` - תוכן העמוד

### 2. אינדקס ספרי אוצריא

#### אינדקס ספרים (מטא-דאטה בלבד)
```bash
python indexer.py books --db "../../books/אוצריא/seforim.db" --index otzaria_books
```

שדות:
- `id` - מזהה הספר
- `title` - שם הספר
- `heShortDesc` - תיאור קצר
- `totalLines` - מספר שורות
- `volume` - כרך

#### אינדקס שורות (תוכן מלא)
```bash
python indexer.py lines --db "../../books/אוצריא/seforim.db" --index otzaria_lines
```

שדות:
- `id` - מזהה השורה
- `bookId` - מזהה הספר
- `lineIndex` - מספר השורה
- `content` - תוכן השורה
- `heRef` - הפניה עברית

**אזהרה**: אינדקס שורות יכול לקחת זמן רב (מיליוני שורות)!

## אפשרויות מתקדמות

### גודל Batch
```bash
# PDF - ברירת מחדל 500
python indexer.py pdf --input "books" --index pdf --batch-size 1000

# ספרים - ברירת מחדל 1000
python indexer.py books --db seforim.db --index books --batch-size 2000

# שורות - ברירת מחדל 1000
python indexer.py lines --db seforim.db --index lines --batch-size 5000
```

### מספר תהליכים מקבילים (PDF בלבד)
```bash
python indexer.py pdf --input "books" --index pdf --workers 8
```

### ללא המתנה לסיום
```bash
python indexer.py pdf --input "books" --index pdf --no-wait
```

### כתובת Meilisearch מותאמת
```bash
python indexer.py pdf --input "books" --index pdf --url http://localhost:8080
```

### עם API Key
```bash
python indexer.py pdf --input "books" --index pdf --api-key YOUR_KEY
```

## פקודות נוספות

### בדיקת סטטיסטיקות
```bash
python indexer.py stats --index pdf_pages
```

### מחיקת אינדקס
```bash
python indexer.py delete --index old_index
```

### מצב verbose
```bash
python indexer.py pdf --input "books" --index pdf -v
```

## דוגמאות מלאות

### אינדקס מלא לאפליקציה
```bash
# 1. ודא ש-Meilisearch רץ
cd ../../
npm run dev  # או הפעל את האפליקציה

# 2. בנה אינדקס PDF
cd "meilisearch/אינדקס מהיר"
python indexer.py pdf --input "../../books/hebrewbooks" --index pdf_pages --workers 4

# 3. בנה אינדקס אוצריא (ספרים)
python indexer.py books --db "../../books/אוצריא/seforim.db" --index otzaria_books

# 4. (אופציונלי) בנה אינדקס שורות - לוקח זמן!
python indexer.py lines --db "../../books/אוצריא/seforim.db" --index otzaria_lines --batch-size 10000
```

### בדיקה מהירה
```bash
# אינדקס רק 10 קבצי PDF ראשונים
python indexer.py pdf --input "../../books/hebrewbooks/*.pdf" --index test_pdf --batch-size 100
```

## פתרון בעיות

### שגיאת חיבור
```
לא ניתן להתחבר ל-Meilisearch
```
**פתרון**: ודא ש-Meilisearch רץ. הפעל את האפליקציה או הרץ ידנית:
```bash
cd ../../meilisearch
./meilisearch.exe
```

### חסרה ספריית PDF
```
חסרה ספריית חילוץ PDF
```
**פתרון**: התקן PyMuPDF:
```bash
pip install pymupdf
```

### זיכרון אוזל
**פתרון**: הקטן את batch-size או workers:
```bash
python indexer.py pdf --input "books" --index pdf --batch-size 200 --workers 2
```

### אינדקס לא מופיע באפליקציה
**פתרון**: 
1. בדוק שהאינדקס נוצר: `python indexer.py stats --index YOUR_INDEX`
2. רענן את האפליקציה
3. בדוק שבחרת את האינדקס הנכון בהגדרות החיפוש

## מבנה האינדקסים

### PDF Index
```json
{
  "id": "p_abc123...",
  "source_file": "ספר_הזוהר.pdf",
  "source_path": "F:\\books\\ספר_הזוהר.pdf",
  "page": 42,
  "content": "תוכן העמוד..."
}
```

### Otzaria Books Index
```json
{
  "id": 123,
  "title": "משנה תורה",
  "heShortDesc": "חיבור הלכתי של הרמב\"ם",
  "totalLines": 15000,
  "volume": "א"
}
```

### Otzaria Lines Index
```json
{
  "id": 456789,
  "bookId": 123,
  "lineIndex": 42,
  "content": "הלכות תפילין פרק א",
  "heRef": "משנה תורה, הלכות תפילין א:א"
}
```

## ביצועים

- **PDF**: ~50-200 עמודים/שניה (תלוי במהירות המחשב)
- **ספרים**: ~1000-5000 ספרים/שניה
- **שורות**: ~5000-20000 שורות/שניה

## טיפים

1. **התחל עם אינדקס קטן** - בדוק שהכל עובד לפני אינדקס מלא
2. **השתמש ב-workers מרובים** - מאיץ משמעותית את עיבוד ה-PDF
3. **אל תבנה אינדקס שורות** אם אין צורך - זה לוקח הרבה זמן ומקום
4. **שמור על Meilisearch רץ** - הסקריפט לא מפעיל אותו אוטומטית

## קישורים

- [Meilisearch Documentation](https://docs.meilisearch.com/)
- [PyMuPDF Documentation](https://pymupdf.readthedocs.io/)
