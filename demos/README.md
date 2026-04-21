# Qwen3 Subtitle Recognition Demo

This project demonstrates how to use **Qwen3-ASR** and **Qwen3-ForcedAligner** to automatically generate subtitles from a video file.

## Setup

The project is managed with [uv](https://astral.sh/uv).

1.  Initialize and install dependencies:
    ```bash
    uv sync
    ```

2.  Ensure you have a video file (e.g., `sample.mp4`).

## Usage

Run the demonstration script:

```bash
uv run video_to_subtitles.py path/to/your/video.mp4
```

This will:
1.  Extract audio from the video.
2.  Use **Qwen3-ASR** to transcribe the speech.
3.  Use **Qwen3-ForcedAligner** to get precise word-level timestamps.
4.  Generate an `output.srt` subtitle file.

## Requirements
- Python 3.12
- `torch`, `transformers`, `moviepy`, `qwen-asr`, `librosa`, `soundfile`
- A GPU (MPS on Mac or CUDA on Linux/Windows) is recommended for best performance.
