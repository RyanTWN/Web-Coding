# 酷學習前端（cool_learning）

純 HTML/CSS/JS，透過 Nginx 提供服務，沒有 SPA 打包流程。唯一的建置步驟是把 Tailwind
CSS 編譯成正式檔案（不再使用 `cdn.tailwindcss.com`，原因見下方）。

## 本機開發

```sh
npm install
npm run build:css   # 產生 assets/css/tailwind.css
```

改動任何 HTML/JS 裡用到的 Tailwind class、或改了 `tailwind.config.js` 的主題設定後，
都要重新執行 `npm run build:css`，否則畫面不會反映最新的樣式（這跟以前用 CDN 版、
存檔就即時生效的開發體驗不一樣，是這次改用正式建置流程必然的取捨）。

## 為什麼不再用 `<script src="https://cdn.tailwindcss.com">`

Tailwind 官方文件明確不建議在正式環境使用這個版本：它是在瀏覽器端即時編譯 CSS，
每個訪客的瀏覽器都要重新做一次這件事，而且沒辦法做 tree-shaking，檔案通常比正式建置
後的版本大上好幾倍。現在改用 `tailwindcss` CLI 在建置期間（Docker image build 階段）
就把最終會用到的 class 編譯好、做 minify，瀏覽器只需要下載一份 30 KB 左右的靜態 CSS。

`tailwind.config.js` 的 `content` 欄位涵蓋所有 `*.html` 與 `assets/js/**/*.js`——
部分 class 是 JS 用字串組成 HTML 片段時才出現的（例如管理後台的狀態徽章），
必須讓 Tailwind 掃描得到這些檔案，才不會漏產生對應的 CSS。

## Docker 建置

`Dockerfile` 是 multi-stage build：
1. `build` stage 用 `node:20-alpine` 跑 `npm ci && npm run build:css`。
2. 最終的 `nginx:1.27-alpine` stage 只會拿到編譯好的 `assets/css/tailwind.css`，
   `package.json`、`node_modules`、`tailwind.config.js` 等建置工具都不會進到正式
   image 裡，維持原本單純的靜態檔案服務。

平常透過 CI/CD（`.github/workflows/publish-containers.yml` → NAS 部署腳本）建置時，
這個流程會自動跑，不需要手動介入；只有在本機直接改樣式、想預覽效果時才需要跑
`npm run build:css`。
