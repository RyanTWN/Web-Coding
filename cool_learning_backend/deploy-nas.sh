#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$SCRIPT_DIR"

if docker compose version >/dev/null 2>&1; then
  compose() { docker compose "$@"; }
elif command -v docker-compose >/dev/null 2>&1; then
  compose() { docker-compose "$@"; }
else
  echo "找不到 Docker Compose。請先安裝或啟用 Synology Container Manager。" >&2
  exit 1
fi

echo "[1/4] 拉取 GitHub Container Registry 最新映像"
compose pull cool-learning-web cool-learning-api

echo "[2/4] 重新建立網站與 API 容器"
compose up -d cool-learning-web cool-learning-api

echo "[3/4] 等待健康檢查"
attempt=1
while [ "$attempt" -le 18 ]; do
  if docker exec cool-learning-api node -e \
       "fetch('http://localhost:4060/api/health').then(async r=>{console.log(await r.text());if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))" \
       >/tmp/cool-learning-health.json 2>/dev/null && \
     docker exec cool-learning-web wget -q --spider http://localhost/english.html; then
    break
  fi
  if [ "$attempt" -eq 18 ]; then
    echo "部署後健康檢查失敗，請執行 docker compose logs --tail=100。" >&2
    exit 1
  fi
  attempt=$((attempt + 1))
  sleep 5
done

echo "[4/4] 部署完成"
cat /tmp/cool-learning-health.json
echo
compose ps
