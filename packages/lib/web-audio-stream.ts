/**
 * Web用リアルタイム音声ストリーミング
 *
 * AudioWorkletを使用してマイク入力をリアルタイムでPCMデータとして取得します。
 */

type AudioChunkCallback = (base64Audio: string) => void;

export class WebAudioStream {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private onAudioChunk: AudioChunkCallback | null = null;
  private isActive = false;

  /**
   * 音声ストリーミングを開始
   * @param callback - 音声チャンクを受信した時のコールバック（Base64 PCM）
   * @param sampleRate - サンプルレート（デフォルト: 16000）
   */
  async start(callback: AudioChunkCallback, sampleRate: number = 16000): Promise<void> {
    if (this.isActive) {
      console.warn("[WebAudioStream] Already streaming");
      return;
    }

    try {
      console.log("[WebAudioStream] Requesting microphone access...");

      // マイクへのアクセスを取得
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate,
          echoCancellation: true,
          noiseSuppression: false,
        },
      });

      // AudioContextを作成
      this.audioContext = new AudioContext({ sampleRate });
      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.onAudioChunk = callback;

      // ScriptProcessorNode（AudioWorkletの代替）を使用
      // 4096サンプル = 約256ms @ 16kHz
      const bufferSize = 4096;
      this.processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

      this.processor.onaudioprocess = (event) => {
        if (!this.isActive || !this.onAudioChunk) return;

        const inputData = event.inputBuffer.getChannelData(0);

        // Float32 -> Int16 PCM変換
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          // クリッピングを防ぐ
          const sample = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        }

        // ArrayBufferをBase64に変換
        const base64 = this.arrayBufferToBase64(pcmData.buffer);
        this.onAudioChunk(base64);
      };

      // 接続（サイレントノードを経由してdestinationに接続、音声ループを防ぐ）
      const silentGain = this.audioContext.createGain();
      silentGain.gain.value = 0; // ミュート

      this.source.connect(this.processor);
      this.processor.connect(silentGain);
      silentGain.connect(this.audioContext.destination);

      this.isActive = true;
      console.log("[WebAudioStream] Streaming started at", sampleRate, "Hz");
    } catch (error) {
      console.error("[WebAudioStream] Failed to start:", error);
      this.cleanup();
      throw error;
    }
  }

  /**
   * 音声ストリーミングを停止
   */
  stop(): void {
    if (!this.isActive) {
      return;
    }

    console.log("[WebAudioStream] Stopping stream...");
    this.isActive = false;
    this.cleanup();
    console.log("[WebAudioStream] Stream stopped");
  }

  /**
   * リソースをクリーンアップ
   */
  private cleanup(): void {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.onAudioChunk = null;
  }

  /**
   * ArrayBufferをBase64文字列に変換
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * ストリーミング中かどうか
   */
  get streaming(): boolean {
    return this.isActive;
  }
}
