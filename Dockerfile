FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install yt-dlp globally
RUN python3 -m pip install --break-system-packages yt-dlp

# Install Node dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Setup Whisper virtual environment
RUN python3 -m venv /app/whisper-env && \
    /app/whisper-env/bin/pip install --no-cache-dir openai-whisper

# Pre-download base model
RUN /app/whisper-env/bin/python3 -c "import whisper; whisper.load_model('base')"

# Copy application
COPY . .

# Ensure data directory exists
RUN mkdir -p /app/data/users

# Update whisper script to use Docker venv path
RUN sed -i 's|VENV_DIR="$SCRIPT_DIR/whisper-env"|VENV_DIR="/app/whisper-env"|' /app/run-whisper.sh && \
    chmod +x /app/run-whisper.sh

EXPOSE 3000

CMD ["node", "knowledge-base-ui/server.js"]
