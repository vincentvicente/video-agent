#!/bin/bash

# Video RAG Agent - Setup Script

set -e

echo "🚀 Setting up Video RAG Agent System..."
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check Node.js version
echo "📦 Checking Node.js version..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version must be 18 or higher${NC}"
    echo "Current version: $(node -v)"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node -v) detected${NC}"
echo ""

# Check npm
echo "📦 Checking npm..."
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm $(npm -v) detected${NC}"
echo ""

# Navigate to project directory
cd "$(dirname "$0")/.."
PROJECT_DIR=$(pwd)
echo "📁 Project directory: $PROJECT_DIR"
echo ""

# Install dependencies
echo "📥 Installing Node.js dependencies..."
npm install
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Create .env file if not exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please edit .env and add your OPENAI_API_KEY${NC}"
else
    echo -e "${GREEN}✅ .env file already exists${NC}"
fi
echo ""

# Check optional dependencies
echo "🔍 Checking optional dependencies..."

# Check yt-dlp
if command -v yt-dlp &> /dev/null; then
    echo -e "${GREEN}✅ yt-dlp installed: $(yt-dlp --version)${NC}"
else
    echo -e "${YELLOW}⚠️  yt-dlp not found (optional, needed for video download)${NC}"
    echo "   Install: brew install yt-dlp  OR  pip install yt-dlp"
fi

# Check ffmpeg
if command -v ffmpeg &> /dev/null; then
    echo -e "${GREEN}✅ ffmpeg installed: $(ffmpeg -version | head -n1)${NC}"
else
    echo -e "${YELLOW}⚠️  ffmpeg not found (optional, needed for audio extraction)${NC}"
    echo "   Install: brew install ffmpeg"
fi
echo ""

# Create necessary directories
echo "📁 Ensuring data directories exist..."
mkdir -p data/videos data/chunks data/embeddings data/cache/downloads data/cache/metadata
mkdir -p logs/ingest logs/indexing logs/queries
echo -e "${GREEN}✅ Directories created${NC}"
echo ""

# Test MCP configuration
echo "🧪 Testing MCP configuration..."
if [ -f config/mcp-config.json ]; then
    echo -e "${GREEN}✅ MCP configuration found${NC}"
else
    echo -e "${RED}❌ MCP configuration not found${NC}"
    exit 1
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Setup completed successfully!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env and add your OPENAI_API_KEY"
echo "2. (Optional) Install yt-dlp and ffmpeg for video processing"
echo "3. Run: npm test"
echo ""
echo "📚 Documentation: README.md"
echo ""
