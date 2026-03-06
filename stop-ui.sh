#!/bin/bash

# Stop Knowledge Base Web UI

echo "🛑 停止视频知识库 Web 界面..."

# Find and kill the process
PID=$(lsof -ti:3000)

if [ -z "$PID" ]; then
    echo "✅ 服务器未运行"
else
    kill $PID
    echo "✅ 服务器已停止 (PID: $PID)"
fi
