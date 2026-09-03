---
name: nas-auto-deploy
description: >-
  自動化完成「Git Push -> GitHub Actions CI/CD 建置監控 -> 呼叫 Synology NAS 主動 Pull 最新映像 -> 線上健康驗證」的完整部署流程。
  每當使用者要求「部署到 NAS」、「更新到正式機」、「push 並部署」或「發布最新版本」時啟用此 Skill。
---

# NAS 自動化部署技能 (nas-auto-deploy)

本技能提供一站式自動化部署工作流，專為採用 **Pull Model（安全內部拉取）** 架構的 Synology NAS 生產環境設計。

---

## 🎯 觸發時機 (Triggers)
當使用者提出以下或類似請求時自動觸發：
- 「部署到 NAS」
- 「把最新修改發布上線」
- 「確認 CI/CD 完成後呼叫 NAS 更新」
- 「檢查並更新正式站台」

---

## 🛠️ 執行前檢查與設定 (Prerequisites)

### 1. 內網免密碼 SSH 連線設定（只需設定一次）
本機（開發機）與 Synology NAS 位於同一個區域網路（預設 NAS IP 為 `192.168.173.200`，Port `22`）。
若尚未設定免密碼登入，請依下列步驟將本機公鑰加入 NAS：
1. 本機公鑰位置：`~/.ssh/id_ed25519.pub`
   - 公鑰內容：`ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBaa2mgPf5hkwvOaR3SkPK262Phr13C53c4gkM3mVugB codex-nas`
2. 在 NAS 的使用者家目錄建立 `.ssh` 資料夾並追加公鑰：
   ```bash
   ssh <NAS使用者>@192.168.173.200 "mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBaa2mgPf5hkwvOaR3SkPK262Phr13C53c4gkM3mVugB codex-nas' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
   ```
3. 設定 sudo 免密碼執行部署腳本（可選，若要在腳本中自動提升權限）：
   在 NAS 上以 root 權限編輯 `/etc/sudoers.d/cool_learning`：
   ```text
   <NAS使用者> ALL=(ALL) NOPASSWD: /volume1/docker/cool_learning_backend/deploy-nas.sh, /volume1/docker/cool_learning_backend/deploy-nas-cicd.sh
   ```

---

## 📋 完整自動化執行步驟 (Workflow)

### 步驟 1：確認本地程式碼狀態與推送
1. 執行 `git status` 確認所有變更已 commit。
2. 執行 `git push origin main`。
3. 取得當前提交的 Commit SHA：
   ```powershell
   $currentCommit = (git rev-parse HEAD).Trim()
   ```

### 步驟 2：監控 GitHub Actions 容器建置
1. 使用 `gh run list --commit $currentCommit --limit 1` 查詢對應的工作流程。
2. 輪詢直到 `status` 為 `completed` 且 `conclusion` 為 `success`。
3. 若失敗，立即擷取 job log 並向使用者回報錯誤原因。

### 步驟 3：呼叫 NAS 執行主動 Pull
1. 透過 PowerShell 執行本機已備妥之自動化部署管道腳本：
   ```powershell
   powershell.exe -ExecutionPolicy Bypass -File "cool_learning_backend/ops/nas-deploy-pipeline.ps1" -SkipPush -SkipCiWait
   ```
   或直接執行遠端 SSH 指令：
   ```powershell
   ssh -p 22 -o BatchMode=yes -o StrictHostKeyChecking=accept-new <NAS使用者>@192.168.173.200 "sudo /volume1/docker/cool_learning_backend/deploy-nas.sh"
   ```
2. 遠端腳本將自動：
   - 拉取最新 `ghcr.io/ryantwn/web-coding-backend:latest` 與 `web-coding-frontend:latest`。
   - 重新啟動 Docker 容器。
   - 自動同步前端靜態檔案至 Synology Web Station (`/volume1/web/cool_learning/`)。

### 步驟 4：線上冒煙測試與健康狀態驗證
1. 輪詢檢查公開健康檢查端點：
   ```powershell
   curl.exe -s https://learning.ifit.myds.me:4061/api/health
   ```
2. 確認回傳 JSON 之 `version` 欄位已切換為最新 Commit SHA，且 `database` 顯示 `connected`。
3. 輸出部署成功摘要與各項服務運行狀態。
