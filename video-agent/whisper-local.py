#!/usr/bin/env python3
"""
Local Whisper Transcription Script
Replaces OpenAI Whisper API with local processing
"""

import whisper
import sys
import json
import os
from pathlib import Path

def transcribe_audio(audio_path, language=None, model_size="base", output_format="vtt"):
    """
    Transcribe audio file using local Whisper model

    Args:
        audio_path: Path to audio file
        language: Language code (e.g., 'en', 'zh', None for auto-detect)
        model_size: Model size (tiny, base, small, medium, large)
        output_format: Output format (vtt, srt, txt, json)

    Returns:
        dict with transcription results
    """

    # Check if file exists
    if not os.path.exists(audio_path):
        return {
            "success": False,
            "error": f"Audio file not found: {audio_path}"
        }

    # Check file size
    file_size = os.path.getsize(audio_path)
    file_size_mb = file_size / (1024 * 1024)

    try:
        # Load model
        print(f"Loading Whisper model: {model_size}", file=sys.stderr)
        model = whisper.load_model(model_size)

        # Transcribe
        print(f"Transcribing: {audio_path} ({file_size_mb:.2f} MB)", file=sys.stderr)
        result = model.transcribe(
            audio_path,
            language=language,
            fp16=False,  # Use FP32 for CPU
            verbose=False
        )

        # Prepare output
        output_dir = os.path.dirname(audio_path)
        base_name = os.path.splitext(os.path.basename(audio_path))[0]

        # Generate output based on format
        if output_format == "vtt":
            output_path = os.path.join(output_dir, f"../transcripts/{base_name}.vtt")
            os.makedirs(os.path.dirname(output_path), exist_ok=True)

            # Write VTT format
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write("WEBVTT\n\n")
                for segment in result['segments']:
                    start = format_timestamp(segment['start'])
                    end = format_timestamp(segment['end'])
                    text = segment['text'].strip()
                    f.write(f"{start} --> {end}\n{text}\n\n")

        elif output_format == "srt":
            output_path = os.path.join(output_dir, f"../transcripts/{base_name}.srt")
            os.makedirs(os.path.dirname(output_path), exist_ok=True)

            # Write SRT format
            with open(output_path, 'w', encoding='utf-8') as f:
                for i, segment in enumerate(result['segments'], 1):
                    start = format_timestamp_srt(segment['start'])
                    end = format_timestamp_srt(segment['end'])
                    text = segment['text'].strip()
                    f.write(f"{i}\n{start} --> {end}\n{text}\n\n")

        elif output_format == "txt":
            output_path = os.path.join(output_dir, f"../transcripts/{base_name}.txt")
            os.makedirs(os.path.dirname(output_path), exist_ok=True)

            # Write plain text
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(result['text'])

        elif output_format == "json":
            output_path = os.path.join(output_dir, f"../transcripts/{base_name}.json")
            os.makedirs(os.path.dirname(output_path), exist_ok=True)

            # Write JSON format
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(result, f, ensure_ascii=False, indent=2)

        # Return success result
        return {
            "success": True,
            "audio_path": audio_path,
            "transcript_path": output_path,
            "format": output_format,
            "language": result.get('language', 'unknown'),
            "duration": result.get('segments', [{}])[-1].get('end', 0) if result.get('segments') else 0,
            "text_preview": result['text'][:200] if result['text'] else "",
            "segments_count": len(result.get('segments', [])),
            "model_used": model_size
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "audio_path": audio_path
        }

def format_timestamp(seconds):
    """Format seconds to VTT timestamp (HH:MM:SS.mmm)"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = seconds % 60
    return f"{hours:02d}:{minutes:02d}:{secs:06.3f}"

def format_timestamp_srt(seconds):
    """Format seconds to SRT timestamp (HH:MM:SS,mmm)"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = seconds % 60
    return f"{hours:02d}:{minutes:02d}:{secs:06.3f}".replace('.', ',')

def main():
    """Command line interface"""
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: python whisper-local.py <audio_path> [language] [model_size] [output_format]"
        }))
        sys.exit(1)

    audio_path = sys.argv[1]
    language = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] != "null" else None
    model_size = sys.argv[3] if len(sys.argv) > 3 else "base"
    output_format = sys.argv[4] if len(sys.argv) > 4 else "vtt"

    result = transcribe_audio(audio_path, language, model_size, output_format)

    # Output result as JSON
    print(json.dumps(result, ensure_ascii=False))

    sys.exit(0 if result["success"] else 1)

if __name__ == "__main__":
    main()
