# 酷學習自動更新流程

## 架構

每次 `main` 的前端或後端程式有變更時，GitHub Actions 會建立兩個多架構映像：

- `ghcr.io/ryantwn/web-coding-frontend:latest`
- `ghcr.io/ryantwn/web-coding-backend:latest`

NAS 不再從原始碼建置，只需要拉取映像並重新建立容器。

## 第一次設定 NAS

1. 在 NAS 建立部署資料夾，例如 `/volume1/docker/cool-learning`。
2. 將 `compose.yaml`、`deploy-nas.sh` 和 `.env.example` 複製到該資料夾。
3. 將 `.env.example` 改名為 `.env`，填入正確的資料庫設定。
   `AUTH_SECRET` 必須是至少 32 個隨機字元，並請設定管理員帳號、強密碼與正式前端的 `CORS_ORIGINS`。
4. 若 GHCR 套件是 Private，建立只含 `read:packages` 權限的 GitHub Personal Access Token，然後登入：

   ```sh
   echo "$GHCR_TOKEN" | docker login ghcr.io -u RyanTWN --password-stdin
   ```

   登入與工作排程請使用同一個 NAS 帳號（建議由具備 Docker 權限的專用部署帳號執行）。

5. 首次部署：

   ```sh
   chmod 700 deploy-nas.sh
   ./deploy-nas.sh
   ```

6. Synology 反向代理設定：

   - 網站網域轉送到 `http://127.0.0.1:8080`
   - API 的 4061 HTTPS 入口轉送到 `http://127.0.0.1:4060`

## 自動更新

在「控制台 → 工作排程器」建立使用者定義指令碼，建議每 5 分鐘執行：

```sh
/bin/sh /volume1/docker/cool-learning/deploy-nas.sh >> /volume1/docker/cool-learning/deploy.log 2>&1
```

腳本會拉取前後端映像；只有映像有更新時才重建容器，接著確認網站與資料庫健康狀態。

本次加入工作階段驗證後，部署完成時既有瀏覽器工作階段會自動失效，學生與管理員需要重新登入一次。

## 驗證版本

```sh
curl http://127.0.0.1:4060/api/health
```

回應中的 `version` 應等於 GitHub 的完整提交 SHA。

```sh
curl -i http://127.0.0.1:4060/api/student-progress
```

沒有提供座號時應回傳 HTTP 400，而不是 404。

## 回復指定版本

把 `.env` 的 `IMAGE_TAG` 改成先前成功版本：

```text
IMAGE_TAG=sha-完整提交SHA
```

然後重新執行 `deploy-nas.sh`。
