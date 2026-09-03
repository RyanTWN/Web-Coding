# 酷學習 (Cool Learning) 系統架構與開發進度分析報告

> **報告生成時間**：2026-09-04  
> **專案位置**：`d:\Web Coding` (Repository: `RyanTWN/Web-Coding`)  
> **系統定位**：專為國小六年級設計的跨學科自主學習、每日練習與評量平台，支援校園/課堂座號學習，並已具備商用 B2C 家長帳號、子女管理與 App 內購訂閱體系。

---

## 總覽目錄

1. [專案背景與核心功能](#1-專案背景與核心功能)
2. [系統總體架構圖](#2-系統總體架構圖)
3. [各子專案架構詳細剖析](#3-各子專案架構詳細剖析)
   - [3.1 前端網頁（cool_learning）](#31-前端網頁cool_learning)
   - [3.2 後端 API 服務（cool_learning_backend）](#32-後端-api-服務cool_learning_backend)
   - [3.3 行動端 App（cool_learning_app）](#33-行動端-appcool_learning_app)
   - [3.4 CI/CD 與 Synology NAS 部署架構](#34-cicd-與-synology-nas-部署架構)
4. [資料庫設計與關聯結構](#4-資料庫設計與關聯結構)
5. [歷史版本演進與開發進度時間軸](#5-歷史版本演進與開發進度時間軸)
6. [功能完成度檢核表 (Feature Matrix)](#6-功能完成度檢核表-feature-matrix)
7. [安全防護與效能設計亮點](#7-安全防護與效能設計亮點)
8. [後續規劃與待辦建議事項 (Next Steps)](#8-後續規劃與待辦建議事項-next-steps)

---

## 1. 專案背景與核心功能

「酷學習」以國小六年級課綱為基礎，針對「每日微學習 (Micro-learning)」、「作答檢討反饋」與「學習打卡激勵」機制進行深度打造。目前具備兩大營運模式：
- **課堂 / 學生模式 (B2B / Classroom)**：學生輸入姓名、5 碼座號與個人密碼登入，直接進行每日各學科任務。
- **家長訂閱模式 (B2C / Family)**：家長透過 Email、Google 或 Apple 登入，管理多位子女檔案（自動映射虛擬座號，完全兼容後端各學科引擎），並透過雙平台 App 內購（IAP）訂閱方案解鎖完整內容。

### 核心學科模組：
- **英語天地 (English)**：
  - 每日 30 字循環配比抽取機制（等級 1、2、3 按 13:12:5 配比）。
  - 3D 漫畫風格翻轉單字卡（含音標、發音語音合成 TTS、中文釋義、例句與翻譯）。
  - 多型態隨堂測驗（單字選擇題、拼字填空題、聽力測驗題）。
  - 難字星號標記、複習強化與學習歷程日曆。
- **數學天地 (Math)**：
  - 涵蓋國小六年級核心單元（最大公因數與公倍數、分數四則、小數除法、比與比值、圓與扇形、速率、柱體表面積/體積、基準量與比較量、怎樣解題、比例尺、統計圖）。
  - 填空與四選一混合題型，支援數值與分數等價自動容錯判定（如 1/2 等價於 0.5）。
  - 兩次機會防挫折作答流程：初次答錯提供小提示 (Hint)，二次答錯展開詳細步驟推導 (Explanation)。
  - 真實得分結算與單日多回合 (Attempt No) 進步追蹤。
  - 錯題本與掌握度機制 (`math_wrong_questions`)：答錯自動收錄，複習答對自動精熟移出。
  - 學習打卡日曆與月度題數/得分數據可視化。
- **自然科學實驗室 (Nature Science)**：
  - 115 學年度課綱，支援三大主流教科書版本：**康軒、南一、翰林**。
  - 涵蓋天氣變化、地表變動、電與磁、生物與環境等單元。
  - 每日固定 20 題練習，支援**單日多回合重測 (Multiple Attempts)**。
  - **錯題本與掌握度機制 (Nature Wrong Questions)**：針對易錯題目持續追蹤，答對自動標記為熟練掌握。
- **管理員後台 (Admin Portal)**：
  - 學生名冊管理、座號啟用與密碼重設。
  - 單字庫 CRUD 管理、音標維護、例句編輯與單字啟用開關 (`learning_enabled`)。
  - 班級學習進度、測驗成績歷程數據分析與排行榜。

---

## 2. 系統總體架構圖

```
┌───────────────────────────────────────────────────────────────────────────┐
│                           用戶端 (Clients)                                │
├─────────────────────────────────────┬─────────────────────────────────────┤
│  網頁版 (Web - Responsive / PWA)    │  行動端 (React Native + TS App)     │
│  - 瀏覽器存取 / PWA 離線支援        │  - 家長登入 (Email / Google / Apple)│
│  - 學生座號密碼登入                 │  - 子女檔案管理 (Child Profiles)    │
│  - 英文 / 數學 / 自然學習與測驗     │  - Google Play / App Store 訂閱付費 │
│  - 管理員後台 (Admin Panel)         │  - (未來規劃: 內嵌學習畫面)         │
└──────────────────┬──────────────────┴──────────────────┬──────────────────┘
                   │ HTTPS: 443 / 4061                   │ HTTPS: 4061
                   ▼                                     ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                      Synology NAS (DS423+ x86_64)                         │
├───────────────────────────────────────────────────────────────────────────┤
│  [Synology Reverse Proxy] (Nginx)                                         │
│    ├── 網站網域: https://learning.ifit.myds.me/cool_learning/             │
│    │     └── 轉發至 Web Station 或前端容器 (Port 8080 -> 80)              │
│    └── API 網域: https://learning.ifit.myds.me:4061/api                  │
│          └── 反向代理至後端容器 (Port 4060)                                │
├───────────────────────────────────────────────────────────────────────────┤
│  [Docker Compose: cool_learning]                                          │
│    ├── cool-learning-web (nginx:1.27-alpine)                              │
│    │     └── 靜態 HTML/JS/CSS (Tailwind CLI 建置)                         │
│    └── cool-learning-api (node:20-alpine)                                 │
│          ├── Express API (Modular Routes + Dependency Injection)          │
│          ├── JWT 鑑權 / 防暴力密碼鎖定 (5 次錯鎖 15 分鐘)                 │
│          └── Google Play PubSub / Apple Webhooks 驗證模組                 │
├───────────────────────────────────────────────────────────────────────────┤
│  [MariaDB / MySQL Database]                                               │
│    └── 最小權限專用帳號 cool_learning_app (utf8mb4_unicode_ci)             │
│          └── 15+ 張核心業務與學習狀態表                                    │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 各子專案架構詳細剖析

### 3.1 前端網頁（cool_learning/）

- **技術選型**：原生 HTML5 + JavaScript (ES6+) + CSS3 + Tailwind CSS (CLI 建置) + Nginx 1.27 Alpine。
- **核心設計策略**：
  - **拒絕肥大 SPA 打包**：保持原生 HTML/JS 輕量高效、零依賴冷啟動的優勢，每個學科頁面各司其職。
  - **Tailwind CSS 靜態編譯**：淘汰舊版 `cdn.tailwindcss.com` 瀏覽器端即時編譯，改由 Docker multi-stage build 產出約 30 KB 的 minified CSS，徹底解決首頁渲染閃爍 (FOUC) 與瀏覽器負擔。
  - **PWA 支援**：配置 `manifest.webmanifest` 與 `sw.js`，支援添加到手機桌面為獨立 App。
  - **單一設定來源**：`assets/js/config.js` 統一定義 `API_BASE_URL`，方便切換本機測試與正式 NAS 環境。

#### 目錄檔案清單：
| 檔案/資料夾 | 職責說明 |
| :--- | :--- |
| `index.html` | 首頁大廳、學科選擇、學生密碼登入、管理員後台、數據儀表板 |
| `english.html` | 英文科：3D 漫畫字卡、TTS 朗讀、星號難字收藏、拼字/測驗模式 |
| `math.html` | 數學科：單元題目演練、即時答題計算、成績反饋 |
| `nature.html` | 自然科：版本/章節切換、每日 20 題、學習日曆與錯題本檢視 |
| `assets/js/config.js` | 全站全域設定檔（API Endpoint） |
| `assets/js/app.js` | 英語學習業務邏輯、字卡翻轉、進度保存、登入對話框 |
| `assets/js/quiz.js` | 英語科測驗評量核心演算法（聽力、選擇、拼字） |
| `assets/js/nature.js` | 自然科 115 課綱題庫、三大版本題目解析、作答狀態機 |
| `assets/js/admin.js` | 管理者操作介面邏輯、單字庫 CRUD、座號名冊與歷程 |
| `tailwind.config.js` | Tailwind 延伸色階 (brand-50~700) 與粗黑漫畫風陰影 (`comic-lg`) |
| `Dockerfile` | Multi-stage 建置 (Node 20 編譯 CSS -> Nginx Alpine 服務靜態檔) |

---

### 3.2 後端 API 服務（cool_learning_backend/）

- **技術選型**：Node.js 20 + Express 4.18 + `mysql2/promise` 連線池 + `google-auth-library` + `googleapis` + `jose` (JWT/JWS)。
- **核心架構特點**：
  - **高模組化 Factory Function 設計**：`server.js` 僅負責載入中介層與路由掛載，所有路由子模組以「工廠函式」形式依賴注入 (Dependency Injection)，便於單元測試與解耦。
  - **企業級資安機制**：
    - 學生與家長登入皆具備「防暴力破解鎖定」（連續錯誤 5 次鎖定 15 分鐘）。
    - 密碼採用 `crypto.pbkdf2Sync` (10,000 次疊代、64 位元鹽值、sha512)，避免純文字存儲。
    - 權限驗證中介層：`requireAuth`、`requireAdmin`、`requireOwnSeat`、`requireGuardianRole`，嚴格防止越權存取他人學習記錄。
  - **自動化測試把關**：`npm test` 涵蓋 4 大單元測試套件（自然科題目抽取、密碼防護、家長權限與 Google Play 簽章驗證）。

#### 後端目錄與模組職責：
```
cool_learning_backend/
├── lib/
│   ├── db.js                 # 連線池與自動建表/Migration 邏輯
│   ├── oauthVerify.js        # Google ID Token 與 Apple JWS 驗證
│   └── googlePlayVerify.js   # Google Play API 訂閱狀態確認與 Pub/Sub 簽章檢驗
├── middleware/
│   └── auth.js               # JWT 簽發/驗證、密碼雜湊、常數時間比較、登入鎖定
├── routes/
│   ├── health.js             # GET /api/health (容器健康、DB 連線、版本號)
│   ├── studentAuth.js        # POST /api/login, /api/student/setup-password
│   ├── admin.js              # /api/admin/* (題庫 CRUD、座號名冊、數據統計)
│   ├── guardian.js           # /api/guardian/* (家長註冊/登入/OAuth/子女管理/訂閱)
│   ├── webhooks.js           # POST /api/webhooks/google-subscription, apple-subscription
│   ├── english.js            # 每日 30 字分級抽取 (13/12/5)、進度存檔、打卡日曆
│   ├── math.js               # 數學作答日誌與成果提交
│   ├── nature.js             # 自然科 20 題抽取、多回合紀錄、錯題本掌握
│   └── misc.js               # 輔助與系統配置 API
├── ops/
│   ├── provision-app-db-user.sql # 最小權限 DB 帳號建立腳本
│   └── smoke-test.sh         # 部署後自動化線上冒煙測試腳本
├── tests/                    # 4 套自動化測試腳本
├── compose.yaml              # Docker Compose 定義檔
├── deploy-nas.sh             # NAS 自動部署進入點
└── deploy-nas-cicd.sh        # NAS CI/CD 更新、驗證與自動回滾腳本
```

---

### 3.3 行動端 App（cool_learning_app/）

- **技術選型**：React Native 0.75.4 + TypeScript 5.9.3 + `@react-navigation` + `react-native-iap` + `@react-native-google-signin`。
- **定位**：商用 B2C 家長端專用 App，負責會員登入、子女檔案管理與雙平台應用程式內購（IAP）訂閱方案。
- **目前進度狀態**：
  - **核心業務邏輯 100% 完成**：包括 API 客戶端封裝 (`src/api/client.ts`)、權限狀態管理 (`AuthContext.tsx`)、Google Sign-In 串接、IAP 商品購買與收據驗證流程。
  - **型別檢查完全通過**：`npm run typecheck` 達到 0 error。
  - **目前策略**：先攻 Google Play 商店（Apple Store 程式碼已預留但目前註解暫緩）。
  - **尚未包含**：原生專案目錄 (`android/` / `ios/`)，需在具備 Android SDK / Xcode 的環境執行 `react-native init` 產出原生外殼後匯入使用。

---

### 3.4 CI/CD 與 Synology NAS 部署架構

專案具備完整且符合安全規範的自動化部署管線：

1. **GitHub Actions (`.github/workflows/publish-containers.yml`)**：
   - 觸發條件：`push` 到 `main` 分支（針對 `cool_learning/**`、`cool_learning_backend/**`）。
   - **測試關卡 (Test Job)**：先在 Ubuntu 環境執行 `npm test`，若有任一測試失敗立即中斷發布。
   - **建置發布 (Publish Job)**：
     - 使用 Docker Buildx 建置前端與後端容器。
     - **鎖定 `linux/amd64` 架構**：避免 NAS (DS423+ x86_64) 在 QEMU 跨架構建置時崩潰。
     - 自動推送到 GitHub Container Registry (`ghcr.io/ryantwn/web-coding-*`)。
2. **Synology NAS 安全更新 (Pull Model)**：
   - **零暴露面設計**：關閉 GitHub Actions 對 NAS 的 SSH 直連推送，改由 NAS 內部「工作排程器」每 5 分鐘自動執行 `deploy-nas.sh`。
   - **智慧檢查**：比對映像 SHA，只有在 GHCR 有新版映像時才重啟容器。
   - **前端靜態同步**：容器啟動後自動透過 `rsync` 將最新前端檔案同步到 Synology Web Station 目錄 (`/volume1/web/cool_learning/`)。
   - **健康檢查與自動回滾**：部署後自動檢測 `/api/health`，若異常則立即回滾至 `.last-successful-image-tag`。
   - **線上冒煙測試 (`ops/smoke-test.sh`)**：可一鍵線上驗證生產環境健康度、未授權防護與 Webhook 端點正確性。

---

## 4. 資料庫設計與關聯結構

資料庫採用 MariaDB / MySQL，全庫字符集統整為 `utf8mb4_unicode_ci`，核心資料表架構如下：

```
[guardians 家長表]
  ├── id (PK)
  ├── email, password_hash
  ├── apple_sub, google_sub
  ├── failed_login_attempts, locked_until
  │
  ├── 1:N ──> [child_profiles 子女檔案表]
  │             ├── id (PK)
  │             ├── guardian_id (FK)
  │             ├── nickname, grade_level
  │             └── linked_seat_no (5碼虛擬座號，映射至 students.seat_no)
  │
  └── 1:N ──> [subscriptions 訂閱紀錄表]
                ├── id (PK), guardian_id (FK)
                ├── platform ('apple' | 'google'), product_id, purchase_token
                ├── status ('trial' | 'active' | 'expired' | 'canceled'...)
                └── expires_at

[students 學生主表]
  ├── seat_no (PK, 5碼座號)
  ├── name, password_hash
  ├── failed_login_attempts, locked_until
  │
  ├── 1:N ──> [english_daily_assignments 每日單字分配] (seat_no, learning_date, word_id)
  ├── 1:1 ──> [english_daily_progress 每日單字學習進度]
  ├── 1:N ──> [quiz_logs 英文測驗紀錄]
  ├── 1:1 ──> [student_math_state 數學當日作答狀態] (seat_no, learning_date, attempt_no, wrong_questions_json)
  ├── 1:N ──> [math_quiz_logs 數學測驗紀錄] (seat_no, learning_date, attempt_no, score)
  ├── 1:N ──> [math_wrong_questions 數學錯題本與掌握度] (seat_no, question_id, wrong_count, mastered)
  ├── 1:N ──> [nature_daily_progress 自然每日測驗與回合] (seat_no, learning_date, attempt_no)
  └── 1:N ──> [nature_wrong_questions 自然錯題本與掌握度] (seat_no, question_id, mastered)

[words_pool 單字庫]
  ├── id (PK)
  ├── vocabulary, phonetic, chinese, sentence, translate
  ├── level (1: 初階, 2: 中階, 3: 高階)
  └── learning_enabled (1: 啟用抽取, 0: 暫停抽取)
```

---

## 5. 歷史版本演進與開發進度時間軸

| 階段 | 時間節點 | 關鍵提交 / 功能重點 | 狀態 |
| :--- | :--- | :--- | :---: |
| **Phase 1: 專案創立與基礎建設** | 2026-08-05 ~ 08-07 | • 建立專案結構、英文學習單字卡翻轉、發音 TTS<br>• 建立 Synology NAS Docker Compose 部署架構與 GHCR 自動發布<br>• 雲端學習進度同步與初期測驗模組 | 已完成 |
| **Phase 2: 題庫分級與營運後台** | 2026-08-08 ~ 08-09 | • 英文 30 字抽取最佳化（13:12:5 初中高階配比演算法）<br>• 建立完整管理後台 (admin.js)，支援單字 CRUD 與音標修正<br>• 引入單字庫學習開關 (`learning_enabled`) 與字庫批量滾動 | 已完成 |
| **Phase 3: 自然學科與功能擴充** | 2026-08-11 | • 新增自然科 115 課綱學習（康軒/南一/翰林三大版本）<br>• 每日 20 題練習機制與支援單日多次測驗 (`attempt_no`)<br>• 建立自然科錯題本追蹤系統 (`nature_wrong_questions`) | 已完成 |
| **Phase 4: 系統大重構與安全升級** | 2026-08-12 ~ 08-23 | • 學生密碼驗證與防暴破鎖定機制 (5 次錯鎖 15 分鐘)<br>• B2C 家長帳號系統 (Email/Google/Apple 雙重登入)<br>• 最小權限專用 DB 帳號 (`cool_learning_app`)，禁用 root 連線<br>• 後端架構模組化重構 (`server.js` 工廠函式化)<br>• 導入 Tailwind CLI 正式編譯，淘汰 CDN 動態編譯 | 已完成 |
| **Phase 5: 行動 App 與健全度工程** | 2026-08-26 ~ 09-03 | • NAS 部署改採安全內部 Pull 模式，避免對外暴露 SSH<br>• 映像架構鎖定 amd64，消弭 Synology DS423+ 崩潰風險<br>• 建立 React Native TypeScript 家長與訂閱 App 骨架 (`cool_learning_app`)<br>• 實作部署後自動化線上冒煙測試腳本 (`smoke-test.sh`) | 已完成 |
| **Phase 6: 數學天地完整重構與 NAS 自動化部署 Skill** | 2026-09-04 | • 擴充小六數學 11 大核心單元，實作 110 組互不重複獨立產生器<br>• 導入題型洗牌分派與題幹文字/數值簽章雙重去重演算法（500+ 回合壓力測試 0 重複）<br>• 兩次機會防挫折流程（初次提示、二次步驟詳解）與分數/小數數值等價判定<br>• 建立 `math_wrong_questions` 錯題追蹤表與單日多回合 `attempt_no` 機制<br>• 打造 `nas-auto-deploy` 專屬 Skill 與一鍵自動化部署流水線腳本 (`nas-deploy-pipeline.ps1`) | **目前進度** (最新已就緒) |

---

## 6. 功能完成度檢核表 (Feature Matrix)

| 模組 | 子功能 | 完成度 | 說明 |
| :--- | :--- | :---: | :--- |
| **英語天地** | 每日 30 字抽取演算法 (13/12/5) | 100% | 支援跨日防偷跑、過去補課機制 |
| | 3D 字卡 / 發音 / 星號收藏 | 100% | 翻轉順暢，漫畫風格樣式完成 |
| | 拼字 / 聽力 / 選擇測驗 | 100% | 計分與提交至 `quiz_logs` 正常 |
| **自然科學** | 三大版本切換 (康軒/南一/翰林) | 100% | 題庫與章節對照完整 |
| | 每日 20 題練習與多回合紀錄 | 100% | 支援 `attempt_no` 累積 |
| | 錯題本與掌握度標記 | 100% | 錯題收錄與再次答對自動掌握 |
| **數學天地** | 課綱題庫與 110 組多樣產生器 | 100% | 涵蓋小六 11 大核心單元，每單元 10 組獨立題型產生器 |
| | 題型洗牌與防重去重演算法 | 100% | 同輪測驗題型完全不同，題目文字與數值 0 重複 |
| | 兩次防挫折與步驟推導詳解 | 100% | 初次答錯給予小提示，二次答錯展示完整步驟推導 |
| | 數值與分數等價自動容錯 | 100% | 支援 1/2、2/4、0.5 等等價判定與快速輸入工具列 |
| | 錯題本與熟練掌握機制 | 100% | 專屬 `math_wrong_questions` 表，複習答對自動精熟 |
| | 學習日曆與多回合歷程 | 100% | 支援 `attempt_no` 紀錄與月曆題目數/總得分看板 |
| **身分與安全** | 學生座號密碼登入與鎖定 | 100% | 連續錯 5 次鎖定 15 分鐘 |
| | B2C 家長 Email + 密碼註冊登入 | 100% | 驗證與 JWT 簽發就緒 |
| | Google Sign-In & Apple OAuth | 90% | 後端驗證代碼就緒，待填入線上 Client ID |
| | 最小權限資料庫存取 | 100% | 腳本與 `.env` 配置規範已完成 |
| **商用付費** | 雙平台訂閱資料模型與 Webhooks | 90% | Pub/Sub 與收據驗證代碼就緒，待線上金鑰 |
| | React Native 家長端 App 商業邏輯 | 85% | TS 0 error，待在原生機器執行 `init` 產出殼 |
| **運維部署** | Docker Multi-stage 建置 (Tailwind CLI) | 100% | 產生 30KB minified 靜態 CSS |
| | GitHub Actions CI 自動測試 (5組套件) | 100% | 涵蓋英語、自然、數學去重、認證與 Google Play 驗證 |
| | NAS 排程自動 Pull 更新與自動回滾 | 100% | DS423+ amd64 最優化，安全無對外 SSH |
| | 部署後冒煙測試 (Smoke Test) | 100% | `ops/smoke-test.sh` 一鍵線上檢測 |
| | `nas-auto-deploy` 專用部署技能 | 100% | 整合 Git Push、CI/CD 監控、SSH 呼叫 NAS 與健康檢查 |

---

## 7. 安全防護與效能設計亮點

1. **零攻擊面 NAS 自動更新 (Zero Attack Surface)**：
   傳統 CI/CD 往往需要在 Synology NAS 開放對外 SSH 連接埠，極易成為網際網路自動化攻擊的標靶。本專案將 GitHub Actions 限制為僅推送映像至 GHCR，NAS 端則使用內部每 5 分鐘執行的工作排程主動「向外 Pull」，徹底關閉外部 SSH 入侵途徑。
2. **最小權限資料庫原則 (Principle of Least Privilege)**：
   後端捨棄直接使用 `root` 帳號，設計了專屬的 `cool_learning_app` 帳號，僅授權其在 `cool_learning` 單一資料庫內進行必要的 CRUD 與結構變更操作，杜絕全域提權或跨庫竄改風險。
3. **時序攻擊防範 (Timing-Safe Equality)**：
   管理員密碼驗證使用 `crypto.timingSafeEqual`，避免攻擊者利用字串比對的時間差推測雜湊值。
4. **暴力破解鎖定 (Brute-Force Rate Limiting)**：
   針對學生與家長帳號，密碼輸入錯誤達 5 次即啟動 15 分鐘冷卻鎖定，有效防堵自動化字典檔攻擊。
5. **高效前端載入**：
   Tailwind CSS 由 Docker 建置階段預先掃描全站字串並產生最佳化靜態 CSS，配合 Nginx Cache-Control 策略與 PWA 服務工作線程，實現行動裝置秒開體驗。

---

## 8. 後續規劃與待辦建議事項 (Next Steps)

### 短期優先事項（上架 Google Play 前）
1. **產生 React Native 原生 Android 專案外殼**：
   在安裝有 Android Studio 與 Android SDK 的本機環境執行：
   ```sh
   npx @react-native-community/cli init CoolLearningApp --template react-native-template-typescript
   ```
   將目前的 `cool_learning_app/src/` 與 `App.tsx`、`package.json` 整合進去，生成 `android/` 目錄。
2. **申請並配置 Google 服務憑證**：
   - 在 Google Cloud Console 建立 OAuth 2.0 Web Client ID 與 Android Client ID，填入後端 `.env` 的 `GOOGLE_CLIENT_ID` 與 App 的 `googleAuth.ts`。
   - 在 Google Play Console 建立訂閱方案，並配置 Google Cloud Pub/Sub 即時通知主題。
3. **清理 App 原始碼中的多餘目錄**：
   `cool_learning_app/src/` 下存在先前因終端機大括號展開未生效而建立的空目錄 `{api,context,screens,services,navigation,types}`，可予以刪除以保持專案整潔。

### 中長期演進
1. **學習畫面行動原生化或 WebView 深度整合**：
   評估將目前的 `cool_learning/` 網頁版（自然/英文/數學）透過 `@react-native-webview` 嵌入 App 中，透過 `postMessage` 傳遞 Token 實現免重複登入的無縫混合架構 (Hybrid App)。
2. **Apple App Store 上架支援**：
   待 Google Play 營運穩定後，再補齊 iOS 原生專案、開啟 `LoginScreen.tsx` 的 Apple 登入按鈕，並接入 App Store Server Library。
