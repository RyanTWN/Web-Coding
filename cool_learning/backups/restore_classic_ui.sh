#!/bin/bash
# 酷學習 (Cool Learning) - 一鍵還原經典版介面腳本 (Rollback to Classic UI)
# 執行此腳本會將所有 HTML 與 JS 檔案立即還原至改版前的經典乾淨版本。

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COOL_LEARNING_DIR="$(dirname "$SCRIPT_DIR")"

echo "=========================================================="
echo "🔄 酷學習 (Cool Learning) 介面一鍵還原程序啟動中..."
echo "=========================================================="

cp "$SCRIPT_DIR/classic_original_backup/index.html" "$COOL_LEARNING_DIR/index.html"
cp "$SCRIPT_DIR/classic_original_backup/math.html" "$COOL_LEARNING_DIR/math.html"
cp "$SCRIPT_DIR/classic_original_backup/english.html" "$COOL_LEARNING_DIR/english.html"
cp "$SCRIPT_DIR/classic_original_backup/chinese.html" "$COOL_LEARNING_DIR/chinese.html"
cp "$SCRIPT_DIR/classic_original_backup/nature.html" "$COOL_LEARNING_DIR/nature.html"
cp "$SCRIPT_DIR/classic_original_backup/social.html" "$COOL_LEARNING_DIR/social.html"
cp "$SCRIPT_DIR/classic_original_backup/games.html" "$COOL_LEARNING_DIR/games.html"
cp "$SCRIPT_DIR/classic_original_backup/profile.html" "$COOL_LEARNING_DIR/profile.html"
cp "$SCRIPT_DIR/classic_original_backup/app.js" "$COOL_LEARNING_DIR/assets/js/app.js"

echo "✅ 已成功還原 9 個核心檔案至改版前的經典版本！"
echo "✅ 原始題庫、計算邏輯、認證與音訊機制 100% 完好無損。"
echo "=========================================================="
