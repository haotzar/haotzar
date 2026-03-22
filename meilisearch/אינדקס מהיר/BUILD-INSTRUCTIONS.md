# הוראות בניית indexer.exe

## דרישות מקדימות

1. Python 3.x מותקן
2. pip מותקן

## בניה מהירה

### Windows (CMD/PowerShell)
```cmd
cd "meilisearch\אינדקס מהיר"
build-indexer.cmd
```

### Windows (Git Bash) / Linux / Mac
```bash
cd "meilisearch/אינדקס מהיר"
chmod +x build-indexer.sh
./build-indexer.sh
```

## מה הסקריפט עושה?

1. ✅ בודק אם PyInstaller מותקן (ומתקין אם צריך)
2. ✅ בודק אם requests מותקן (ומתקין אם צריך)
3. 🔨 מקמפל את `indexer.py` ל-`indexer.exe`
4. 📦 מעתיק את `indexer.exe` ל-`resources/meilisearch/`

## בניה ידנית (אם הסקריפט לא עובד)

```bash
# 1. התקן תלויות
pip install pyinstaller requests

# 2. קמפל
cd "meilisearch/אינדקס מהיר"
pyinstaller --onefile --console --name indexer indexer.py

# 3. העתק
copy dist\indexer.exe ..\..\resources\meilisearch\indexer.exe
```

## פתרון בעיות

### PyInstaller לא מותקן
```bash
pip install pyinstaller
```

### requests לא מותקן
```bash
pip install requests
```

### הקומפילציה נכשלה
נסה להריץ ידנית:
```bash
pyinstaller --onefile --console indexer.py
```

ובדוק את השגיאות.

### הקובץ לא מועתק
העתק ידנית:
```bash
copy "meilisearch\אינדקס מהיר\dist\indexer.exe" "resources\meilisearch\indexer.exe"
```

## אחרי הבניה

1. ה-`indexer.exe` נמצא ב-`resources/meilisearch/`
2. האפליקציה תשתמש בו אוטומטית
3. אפשר למחוק את תיקיות `build/` ו-`dist/` אם רוצים

## עדכון אחרי שינויים

כל פעם שמשנים את `indexer.py`, צריך להריץ את הסקריפט מחדש:

```cmd
cd "meilisearch\אינדקס מהיר"
build-indexer.cmd
```

זהו! 🎉
