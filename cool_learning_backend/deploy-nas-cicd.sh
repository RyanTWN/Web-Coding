#!/bin/sh
set -eu

PATH="/usr/local/bin:/var/packages/ContainerManager/target/usr/bin:$PATH"
export PATH

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$SCRIPT_DIR"

if [ "$(id -u)" -ne 0 ]; then
    exec sudo -n "$0" "$@"
fi

COMPOSE_PROJECT_NAME=cool_learning
export COMPOSE_PROJECT_NAME

if docker compose version >/dev/null 2>&1; then
    compose() { docker compose "$@"; }
elif command -v docker-compose >/dev/null 2>&1; then
    compose() { docker-compose "$@"; }
else
    echo "Docker Compose is required (Synology Container Manager)." >&2
    exit 1
fi

TARGET_TAG=${1:-${IMAGE_TAG:-latest}}
STATE_FILE=.last-successful-image-tag
PREVIOUS_TAG=
if [ -f "$STATE_FILE" ]; then
    PREVIOUS_TAG=$(sed -n '1p' "$STATE_FILE" | tr -d '\r\n')
fi
if [ -z "$PREVIOUS_TAG" ] && docker container inspect cool-learning-api >/dev/null 2>&1; then
    previous_image=$(docker container inspect --format '{{.Config.Image}}' cool-learning-api 2>/dev/null || true)
    case "$previous_image" in
        *:sha-*) PREVIOUS_TAG=${previous_image##*:} ;;
    esac
fi
case "$TARGET_TAG" in
    latest|sha-[0-9a-f][0-9a-f]*) ;;
    *) echo "Invalid image tag: $TARGET_TAG" >&2; exit 2 ;;
esac

WEB_STATION_PATH=$(sed -n 's/^WEB_STATION_PATH=//p' .env | tail -n 1 | tr -d '\r')
case "$WEB_STATION_PATH" in
    /volume*/web/cool_learning) ;;
    *) echo "WEB_STATION_PATH must match /volume*/web/cool_learning" >&2; exit 2 ;;
esac

cleanup() { [ -z "${STAGING_DIR:-}" ] || rm -rf "$STAGING_DIR"; }
trap cleanup EXIT INT TERM

sync_web_station() {
    mkdir -p "$WEB_STATION_PATH"
    STAGING_DIR=$(mktemp -d /tmp/cool-learning-web.XXXXXX)
    docker cp cool-learning-web:/usr/share/nginx/html/. "$STAGING_DIR/"
    if command -v rsync >/dev/null 2>&1; then
        rsync -a --delete "$STAGING_DIR/" "$WEB_STATION_PATH/"
    else
        cp -R "$STAGING_DIR/." "$WEB_STATION_PATH/"
    fi
    rm -rf "$STAGING_DIR"
    STAGING_DIR=
}

health_check() {
    attempt=1
    while [ "$attempt" -le 18 ]; do
        if docker exec cool-learning-web wget -q -O /dev/null http://127.0.0.1/english.html \
            && docker exec cool-learning-api node -e \
                "fetch('http://127.0.0.1:4060/api/health').then(async r=>{const b=await r.json();console.log(JSON.stringify(b));if(!r.ok||b.status!=='ok')process.exit(1)}).catch(e=>{console.error(e.message);process.exit(1)})" \
                > /tmp/cool-learning-health.json 2>/dev/null
        then
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 5
    done
    return 1
}

start_tag() {
    IMAGE_TAG=$1
    export IMAGE_TAG
    compose pull cool-learning-web cool-learning-api
    compose up -d --force-recreate cool-learning-web cool-learning-api
    sync_web_station
}

echo "Deploying image tag: $TARGET_TAG"
start_tag "$TARGET_TAG"
if health_check; then
    printf '%s\n' "$TARGET_TAG" > "$STATE_FILE"
    echo "Deployment healthy: frontend HTTP 200 and backend status=ok"
    cat /tmp/cool-learning-health.json
    compose ps
    exit 0
fi

echo "Health check failed for $TARGET_TAG" >&2
compose logs --tail=100 >&2 || true
if [ -z "$PREVIOUS_TAG" ] || [ "$PREVIOUS_TAG" = "$TARGET_TAG" ]; then
    echo "No distinct previously successful image tag is available for rollback." >&2
    exit 1
fi

echo "Rolling back to: $PREVIOUS_TAG" >&2
start_tag "$PREVIOUS_TAG"
if health_check; then
    echo "Rollback healthy: $PREVIOUS_TAG" >&2
    cat /tmp/cool-learning-health.json
    compose ps
    exit 1
fi

echo "Rollback health check also failed: $PREVIOUS_TAG" >&2
compose logs --tail=100 >&2 || true
exit 1
