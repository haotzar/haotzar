# הגדרת Mobile Builds ב-GitHub Actions

## 📱 Android - ✅ עובד אוטומטית!

**אין צורך לעשות כלום!** ה-workflow מטפל בהכל אוטומטית.

### מה קורה מאחורי הקלעים:
1. ה-CI בודק אם `src-tauri/gen/android` קיים
2. אם לא - מריץ `tauri android init --ci` אוטומטית
3. בונה APK universal
4. מעלה ל-Artifacts

### איפה למצוא את ה-APK:
- Actions → בחר workflow run → Artifacts → `android-apk`

---

## 🍎 iOS - דורש הגדרה חד-פעמית

### למה iOS לא רץ עכשיו?
ה-build של iOS **מדולג לגמרי** (לא רץ בכלל) כי אין `APPLE_DEVELOPMENT_TEAM` secret.

### איך להפעיל:

#### שלב 1: קבל Apple Developer Account
- עלות: $99/שנה
- הירשם: https://developer.apple.com/programs/enroll/

#### שלב 2: מצא את ה-Team ID
1. לך ל-https://developer.apple.com/account
2. תחת **Membership Details** תמצא **Team ID**
3. זה מחרוזת של 10 תווים, לדוגמה: `A1B2C3D4E5`

#### שלב 3: הוסף ל-GitHub Secrets
1. לך לריפו שלך בגיטהאב
2. **Settings** → **Secrets and variables** → **Actions**
3. לחץ **New repository secret**
4. הזן:
   - **Name:** `APPLE_DEVELOPMENT_TEAM`
   - **Secret:** ה-Team ID שלך (10 תווים)
5. לחץ **Add secret**

#### שלב 4: הרץ את ה-Workflow
- Actions → בחר **Tauri Build (All Platforms)**
- לחץ **Run workflow**
- iOS build יתחיל לרוץ אוטומטית!

### איפה למצוא את ה-IPA:
- Actions → בחר workflow run → Artifacts → `ios-ipa`

---

## 🔍 בדיקת סטטוס

### Android
```bash
# בדוק אם הפרויקט מאותחל
ls -la src-tauri/gen/android/
```

אם התיקייה לא קיימת - אל דאגה! ה-CI יאתחל אותה אוטומטית.

### iOS
```bash
# בדוק אם הפרויקט מאותחל
ls -la src-tauri/gen/apple/
```

אם התיקייה לא קיימת - ה-CI יאתחל אותה אוטומטית (אם יש Team ID).

---

## 🚀 פיתוח מקומי

### Android
```bash
# אתחול (פעם אחת)
npm run tauri:android:init

# הרצה על emulator/device
npm run tauri:android:dev

# בנייה
npm run tauri:android:build
```

### iOS (רק על macOS)
```bash
# אתחול (פעם אחת)
npm run tauri:ios:init

# הרצה על simulator/device
npm run tauri:ios:dev

# בנייה
npm run tauri:ios:build
```

---

## ❓ שאלות נפוצות

### Q: האם אני חייב Apple Developer account?
**A:** לא! אם אתה לא צריך iOS, פשוט אל תוסיף את ה-secret. Android + Desktop יעבדו מצוין.

### Q: האם אני יכול לבנות iOS בלי לשלם?
**A:** אפשר לבנות ל-simulator מקומית בלי account, אבל ל-CI ולמכשירים אמיתיים צריך account בתשלום.

### Q: למה Android לא דורש שום דבר?
**A:** כי Android SDK הוא חינמי לגמרי! Google מספקת את הכל בחינם.

### Q: מה עם חתימה (signing) של Android?
**A:** ה-APK שנבנה הוא debug/unsigned. לפרסום ב-Play Store תצטרך להוסיף keystore ו-signing config.

---

## 📚 מקורות נוספים

- [Tauri Mobile Guide](https://tauri.app/v2/guides/mobile/)
- [Android Developer](https://developer.android.com/)
- [Apple Developer](https://developer.apple.com/)
