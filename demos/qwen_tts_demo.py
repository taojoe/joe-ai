import os
import sys

try:
    from qwen_tts import Qwen3TTSModel
except ImportError:
    print("错误: qwen-tts 未安装。首先请执行: uv pip install qwen-tts")
    sys.exit(1)

def main():
    """
    这是一个使用 Qwen3-TTS 本地模型进行推理的演示程序。
    
    Qwen3-TTS 提供了多种生成模式：
    1. Base 模型 (用于 zero-shot voice cloning)
    2. CustomVoice 模型 (用于预置的高质量音色)
    3. VoiceDesign 模型 (通过自然语言描述定制音色)
    
    下面演示使用 CustomVoice 模型生成基础音频的过程。
    由于此模型会在首次运行时从 Hugging Face / ModelScope 下载权重文件，
    它可能需要一定的网络和几GB的显存(VRAM)。
    """
    print("正在初始化本地 Qwen3TTS 引擎... (首次运行可能需要下载模型)")

    try:
        # 指定想下载/加载的模型版本，此处以假定的预设音色模型为例。
        # 实际使用中也可以传入本地权重目录的绝对路径。
        model = Qwen3TTSModel.from_pretrained("Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice")
        
        test_text = "你好！这是一个使用运行在本地机器上的 Qwen3-TTS 引擎生成的音频演示。"
        print(f"正在生成音频文本: '{test_text}'")

        # 使用 custom voice 生成语音
        # 可以通过 model.get_supported_speakers() 查看支持的音色
        audio_output = model.generate_custom_voice(
            text=test_text,
            speaker="uncle_fu", # 这里的speaker需要是模型中已包含的支持音色之一
        )
        
        output_file = "output/local_qwen_tts_output.wav"
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        
        # Qwen3-TTS 的返回结果可能是 (audio_tensor, sample_rate) 或者 numpy array
        # 或者直接保存。我们需要用一个常见的方式来保存
        # 这里用 soundfile 保存。
        import soundfile as sf
        
        # 判断返回数据结构
        if isinstance(audio_output, tuple):
            audio_data, sample_rate = audio_output
        else:
            audio_data = audio_output
            sample_rate = 16000 # 默认常见采样率，根据实际需要调节
            
        # 若是 torch tensor 则转为 numpy
        if hasattr(audio_data, 'numpy'):
            import torch
            if isinstance(audio_data, torch.Tensor):
                audio_data = audio_data.detach().cpu().numpy()
            else:
                audio_data = audio_data.cpu().numpy()
        
        # soundfile 必须要 (frames,) 或 (frames, channels)
        # 如果格式是 (1, frames) 则会导致报错
        import numpy as np
        audio_data = np.squeeze(audio_data)
        
        sf.write(output_file, audio_data, sample_rate)
        
        print(f"音频生成成功！已保存到 '{output_file}'")
    except Exception as e:
        print("本地推理遇到错误。此模型对本地 GPU 环境存在要求。报错信息:")
        print(e)
        print("提示: 确保您已安装 flash-attn 以获得更快推理，或有可用的 MPS / CUDA 环境。")

if __name__ == "__main__":
    main()
