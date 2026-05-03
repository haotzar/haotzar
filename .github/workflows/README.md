# GitHub Actions Workflows

## Tauri Build (All Platforms)

מבנה אוטומטית את האפליקציה עבור כל הפלטפורמות.

### איפה למצוא את הקבצים?

#### אופציה 1: Artifacts (מומלץ)
לאחר שה-workflow מסתיים, לך ל:
1. **Actions** tab בגיטהאב
2. בחר את ה-workflow run האחרון
3. גלול למטה ל-**Artifacts** section
4. הורד:
   - `windows-installers` - קבצי התקנה ל-Windows (MSI, EXE)
   - `macos-installers` - קבצי התקנה ל-macOS (DMG, App)
   - `linux-installers` - קבצי התקנה ל-Linux (DEB, RPM, AppImage)
   - `android-apk` - APK ל-Android (אם הופעל)

#### אופציה 2: Draft Release
הקבצים גם מועלים ל-**Draft Release**:
1. לך ל-**Releases** tab
2. תראה draft release עם tag `v1.0.0`
3. כל הקבצים מצורפים שם

### Platforms

- ✅ **Windows** - MSI + NSIS installer (עובד אוטומטית)
- ✅ **macOS** - DMG + App bundle ARM64 (עובד אוטומטית)
- ✅ **Linux** - DEB, RPM, AppImage (עובד אוטומטית)
- ✅ **Android** - APK (עובד אוטומטית - מאתחל את עצמו)
- ⏭️ **iOS** - IPA (מדולג - דורש הגדרה ידנית)

### Mobile Builds

#### ✅ Android - עובד אוטומטית!
ה-workflow מזהה אוטומטית אם הפרויקט לא מאותחל ומריץ `tauri android init --ci`.

**מה קורה:**
1. בודק אם `src-tauri/gen/android` קיים
2. אם לא - מריץ `tauri android init --ci` אוטומטית
3. בונה APK
4. מעלה ל-Artifacts

**אין צורך לעשות כלום!** זה פשוט עובד.

#### ⏭️ iOS - דורש הגדרה חד-פעמית

**סטטוס נוכחי:** ה-build מדולג (לא רץ בכלל) כי אין `APPLE_DEVELOPMENT_TEAM` secret.

**כדי להפעיל:**

1. **קבל Apple Developer Account** ($99/שנה)
   - הירשם ב-https://developer.apple.com

2. **מצא את ה-Team ID שלך:**
   - לך ל-https://developer.apple.com/account
   - תחת "Membership Details" תראה "Team ID" (10 תווים)
   - לדוגמה: `A1B2C3D4E5`

3. **הוסף ל-GitHub Secrets:**
   - לך ל-Settings → Secrets and variables → Actions
   - לחץ "New repository secret"
   - Name: `APPLE_DEVELOPMENT_TEAM`
   - Value: ה-Team ID שלך
   - לחץ "Add secret"

4. **הרץ את ה-workflow שוב** - iOS build יתחיל לרוץ אוטומטית!

**הערה:** גם אחרי הוספת ה-Team ID, ייתכן שתצטרך להגדיר provisioning profiles ו-certificates למכשירים אמיתיים. לבניית simulator זה מספיק.

### Environment Variables

- `GITHUB_TOKEN` - אוטומטי
- `TAURI_PRIVATE_KEY` - למערכת העדכונים (אופציונלי)
- `TAURI_KEY_PASSWORD` - סיסמה למפתח (אופציונלי)

---

## Deploy to GitHub Pages

מפרסם את האפליקציה כאתר סטטי ב-GitHub Pages.

### איך להפעיל?

#### שלב 1: הפעל GitHub Pages ברפוזיטורי
1. לך ל-**Settings** → **Pages**
2. תחת **Source**, בחר **GitHub Actions**
3. שמור

#### שלב 2: הרץ את ה-Workflow
ה-workflow רץ אוטומטית בכל push ל-`main`, או שאתה יכול להריץ ידנית:
1. לך ל-**Actions** tab
2. בחר **Deploy to GitHub Pages**
3. לחץ **Run workflow**

#### שלב 3: גש לאתר
לאחר שה-workflow מסתיים, האתר יהיה זמין ב:
- `https://<username>.github.io/<repo-name>/`

### מה קורה ב-Workflow?

1. **Build** - בונה את האפליקציה עם Vite
2. **Upload** - מעלה את תיקיית `dist` כ-artifact
3. **Deploy** - מפרסת ל-GitHub Pages

### הערות חשובות

- האפליקציה תרוץ במצב web (לא Electron/Tauri)
- תכונות שדורשות גישה למערכת הקבצים לא יעבדו
- מתאים לתצוגה מקדימה ודמו של האפליקציה
- ה-base path מוגדר אוטומטית לפי שם הרפוזיטורי
