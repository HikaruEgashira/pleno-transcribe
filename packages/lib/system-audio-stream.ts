/**
 * Web用システム音声キャプチャ
 *
 * getDisplayMedia APIを使用して画面共有時のシステム音声をキャプチャします。
 */

export type AudioSource = "microphone" | "system" | "both";

type AudioChunkCallback = (base64Audio: string) => void;

export class SystemAudioStream {
  private audioContext: AudioContext | null = null;
  private displayStream: MediaStream | null = null;
  private micStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private onAudioChunk: AudioChunkCallback | null = null;
  private isActive = false;

  /**
   * getDisplayMedia APIがサポートされているかチェック
   */
  static isSupported(): boolean {
    return (
      typeof navigator !== "undefined" &&
      typeof navigator.mediaDevices !== "undefined" &&
      typeof navigator.mediaDevices.getDisplayMedia === "function"
    );
  }

  /**
   * 音声ストリーミングを開始
   * @param source - 音声ソース (microphone, system, both)
   * @param callback - 音声チャンクを受信した時のコールバック（Base64 PCM）
   * @param sampleRate - サンプルレート（デフォルト: 16000）
   */
  async start(
    source: AudioSource,
    callback: AudioChunkCallback,
    sampleRate: number = 16000
  ): Promise<void> {
    if (this.isActive) {
      console.warn("[SystemAudioStream] Already streaming");
      return;
    }

    try {
      console.log("[SystemAudioStream] Starting with source:", source);

      this.audioContext = new AudioContext({ sampleRate });
      this.onAudioChunk = callback;

      const sources: MediaStreamAudioSourceNode[] = [];

      // システム音声の取得
      if (source === "system" || source === "both") {
        console.log("[SystemAudioStream] Requesting display media...");
        this.displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true, // 画面共有ダイアログを表示するために必要
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });

        // ビデオトラックは不要なので停止
        this.displayStream.getVideoTracks().forEach((track) => track.stop());

        const audioTracks = this.displayStream.getAudioTracks();
        if (audioTracks.length > 0) {
          const displaySource = this.audioContext.createMediaStreamSource(
            new MediaStream(audioTracks)
          );
          sources.push(displaySource);
          console.log("[SystemAudioStream] System audio captured");
        } else {
          console.warn("[SystemAudioStream] No audio track in display media");
        }
      }

      // マイク入力の取得
      if (source === "microphone" || source === "both") {
        console.log("[SystemAudioStream] Requesting microphone...");
        this.micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate,
            echoCancellation: true,
            noiseSuppression: false,
          },
        });

        const micSource = this.audioContext.createMediaStreamSource(this.micStream);
        sources.push(micSource);
        console.log("[SystemAudioStream] Microphone captured");
      }

      if (sources.length === 0) {
        throw new Error("No audio sources available");
      }

      // ミキサーを作成（複数ソースの場合）
      const merger =
        sources.length > 1
          ? this.audioContext.createChannelMerger(sources.length)
          : null;

      // ScriptProcessorNodeを作成
      const bufferSize = 4096;
      this.processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

      this.processor.onaudioprocess = (event) => {
        if (!this.isActive || !this.onAudioChunk) return;

        const inputData = event.inputBuffer.getChannelData(0);

        // Float32 -> Int16 PCM変換
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const sample = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        }

        // ArrayBufferをBase64に変換
        const base64 = this.arrayBufferToBase64(pcmData.buffer);
        this.onAudioChunk(base64);
      };

      // 接続
      const silentGain = this.audioContext.createGain();
      silentGain.gain.value = 0;

      if (merger) {
        sources.forEach((source, index) => {
          source.connect(merger, 0, index);
        });
        merger.connect(this.processor);
      } else {
        sources[0].connect(this.processor);
      }

      this.processor.connect(silentGain);
      silentGain.connect(this.audioContext.destination);

      this.isActive = true;
      console.log("[SystemAudioStream] Streaming started at", sampleRate, "Hz");
    } catch (error) {
      console.error("[SystemAudioStream] Failed to start:", error);
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

    console.log("[SystemAudioStream] Stopping stream...");
    this.isActive = false;
    this.cleanup();
    console.log("[SystemAudioStream] Stream stopped");
  }

  /**
   * リソースをクリーンアップ
   */
  private cleanup(): void {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.displayStream) {
      this.displayStream.getTracks().forEach((track) => track.stop());
      this.displayStream = null;
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
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
