@echo off
chcp 65001 > nul
echo ====================================
echo   בניית indexer.exe
echo ====================================
echo.

REM בדיקה אם PyInstaller מותקן
python -c "import PyInstaller" 2>nul
if errorlevel 1 (
    echo ❌ PyInstaller לא מותקן
    echo.
    echo מתקין PyInstaller...
    pip install pyinstaller
    if errorlevel 1 (
        echo ❌ התקנת PyInstaller נכשלה
        pause
        exit /b 1
    )
)

echo ✅ PyInstaller מותקן
echo.

REM בדיקה אם requests מותקן
python -c "import requests" 2>nul
if errorlevel 1 (
    echo ❌ requests לא מותקן
    echo.
    echo מתקין requests...
    pip install requests
    if errorlevel 1 (
        echo ❌ התקנת requests נכשלה
        pause
        exit /b 1
    )
)

echo ✅ requests מותקן
echo.

REM מחיקת build ישן
if exist "dist\indexer.exe" (
    echo 🗑️  מוחק build ישן...
    del /f /q "dist\indexer.exe" 2>nul
)

echo 🔨 מקמפל את indexer.py...
echo.

REM קומפילציה עם PyInstaller (דרך python -m)
python -m PyInstaller --onefile --console --name indexer indexer.py

if errorlevel 1 (
    echo.
    echo ❌ הקומפילציה נכשלה
    pause
    exit /b 1
)

echo.
echo ✅ הקומפילציה הצליחה!
echo.

REM בדיקה אם הקובץ נוצר
if not exist "dist\indexer.exe" (
    echo ❌ indexer.exe לא נמצא ב-dist\
    pause
    exit /b 1
)

echo 📦 מעתיק את indexer.exe ל-resources\meilisearch\...
echo.

REM יצירת תיקייה אם לא קיימת
if not exist "..\..\resources\meilisearch" (
    mkdir "..\..\resources\meilisearch"
)

REM העתקה
copy /y "dist\indexer.exe" "..\..\resources\meilisearch\indexer.exe"

if errorlevel 1 (
    echo ❌ ההעתקה נכשלה
    pause
    exit /b 1
)

echo.
echo ✅ הכל הושלם בהצלחה!
echo.
echo 📍 המיקום: resources\meilisearch\indexer.exe
echo.

pause
