#!/bin/bash
set -euo pipefail

# 啟動 SSH 隧道（預設為：本地 15432 -> 遠端 127.0.0.1:5432）
# 使用方式：
#   ./start_autossh.sh start
#   ./start_autossh.sh stop
#   ./start_autossh.sh status
# 可覆寫參數：
#   SSH_TARGET=server3 LOCAL_PORT=15432 REMOTE_PORT=5432 ./start_autossh.sh start

SSH_TARGET="${SSH_TARGET:-server3}"
LOCAL_PORT="${LOCAL_PORT:-15432}"
REMOTE_HOST="${REMOTE_HOST:-127.0.0.1}"
REMOTE_PORT="${REMOTE_PORT:-5432}"
PID_FILE="${PID_FILE:-.autossh-tunnel.pid}"
LOG_FILE="${LOG_FILE:-.autossh-tunnel.log}"

ACTION="${1:-start}"

ensure_autossh() {
    if ! command -v autossh >/dev/null 2>&1; then
        echo "錯誤: 找不到 autossh，請先安裝（macOS 可用: brew install autossh）"
        exit 1
    fi
}

is_tunnel_running() {
    if [ -f "$PID_FILE" ]; then
        local pid=""
        pid="$(cat "$PID_FILE" 2>/dev/null || true)"
        if [ -n "${pid:-}" ] && kill -0 "$pid" 2>/dev/null; then
            return 0
        fi
    fi
    return 1
}

check_local_port() {
    if lsof -t -i :"$LOCAL_PORT" >/dev/null 2>&1; then
        echo "錯誤: 本地端口 $LOCAL_PORT 已被佔用。"
        echo "建議：改用 LOCAL_PORT=15432（預設）或先釋放該端口。"
        exit 1
    fi
}

start_tunnel() {
    ensure_autossh
    if is_tunnel_running; then
        echo "隧道已在運行中（PID: $(cat "$PID_FILE")）"
        echo "本地: 127.0.0.1:$LOCAL_PORT -> 遠端: $REMOTE_HOST:$REMOTE_PORT ($SSH_TARGET)"
        exit 0
    fi

    check_local_port
    echo "啟動 autossh 隧道..."
    echo "本地: 127.0.0.1:$LOCAL_PORT -> 遠端: $REMOTE_HOST:$REMOTE_PORT ($SSH_TARGET)"

    # -M 0: 關閉 autossh 自己的 loopback 監控，改用 OpenSSH 的 ServerAlive
    # -fNT: 背景執行，不分配 TTY，不執行遠端指令
    # ExitOnForwardFailure: 若端口轉發失敗，立刻退出（避免假啟動）
    AUTOSSH_GATETIME=0 autossh -M 0 -f -N -T \
        -o "ExitOnForwardFailure yes" \
        -o "ServerAliveInterval 10" \
        -o "ServerAliveCountMax 3" \
        -o "StrictHostKeyChecking accept-new" \
        -L "${LOCAL_PORT}:${REMOTE_HOST}:${REMOTE_PORT}" \
        "$SSH_TARGET" >>"$LOG_FILE" 2>&1

    # 透過特徵字串抓到剛啟動的 autossh 進程 PID
    local pid=""
    pid="$(pgrep -f "autossh .* -L ${LOCAL_PORT}:${REMOTE_HOST}:${REMOTE_PORT} .*${SSH_TARGET}" 2>/dev/null | head -n 1 || true)"
    if [ -z "${pid:-}" ]; then
        echo "錯誤: 隧道啟動失敗，請檢查 $LOG_FILE"
        exit 1
    fi
    echo "$pid" >"$PID_FILE"
    echo "✅ 隧道已啟動（PID: ${pid}）"
}

stop_tunnel() {
    if ! is_tunnel_running; then
        echo "隧道未在運行。"
        rm -f "$PID_FILE"
        exit 0
    fi

    local pid=""
    pid="$(cat "$PID_FILE" 2>/dev/null || true)"
    if [ -z "${pid:-}" ]; then
        echo "警告: PID 檔不存在或內容為空，改用埠口檢查。"
        rm -f "$PID_FILE"
        exit 0
    fi
    kill "$pid" 2>/dev/null || true
    sleep 1
    if kill -0 "$pid" 2>/dev/null; then
        kill -9 "$pid" 2>/dev/null || true
    fi
    rm -f "$PID_FILE"
    echo "✅ 隧道已停止。"
}

show_status() {
    if is_tunnel_running; then
        echo "隧道運行中（PID: $(cat "$PID_FILE")）"
    else
        echo "隧道未運行。"
    fi
    echo "配置: 127.0.0.1:$LOCAL_PORT -> $REMOTE_HOST:$REMOTE_PORT ($SSH_TARGET)"
}

case "$ACTION" in
    start)
        start_tunnel
        ;;
    stop)
        stop_tunnel
        ;;
    status)
        show_status
        ;;
    *)
        echo "未知參數: $ACTION"
        echo "用法: $0 {start|stop|status}"
        exit 1
        ;;
esac
