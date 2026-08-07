#!/bin/sh
exec "$(dirname "$0")/deploy-nas-cicd.sh" "$@"

set -eu

# Synology Container Manager 的 Docker socket 只有 root 可操作。
# 若目前不是 root，則自動透過 sudo 重新執行整份部署腳本。
if [ "$(id -u)" -ne 0 ]; then
    echo "需要 Docker 管理權限，正在透過 sudo 執行..."
    exec sudo "$0" "$@"
fi

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$SCRIPT_DIR"

# 固定 Compose 專案名稱，避免從不同資料夾執行時建立另一組同名容器。
COMPOSE_PROJECT_NAME=cool_learning
export COMPOSE_PROJECT_NAME

# 判斷使用 Docker Compose v2 或舊版 docker-compose
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

# 第一次切換到固定專案名稱時，接管並替換舊專案留下的同名無狀態容器。
for container_name in cool-learning-api cool-learning-web; do
    if docker container inspect "$container_name" >/dev/null 2>&1; then
        existing_project=$(docker container inspect \
            --format '{{ index .Config.Labels "com.docker.compose.project" }}' \
            "$container_name" 2>/dev/null || true)
        if [ "$existing_project" != "$COMPOSE_PROJECT_NAME" ]; then
            echo "移除舊專案容器 $container_name（原專案：${existing_project:-未標記}）"
            docker container rm -f "$container_name" >/dev/null
        fi
    fi
done

compose up -d cool-learning-web cool-learning-api

# 正式網址由 Synology Web Station 的 /cool_learning/ 目錄提供，
# 所以容器更新後也要發布同一版前端檔案到該目錄。
WEB_STATION_PATH=$(sed -n 's/^WEB_STATION_PATH=//p' .env | tail -n 1 | tr -d '\r')
if [ -z "$WEB_STATION_PATH" ]; then
    echo "缺少 WEB_STATION_PATH，無法更新正式 /cool_learning/ 網站。" >&2
    exit 1
fi
case "$WEB_STATION_PATH" in
    /volume*/web/cool_learning) ;;
    *)
        echo "WEB_STATION_PATH 必須指向 /volume*/web/cool_learning，已停止發布。" >&2
        exit 1
        ;;
esac

mkdir -p "$WEB_STATION_PATH"
STAGING_DIR=$(mktemp -d /tmp/cool-learning-web.XXXXXX)
trap 'rm -rf "$STAGING_DIR"' EXIT INT TERM
docker cp cool-learning-web:/usr/share/nginx/html/. "$STAGING_DIR/"

if command -v rsync >/dev/null 2>&1; then
    rsync -a --delete "$STAGING_DIR/" "$WEB_STATION_PATH/"
else
    cp -R "$STAGING_DIR/." "$WEB_STATION_PATH/"
fi
echo "已同步前端至 $WEB_STATION_PATH"

web_station_ok() {
    grep -q 'app.js?v=' "$WEB_STATION_PATH/english.html" \
        && grep -q 'Authorization' "$WEB_STATION_PATH/assets/js/app.js"
}


echo "[3/4] 等待健康檢查"

attempt=1

while [ "$attempt" -le 18 ]; do

    if docker exec cool-learning-api node -e \
        "fetch('http://localhost:4060/api/health').then(async r=>{console.log(await r.text());if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))" \
        >/tmp/cool-learning-health.json 2>/dev/null \
        && docker exec cool-learning-web wget -q --spider http://localhost/english.html \
        && web_station_ok
    then
        break
    fi

    if [ "$attempt" -eq 18 ]; then
        echo "部署後健康檢查失敗。"
        echo
        echo "請檢查以下日誌："
        compose logs --tail=100
        exit 1
    fi

    echo "等待服務啟動... ($attempt/18)"
    attempt=$((attempt + 1))
    sleep 5

done


echo "[4/4] 部署完成"
echo

cat /tmp/cool-learning-health.json
echo

compose ps
