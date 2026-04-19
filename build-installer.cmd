@echo off
echo ========================================
echo Building Inno Setup Installer
echo ========================================
echo.

echo Step 1: Building Electron app...
call npm run build:electron
if errorlevel 1 goto error

echo.
echo Step 2: Creating unpacked directory...
call electron-builder --win --x64 --dir
if errorlevel 1 goto error

echo.
echo Step 3: Building Inno Setup installer...
iscc installer.iss
if errorlevel 1 goto error

echo.
echo ========================================
echo Build completed successfully!
echo ========================================
echo Installer created in: release\
echo.
pause
exit /b 0

:error
echo.
echo ========================================
echo Build failed!
echo ========================================
echo.
pause
exit /b 1
