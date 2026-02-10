#!/bin/bash
# Wrapper script to run local Whisper with virtual environment

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
VENV_DIR="$SCRIPT_DIR/whisper-env"

# Activate virtual environment
source "$VENV_DIR/bin/activate"

# Run Python script with all arguments
python3 "$SCRIPT_DIR/whisper-local.py" "$@"
