#!/bin/bash
# 確保已經安裝 autossh
if ! command -v autossh &> /dev/null; then
    echo "Installing autossh via Homebrew..."
    brew install autossh
fi

echo "Starting autossh tunnel to server3..."
# 使用 autossh 建立穩定的轉發隧道
# -M 0: 關閉 autossh 舊版的 loopback 監控，改用 OpenSSH 內建的 ServerAlive
# -f: 背景執行
# -N: 不執行遠端指令（僅用於端口轉發）
# -T: 不分配 TTY
# -L 5432:127.0.0.1:5432: 將本地的 5432 轉發到遠端的 5432
# -o "ServerAliveInterval 10": 每 10 秒發送心跳
# -o "ServerAliveCountMax 3": 3 次心跳失敗就斷開並讓 autossh 重連
autossh -M 0 -f -N -T -L 5432:127.0.0.1:5432 -o "ServerAliveInterval 10" -o "ServerAliveCountMax 3" server3

echo "Tunnel started in background!"
