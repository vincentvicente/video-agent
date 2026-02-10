# 🚀 Video RAG Agent - 完整配置指南

## 方式1: 在Claude Code中使用（当前方式）✅

您现在就在Claude Code中！可以直接使用所有功能。

### 快速测试命令
```bash
cd /Users/vicentezhu/claude-workspace

# 测试1: 验证系统状态
node verify-api-key.js

# 测试2: 处理真实视频（下一步）
node test-real-video.js
```

---

## 方式2: 配置Claude Desktop使用MCP服务器

### 步骤1: 创建配置文件

创建或编辑文件：
```bash
~/Library/Application Support/Claude/claude_desktop_config.json
```

添加以下配置：
```json
{
  "mcpServers": {
    "video-processor": {
      "command": "node",
      "args": ["/Users/vicentezhu/claude-workspace/mcp-servers/video-processor/index.js"],
      "env": {
        "OPENAI_API_KEY": "您的API密钥",
        "VIDEOS_DIR": "/Users/vicentezhu/claude-workspace/data/videos",
        "AUDIO_DIR": "/Users/vicentezhu/claude-workspace/data/audio",
        "TRANSCRIPTS_DIR": "/Users/vicentezhu/claude-workspace/data/transcripts",
        "WHISPER_MODEL_SIZE": "base"
      }
    },
    "text-chunker": {
      "command": "node",
      "args": ["/Users/vicentezhu/claude-workspace/mcp-servers/text-chunker/index.js"]
    },
    "vector-db": {
      "command": "node",
      "args": ["/Users/vicentezhu/claude-workspace/mcp-servers/vector-db/index.js"],
      "env": {
        "OPENAI_API_KEY": "您的API密钥",
        "EMBEDDINGS_DIR": "/Users/vicentezhu/claude-workspace/data/embeddings"
      }
    }
  }
}
```

### 步骤2: 重启Claude Desktop

配置文件保存后，重启Claude Desktop应用。

### 步骤3: 验证MCP工具

在Claude Desktop中，您应该能看到以下工具：
- download_video
- extract_audio
- transcribe_audio
- process_video
- chunk_text
- create_embeddings
- semantic_search
- ...等共16个工具

---

## 方式3: 命令行直接使用（最简单）

### 安装依赖
```bash
cd /Users/vicentezhu/claude-workspace
npm install
```

### 使用示例脚本

#### 1. 处理YouTube视频
```bash
node test-real-video.js
```

#### 2. 仅转录音频
```bash
# 激活Python环境并转录
source whisper-env/bin/activate
python3 whisper-local.py "audio.wav" null base vtt
```

#### 3. 生成向量并搜索
```bash
node demo-embeddings.js
```

---

## 📋 当前项目位置

```
项目根目录: /Users/vicentezhu/claude-workspace/

核心文件:
├── .env                          # API密钥配置
├── whisper-env/                  # Python虚拟环境
├── whisper-local.py             # 本地Whisper脚本
├── run-whisper.sh               # Whisper启动脚本
│
├── mcp-servers/                 # MCP服务器
│   ├── video-processor/         # 视频处理服务器
│   ├── text-chunker/            # 文本分块服务器
│   └── vector-db/               # 向量数据库服务器
│
├── skills/                      # 用户技能
│   ├── download.js
│   ├── transcribe.js
│   └── search.js
│
└── data/                        # 数据目录
    ├── videos/                  # 下载的视频
    ├── audio/                   # 提取的音频
    ├── transcripts/             # 转录文本
    └── embeddings/              # 向量数据库
```

---

## 🧪 测试脚本

### 系统验证
```bash
# API密钥验证
node verify-api-key.js

# 混合方案测试
node test-hybrid-solution.js

# MCP服务器测试
node test-video-processor-mcp.js
```

### 真实视频测试
```bash
# 将在下一步创建
node test-real-video.js
```

---

## 💡 使用建议

### 开发环境（当前）
- ✅ **推荐**: 在Claude Code中直接使用
- 优点: 即开即用，无需额外配置
- 适合: 开发、测试、自动化脚本

### 生产环境
- 📱 **可选**: 配置Claude Desktop
- 优点: 图形界面，对话式交互
- 适合: 日常使用，非技术用户

### 服务器部署
- 🖥️ **高级**: 部署为独立服务
- 优点: API访问，批量处理
- 适合: 大规模视频处理

---

## 🔧 环境变量说明

在 `.env` 文件中配置：

```bash
# OpenAI API密钥（必需 - 用于embeddings）
OPENAI_API_KEY=sk-proj-...

# Whisper模型大小（可选，默认base）
WHISPER_MODEL_SIZE=base  # tiny, base, small, medium, large

# 数据目录（可选，有默认值）
VIDEOS_DIR=/Users/vicentezhu/claude-workspace/data/videos
AUDIO_DIR=/Users/vicentezhu/claude-workspace/data/audio
TRANSCRIPTS_DIR=/Users/vicentezhu/claude-workspace/data/transcripts
EMBEDDINGS_DIR=/Users/vicentezhu/claude-workspace/data/embeddings
```

---

## ⚡️ 快速命令参考

### 激活Python环境
```bash
source /Users/vicentezhu/claude-workspace/whisper-env/bin/activate
```

### 本地转录
```bash
./run-whisper.sh "audio.wav" "en" "base" "vtt"
```

### 运行MCP服务器
```bash
# 视频处理服务器
node mcp-servers/video-processor/index.js

# 文本分块服务器
node mcp-servers/text-chunker/index.js

# 向量数据库服务器
node mcp-servers/vector-db/index.js
```

---

## 📞 获取帮助

### 查看文档
- `DEPLOYMENT_STATUS.md` - 系统状态和使用指南
- `TEST_RESULTS.md` - 测试报告
- `README.md` - 项目概述

### 检查日志
```bash
# 查看MCP服务器输出
# 错误信息会输出到stderr

# 查看Python环境
source whisper-env/bin/activate
pip list | grep whisper
```

### 常见问题

**Q: 如何更换Whisper模型？**
```bash
# 在.env中修改
WHISPER_MODEL_SIZE=small
```

**Q: 如何检查OpenAI额度？**
```bash
node verify-api-key.js
# 或访问: https://platform.openai.com/usage
```

**Q: 转录速度太慢？**
```bash
# 使用更小的模型
WHISPER_MODEL_SIZE=tiny
```

**Q: 内存不足？**
```bash
# 使用tiny或base模型
# medium和large需要较多内存
```

---

## 🎯 下一步

1. ✅ 阅读本指南
2. ▶️ 运行真实视频测试（下一步）
3. 📱 （可选）配置Claude Desktop
4. 🚀 开始处理您的视频库！
