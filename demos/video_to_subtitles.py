import os
import sys
import torch
import argparse
from moviepy import VideoFileClip
from qwen_asr import Qwen3ASRModel, Qwen3ForcedAligner
import librosa
import soundfile as sf

def extract_audio(video_path, audio_path):
    print(f"Extracting audio from {video_path}...")
    video = VideoFileClip(video_path)
    video.audio.write_audiofile(audio_path, codec='pcm_s16le')
    video.close()

def format_timestamp(seconds):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds * 1000) % 1000)
    return f"{hours:02}:{minutes:02}:{secs:02},{millis:03}"

def generate_srt(items, srt_output_path):
    print(f"Generating SRT file at {srt_output_path}...")
    output_dir = os.path.dirname(srt_output_path)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)
        
    with open(srt_output_path, "w", encoding="utf-8") as f_srt:
        # Group word-level results into phrases/sentences if needed
        # For simplicity, we can do one word per subtitle or group every few words
        group_size = 5
        for i in range(0, len(items), group_size):
            chunk = items[i : i + group_size]
            start_time = format_timestamp(chunk[0].start_time)
            end_time = format_timestamp(chunk[-1].end_time)
            text = " ".join([w.text for w in chunk])
            
            # Write to SRT
            f_srt.write(f"{(i // group_size) + 1}\n")
            f_srt.write(f"{start_time} --> {end_time}\n")
            f_srt.write(f"{text}\n\n")

def main():
    parser = argparse.ArgumentParser(description="Video Subtitle Recognition using Qwen3-ASR and ForcedAligner")
    parser.add_argument("video", help="Path to the input video file")
    parser.add_argument("--output", default="output.srt", help="Output SRT file path")
    parser.add_argument("--lang", default=None, help="Language of the video (auto-detect if None)")
    args = parser.parse_args()

    video_path = args.video
    if not os.path.exists(video_path):
        print(f"Error: Video file {video_path} not found.")
        sys.exit(1)

    audio_path = "temp_audio.wav"
    
    # Check if GPU (MPS for Mac) is available
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    print(f"Using device: {device}")

    try:
        # 1. Extract Audio
        extract_audio(video_path, audio_path)

        # 2. Transcribe using Qwen3-ASR
        print("Initialising Qwen3-ASR Model...")
        # Using 0.6B model for faster demo, can be changed to 1.7B
        asr_model = Qwen3ASRModel.from_pretrained(
            "Qwen/Qwen3-ASR-0.6B",
            device_map=device,
            torch_dtype=torch.float32 if device == "cpu" else torch.float16
        )
        
        print("Transcribing...")
        results = asr_model.transcribe(audio=[audio_path], language=args.lang)
        transcript = results[0].text
        detected_lang = results[0].language
        print(f"Detected Language: {detected_lang}")
        print(f"Transcript: {transcript}")

        # 3. Align using Qwen3-ForcedAligner
        print("Initialising Qwen3-ForcedAligner...")
        aligner = Qwen3ForcedAligner.from_pretrained(
            "Qwen/Qwen3-ForcedAligner-0.6B",
            device_map=device,
            torch_dtype=torch.float32 if device == "cpu" else torch.float16
        )
        
        print("Aligning...")
        # Use detected language if args.lang is None
        alignment_lang = args.lang or detected_lang
        alignment_results = aligner.align(audio=audio_path, text=transcript, language=alignment_lang)

        # 4. Generate SRT
        generate_srt(alignment_results[0].items, args.output)
        
        # Save transcript to txt
        txt_path = os.path.splitext(args.output)[0] + ".txt"
        print(f"Saving raw transcript to {txt_path}...")
        with open(txt_path, "w", encoding="utf-8") as f_txt:
            f_txt.write(transcript)
        
        print("Process complete!")

    finally:
        # Cleanup
        if os.path.exists(audio_path):
            os.remove(audio_path)

if __name__ == "__main__":
    main()
