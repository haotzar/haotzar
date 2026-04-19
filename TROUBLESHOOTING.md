# Troubleshooting Guide

## 🐧 Linux Build Issues

### Error: `libsoup-3.0` was not found

**שגיאה:**
```
Package libsoup-3.0 was not found in the pkg-config search path
```

**פתרון:**
```bash
sudo apt-get update
sudo apt-get install -y libsoup-3.0-dev
```

### Error: `webkit2gtk-4.1` not found

**שגיאה:**
```
Package webkit2gtk-4.1 was not found
```

**פתרון:**
```bash
sudo apt-get install -y libwebkit2gtk-4.1-dev libjavascriptcoregtk-4.1-dev
```

### התקנת כל ה-dependencies בבת אחת (Ubuntu/Debian):

```bash
sudo apt-get update
sudo apt-get install -y \
  libgtk-3-dev \
  libwebkit2gtk-4.1-dev \
  libappindicator3-dev \
  librsvg2-dev \
  patchelf \
  libsoup-3.0-dev \
  libjavascriptcoregtk-4.1-dev
```

### Fedora/RHEL:

```bash
sudo dnf install \
  gtk3-devel \
  webkit2gtk4.1-devel \
  libappindicator-gtk3-devel \
  librsvg2-devel \
  patchelf \
  libsoup3-devel
```

---

## 🪟 Windows Build Issues

### Error: Rust not found

**פתרון:**
1. הורד והתקן Rust: https://rustup.rs/
2. הפעל מחדש את הטרמינל
3. בדוק: `rustc --version`

### Error: Visual Studio Build Tools not found

**פתרון:**
1. הורד Visual Studio Build Tools: https://visualstudio.microsoft.com/downloads/
2. התקן את "Desktop development with C++"
3. הפעל מחדש

---

## 🍎 macOS Build Issues

### Error: Xcode Command Line Tools not found

**פתרון:**
```bash
xcode-select --install
```

### Error: Rust target not found

**פתרון:**
```bash
rustup target add aarch64-apple-darwin
rustup target add x86_64-apple-darwin
```

---

## 📱 Android Build Issues

### Error: NDK not found

**שגיאה:**
```
NDK_HOME is not set
```

**פתרון:**
```bash
# התקן NDK דרך Android Studio SDK Manager
# או דרך sdkmanager:
sdkmanager "ndk;26.1.10909125"

# הגדר את המשתנה:
export NDK_HOME=$ANDROID_HOME/ndk/26.1.10909125
```

### Error: Android SDK not found

**פתרון:**
1. התקן Android Studio
2. פתח SDK Manager
3. התקן:
   - Android SDK Platform 33+
   - Android SDK Build-Tools 33+
   - Android SDK Command-line Tools

### Error: Java not found

**פתרון:**
```bash
# Ubuntu/Debian
sudo apt-get install openjdk-17-jdk

# macOS
brew install openjdk@17

# Windows
# הורד מ-https://adoptium.net/
```

---

## 🍎 iOS Build Issues

### Error: Signing requires a development team

**שגיאה:**
```
error: Signing for "haotzer_iOS" requires a development team
```

**פתרון:**
1. צריך Apple Developer account ($99/שנה)
2. הוסף Team ID ל-GitHub Secrets (ראה MOBILE-SETUP.md)
3. או בנה מקומית עם Xcode

### Error: Provisioning profile not found

**פתרון:**
1. פתח את הפרויקט ב-Xcode: `open src-tauri/gen/apple/haotzer.xcodeproj`
2. בחר את ה-target
3. Signing & Capabilities → בחר Team
4. Xcode יצור provisioning profile אוטומטית

---

## 🔧 GitHub Actions Issues

### Workflow fails on Linux

**בדוק:**
1. האם כל ה-dependencies מותקנים? (ראה `.github/workflows/tauri-build.yml`)
2. האם `libsoup-3.0-dev` מותקן?
3. האם `libwebkit2gtk-4.1-dev` מותקן?

### iOS build is skipped

**זה תקין!** iOS build מדולג אם אין `APPLE_DEVELOPMENT_TEAM` secret.

**כדי להפעיל:**
- הוסף `APPLE_DEVELOPMENT_TEAM` ל-repository secrets (ראה MOBILE-SETUP.md)

### Android build fails with "project not initialized"

**זה לא אמור לקרות!** ה-workflow אמור לאתחל אוטומטית.

**אם זה קורה:**
1. בדוק את הלוג - האם ה-init step רץ?
2. בדוק אם יש שגיאות ב-init
3. נסה להריץ מקומית: `npm run tauri:android:init`

---

## 🔧 General Debugging

### Error: `no method named 'path' found for struct 'AppHandle'`

**שגיאה:**
```rust
error[E0599]: no method named `path` found for struct `AppHandle<R>`
help: trait `Manager` which provides `path` is implemented but not in scope
```

**פתרון:**
הוסף בתחילת הקובץ:
```rust
use tauri::Manager;
```

### Enable verbose logging

```bash
# Tauri
RUST_LOG=debug npm run tauri:dev

# Cargo
CARGO_LOG=debug cargo build
```

### Check Tauri version

```bash
npm run tauri -- --version
```

### Check Rust version

```bash
rustc --version
cargo --version
```

### Clean build

```bash
# Clean Rust build
cd src-tauri
cargo clean
cd ..

# Clean npm
rm -rf node_modules
npm install

# Clean all
npm run clean
npm install
```

---

## 📚 עזרה נוספת

- [Tauri Prerequisites](https://tauri.app/v2/guides/prerequisites/)
- [Tauri Troubleshooting](https://tauri.app/v2/guides/troubleshoot/)
- [GitHub Issues](https://github.com/[username]/haotzar/issues)
