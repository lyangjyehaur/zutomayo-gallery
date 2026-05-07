#!/bin/bash
set -euo pipefail

# 啟動 SSH 隧道（預設為：本地 15432 -> 遠端 127.0.0.1:5432）
# 使用方式：
#   ./start_autossh.sh start
#   ./start_autossh.sh stop
#   ./start_autossh.sh status
# 可覆寫參數：
#   SSH_TARGET=server3 LOCAL_PORT=15432 REMOTE_PORT=5432 ./start_autossh.sh start
# 進階參數：
#   MONITOR_PORT=20000  autossh loopback 監控端口

SSH_TARGET="${SSH_TARGET:-server3}"
LOCAL_PORT="${LOCAL_PORT:-15432}"
REMOTE_HOST="${REMOTE_HOST:-127.0.0.1}"
REMOTE_PORT="${REMOTE_PORT:-5432}"
MONITOR_PORT="${MONITOR_PORT:-20000}"
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

kill_port_processes() {
    local pids
    pids="$(lsof -t -i :"$LOCAL_PORT" 2>/dev/null || true)"
    if [ -n "$pids" ]; then
        echo "清理佔用本地端口 $LOCAL_PORT 的進程: $pids"
        echo "$pids" | xargs kill 2>/dev/null || true
        sleep 1
        echo "$pids" | xargs kill -9 2>/dev/null || true
    fi
}

cleanup_remote_monitor() {
    echo "清理遠端監控端口 ${MONITOR_PORT} 殘留進程..."
    ssh "$SSH_TARGET" \
        "pids=\$(ss -tlnp 2>/dev/null | grep ':${MONITOR_PORT}' | grep -oP 'pid=\\K[0-9]+' | sort -u); \
         if [ -n \"\$pids\" ]; then echo \"\$pids\" | xargs kill 2>/dev/null || true; fi" \
        2>/dev/null || true
}

check_local_port() {
    if lsof -t -i :"$LOCAL_PORT" >/dev/null 2>&1; then
        echo "錯誤: 本地端口 $LOCAL_PORT 已被佔用。"
        echo "建議：改用其他 LOCAL_PORT 或先執行 $0 stop 釋放該端口。"
        exit 1
    fi
}

start_tunnel() {
    ensure_autossh
    if is_tunnel_running; then
        echo "隧道已在運行中（PID: $(cat "$PID_FILE")）"
        echo "  路徑: 127.0.0.1:$LOCAL_PORT -> $REMOTE_HOST:$REMOTE_PORT ($SSH_TARGET)"
        echo "  監控: loopback 端口 ${MONITOR_PORT}"
        echo "  斷線自動重連: 每 10 秒心跳，3 次失敗後 autossh 重建連線"
        exit 0
    fi

    if lsof -t -i :"$LOCAL_PORT" >/dev/null 2>&1; then
        echo "警告: 本地端口 $LOCAL_PORT 被殘留進程佔用，嘗試清理..."
        kill_port_processes
        sleep 1
    fi

    check_local_port

    cleanup_remote_monitor

    echo "啟動 autossh 隧道..."
    echo "  路徑: 127.0.0.1:$LOCAL_PORT -> $REMOTE_HOST:$REMOTE_PORT ($SSH_TARGET)"
    echo "  心跳: ServerAliveInterval=10s, ServerAliveCountMax=3"
    echo "  監控: -M ${MONITOR_PORT}（loopback 偵測連線健康）"
    echo "  斷線自動重連: 啟用（autossh 偵測到隧道中斷後自動重建）"
    echo "  日誌: $LOG_FILE"

    # -M 20000: loopback 監控，autossh 透過隧道往返偵測連線是否存活
    # -N: 不執行遠端指令
    # -T: 不分配 TTY
    # nohup & disown: 背景執行，PID 用 $! 精確取得
    AUTOSSH_GATETIME=0 \
    AUTOSSH_POLL=60 \
    nohup autossh -M "$MONITOR_PORT" -N -T \
        -o "ExitOnForwardFailure yes" \
        -o "ServerAliveInterval 10" \
        -o "ServerAliveCountMax 3" \
        -o "TCPKeepAlive yes" \
        -o "ConnectTimeout 30" \
        -o "StrictHostKeyChecking accept-new" \
        -L "${LOCAL_PORT}:${REMOTE_HOST}:${REMOTE_PORT}" \
        "$SSH_TARGET" >>"$LOG_FILE" 2>&1 &

    local pid="$!"
    disown "$pid" 2>/dev/null || true

    sleep 2

    if ! kill -0 "$pid" 2>/dev/null; then
        echo "錯誤: 隧道啟動失敗，autossh 進程已退出，請檢查 $LOG_FILE"
        exit 1
    fi

    if ! lsof -t -i :"$LOCAL_PORT" >/dev/null 2>&1; then
        echo "錯誤: 隧道啟動失敗，本地端口 $LOCAL_PORT 未被佔用，請檢查 $LOG_FILE"
        kill "$pid" 2>/dev/null || true
        exit 1
    fi

    echo "$pid" >"$PID_FILE"
    echo "✅ 隧道已啟動（PID: ${pid}）"
    echo "   斷線後 autossh 會自動重連，無需手動重啟"
}

stop_tunnel() {
    local had_pid=false

    if is_tunnel_running; then
        had_pid=true
        local pid=""
        pid="$(cat "$PID_FILE" 2>/dev/null || true)"
        if [ -n "${pid:-}" ]; then
            kill "$pid" 2>/dev/null || true
            sleep 1
            if kill -0 "$pid" 2>/dev/null; then
                kill -9 "$pid" 2>/dev/null || true
            fi
        fi
    fi

    kill_port_processes
    cleanup_remote_monitor

    rm -f "$PID_FILE"

    if $had_pid; then
        echo "✅ 隧道已停止。"
    else
        echo "隧道未在運行（已清理殘留進程）。"
    fi
}

show_status() {
    if is_tunnel_running; then
        local pid
        pid="$(cat "$PID_FILE" 2>/dev/null || true)"
        echo "隧道運行中（PID: ${pid}）"
        echo "  路徑: 127.0.0.1:$LOCAL_PORT -> $REMOTE_HOST:$REMOTE_PORT ($SSH_TARGET)"
        echo "  監控端口: ${MONITOR_PORT}"
        echo "  斷線自動重連: 啟用"
        if lsof -t -i :"$LOCAL_PORT" >/dev/null 2>&1; then
            echo "  端口 $LOCAL_PORT: 已佔用（正常）"
        else
            echo "  端口 $LOCAL_PORT: 未佔用（⚠️ 隧道可能異常）"
        fi
    else
        echo "隧道未運行。"
        if [ -f "$PID_FILE" ]; then
            echo "  （PID 檔存在但進程已死，可能是異常退出）"
        fi
        if lsof -t -i :"$LOCAL_PORT" >/dev/null 2>&1; then
            echo "  ⚠️ 端口 $LOCAL_PORT 仍有進程佔用，建議執行 $0 stop 清理"
        fi
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
