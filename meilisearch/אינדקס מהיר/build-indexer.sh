#!/bin/bash

echo "===================================="
echo "  בניית indexer.exe"
echo "===================================="
echo ""

# בדיקה אם PyInstaller מותקן
if ! python -c "import PyInstaller" 2>/dev/null; then
    echo "❌ PyInstaller לא מותקן"
    echo ""
    echo "מתקין PyInstaller..."
    pip install pyinstaller
    if [ $? -ne 0 ]; then
        echo "❌ התקנת PyInstaller נכשלה"
        exit 1
    fi
fi

echo "✅ PyInstaller מותקן"
echo ""

# בדיקה אם requests מותקן
if ! python -c "import requests" 2>/dev/null; then
    echo "❌ requests לא מותקן"
    echo ""
    echo "מתקין requests..."
    pip install requests
    if [ $? -ne 0 ]; then
        echo "❌ התקנת requests נכשלה"
        exit 1
    fi
fi

echo "✅ requests מותקן"
echo ""

# מחיקת build ישן
if [ -f "dist/indexer.exe" ]; then
    echo "🗑️  מוחק build ישן..."
    rm -f "dist/indexer.exe"
fi

echo "🔨 מקמפל את indexer.py..."
echo ""

# קומפילציה עם PyInstaller
pyinstaller --onefile --console --name indexer indexer.py

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ הקומפילציה נכשלה"
    exit 1
fi

echo ""
echo "✅ הקומפילציה הצליחה!"
echo ""

# בדיקה אם הקובץ נוצר
if [ ! -f "dist/indexer.exe" ]; then
    echo "❌ indexer.exe לא נמצא ב-dist/"
    exit 1
fi

echo "📦 מעתיק את indexer.exe ל-resources/meilisearch/..."
echo ""

# יצירת תיקייה אם לא קיימת
mkdir -p "../../resources/meilisearch"

# העתקה
cp -f "dist/indexer.exe" "../../resources/meilisearch/indexer.exe"

if [ $? -ne 0 ]; then
    echo "❌ ההעתקה נכשלה"
    exit 1
fi

echo ""
echo "✅ הכל הושלם בהצלחה!"
echo ""
echo "📍 המיקום: resources/meilisearch/indexer.exe"
echo ""
