# 酷學習 App（RN 骨架：家長帳號登入 + 訂閱付費）

**目前策略：先上 Google Play，Apple Store 之後再說。** 登入畫面目前只有 Email+密碼 +
Google 登入；`src/services/appleAuth.ts` 與 `@invertase/react-native-apple-authentication`
依賴仍保留在專案裡（不影響 Android 建置），但**沒有**接進 `LoginScreen.tsx` 的畫面。之後要
上架 Apple Store 時，把 `LoginScreen.tsx` 裡被註解掉的那段 Apple 按鈕與 import 打開即可，
不需要重寫任何邏輯；後端 `/api/guardian/oauth/apple` 也已經完成、只是還沒有真實
`APPLE_CLIENT_ID` 可以測試。

這個資料夾**不是**完整可執行的 App，而是 B2C 家長帳號登入（Email/密碼 + Google 登入）與
訂閱付費狀態顯示這一塊的 **React Native + TypeScript 程式碼骨架**，用來銜接我們已經完成的
後端 API（`cool_learning_backend`）。既有的英文/數學/自然科學習畫面尚未原生化，仍是
`cool_learning/` 那份網頁版。

## 這裡有什麼

```
src/
  api/client.ts            統一的 API 呼叫封裝（含自動帶 token、401 自動登出）
  context/AuthContext.tsx  管理登入狀態、token 存放（AsyncStorage）、家長/子女檔案切換
  services/appleAuth.ts    Sign in with Apple 原生 SDK 呼叫封裝（含 TODO）
  services/googleAuth.ts   Google Sign-In 原生 SDK 呼叫封裝（含 TODO）
  services/iap.ts          App 內購（StoreKit 2 / Play Billing）封裝（含 TODO）
  screens/LoginScreen.tsx
  screens/RegisterScreen.tsx
  screens/ChildrenScreen.tsx      家長登入後：子女檔案清單、新增子女
  screens/SubscriptionScreen.tsx  訂閱/試用狀態顯示、尚未訂閱時導向購買
  navigation/RootNavigator.tsx
  types/api.ts              對齊後端 API 回傳格式的型別定義
```

## 這裡「還沒有」什麼

### Google Play 上架前必須完成（優先）

1. **實際的原生專案骨架**（`android/` 資料夾，可以先不管 `ios/`）——這必須用
   `npx react-native init` 或 `npx @react-native-community/cli init` 在有 Android
   Studio 的機器上產生，我這邊的沙盒環境無法安裝這些原生工具鏈，只能先把
   TypeScript 的商業邏輯／畫面／API 串接寫好。
2. **Google 登入**：需要在 Google Cloud Console 建立 OAuth 用戶端（Android + Web
   用戶端各一個），拿到的 Web Client ID 要填進後端 `.env` 的 `GOOGLE_CLIENT_ID`，
   Android Client ID 則填進 `src/services/googleAuth.ts` 裡的設定。
3. **App 內購／訂閱商品**：需要在 Google Play Console 建立訂閱商品（例如月費／年費，
   含 7 天免費試用），把 product id 填進 `src/services/iap.ts`（`Platform.select` 的
   `android` 那組），並在後端完成 `/api/webhooks/google-subscription` 的 Pub/Sub
   驗證與 Google Play Developer API 查詢（目前後端只有骨架，詳見
   `cool_learning_backend/server.js` 裡的 TODO 註解）。
4. **Google Play Families 政策合規**：因為是兒童導向內容，上架前要確認資料蒐集揭露
   （Data Safety Form）、廣告/SDK 選用是否符合 Families 政策要求。

### Apple Store 上架時才需要（目前暫緩）

5. **實際的 iOS 原生專案骨架**（`ios/` 資料夾）。
6. **Sign in with Apple**：需要 Apple Developer 帳號 → 在 `Certificates, Identifiers &
   Profiles` 開啟 Sign in with Apple capability → 拿到 Bundle ID 填進後端 `.env` 的
   `APPLE_CLIENT_ID`，並在 Xcode 專案的 `Signing & Capabilities` 加上 `Sign in with
   Apple` capability。程式碼（`src/services/appleAuth.ts`、後端
   `/api/guardian/oauth/apple`）已經寫好，屆時把 `LoginScreen.tsx` 裡註解掉的按鈕打開
   即可，不需要重寫。
7. **App Store 訂閱商品**：在 App Store Connect 建立對應訂閱商品，並完成
   `/api/webhooks/apple-subscription` 的 JWS 簽章驗證（建議用官方
   `@apple/app-store-server-library`）。

## 型別檢查

`npm install && npm run typecheck` 已經實際跑過，對照 `react-native`、
`@react-navigation/*`、`@invertase/react-native-apple-authentication`、
`@react-native-google-signin/google-signin`、`react-native-iap` 等套件的**真實型別定義**
做完整型別檢查，目前 `src/` 底下所有檔案都是 0 error。

不過這只驗證了「TypeScript 邏輯與型別正確」，**不代表這是可以直接執行的完整 App**——
還缺 `ios/`、`android/` 原生專案殼（見上方第 1 點），必須用 `react-native init` 之類的指令
在有 Xcode/Android Studio 的機器上產生之後，把這裡的 `src/`、`App.tsx` 複製進去、
再裝一次完整依賴，才能真正 build 起來跑。
