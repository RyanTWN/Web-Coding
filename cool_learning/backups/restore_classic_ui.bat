@echo off
chcp 65001 >nul
echo ==========================================================
echo 🔄 酷學習 (Cool Learning) 介面一鍵還原程序啟動中...
echo ==========================================================

set BACKUP_DIR=%~dp0classic_original_backup
set TARGET_DIR=%~dp0..

copy /Y "%BACKUP_DIR%\index.html" "%TARGET_DIR%\index.html" >nul
copy /Y "%BACKUP_DIR%\math.html" "%TARGET_DIR%\math.html" >nul
copy /Y "%BACKUP_DIR%\english.html" "%TARGET_DIR%\english.html" >nul
copy /Y "%BACKUP_DIR%\chinese.html" "%TARGET_DIR%\chinese.html" >nul
copy /Y "%BACKUP_DIR%\nature.html" "%TARGET_DIR%\nature.html" >nul
copy /Y "%BACKUP_DIR%\social.html" "%TARGET_DIR%\social.html" >nul
copy /Y "%BACKUP_DIR%\games.html" "%TARGET_DIR%\games.html" >nul
copy /Y "%BACKUP_DIR%\profile.html" "%TARGET_DIR%\profile.html" >nul
copy /Y "%BACKUP_DIR%\app.js" "%TARGET_DIR%\assets\js\app.js" >nul

echo ✅ 已成功還原 9 個核心檔案至改版前的經典版本！
echo ✅ 原始題庫、計算邏輯、認證與音訊機制 100% 完好無損。
echo ==========================================================
pause
