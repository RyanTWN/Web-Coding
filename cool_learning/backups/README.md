# 酷學習 (Cool Learning) 介面備份與一鍵還原系統

本目錄包含「酷學習」在進行 **Apple 旗艦流體 Bento Grid ＋ 懸浮動態島 (Option 1 改版)** 前的完整經典版原始程式碼與一鍵還原工具。

---

## 備份檔案內容 (`classic_original_backup/`)

- `index.html`: 改版前首頁與經典雙欄科目大廳
- `math.html`: 改版前數學天地題庫與測驗駕駛艙
- `english.html`: 改版前英文單字 2000 與學習日曆
- `chinese.html`: 改版前國語成語 200 與字音字形
- `nature.html`: 改版前自然科學實驗室
- `social.html`: 改版前社會人文生活情境
- `games.html`: 改版前邊玩邊學小遊戲大廳
- `profile.html`: 改版前學生個人檔案與成長曲線
- `app.js`: 改版前的前端核心控制邏輯

---

## 如何還原至經典版本 (Rollback Methods)

### 方法一：透過網頁介面即時無縫切換（最推薦，零停機）
在任何頁面頂部的導覽列，點擊 **「新版微光 / 經典風」** 切換按鈕，即可使用原生 View Transitions 在 0.1 秒內無縫切回經典漫畫風格，無須替換檔案。

### 方法二：透過 URL 強制參數還原
在任何頁面網址後方加上 `?ui=classic`，例如：
`index.html?ui=classic`
即可強制切換為經典風格並寫入瀏覽器偏好。

### 方法三：一鍵實體檔案還原（Windows / Linux 雙平台）
若需將磁碟上的 HTML / JS 檔案全部還原回改版前的純淨狀態：
- **Windows 用戶**：直接滑鼠雙擊執行 [`restore_classic_ui.bat`](./restore_classic_ui.bat)
- **Linux / macOS 用戶**：在終端機中執行 `bash cool_learning/backups/restore_classic_ui.sh`

### 方法四：Git 版本庫還原
本版本庫已建立專屬標籤與分支：
```bash
git checkout v-classic-backup-20261102
# 或切換至分支
git checkout backup/classic-ui
```
