#!/bin/bash

# Start Knowledge Base Web UI

echo "🚀 启动视频知识库 Web 界面..."
echo ""

cd "$(dirname "$0")/knowledge-base-ui"

# Check if server is already running
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  服务器已在运行中"
    echo "🌐 访问: http://localhost:3000"
    echo ""
    echo "如需重启，请先运行: ./stop-ui.sh"
else
    node server.js
fi
