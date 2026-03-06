#!/bin/bash
# Wrapper script to run local Whisper with virtual environment

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
VENV_DIR="$SCRIPT_DIR/whisper-env"

# Use venv python directly (more reliable than source activate)
"$VENV_DIR/bin/python3" "$SCRIPT_DIR/whisper-local.py" "$@"
