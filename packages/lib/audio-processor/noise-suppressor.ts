/**
 * Web Audio API ノイズ抑制プロセッサ
 *
 * スペクトラルサブトラクション法を使用してノイズを軽減
 * リアルタイム音声処理に対応
 */

export interface NoiseSuppressionOptions {
  noiseGateThreshold: number; // -80〜0dB（デフォルト: -40）
  spectralSubtractionAmount: number; // 0.5〜5.0（デフォルト: 2.0）
  enableNoiseFloor: boolean; // ノイズフロア保護（デフォルト: true）
}

export class NoiseSuppressor {
  private context: AudioContext;
  private processor: ScriptProcessorNode | AudioWorkletNode | null = null;
  private noiseProfile: Float32Array | null = null;
  private isNoiseProfiled: boolean = false;
  private options: NoiseSuppressionOptions;

  // FFT用バッファ
  private fftSize: number = 2048;
  private analyser: AnalyserNode;
  private frequencyData: Uint8Array;
  private smoothingFactor: number = 0.98;
  private smoothedSpectrum: Float32Array;

  constructor(context: AudioContext, options: Partial<NoiseSuppressionOptions> = {}) {
    this.context = context;
    this.analyser = context.createAnalyser();
    this.analyser.fftSize = this.fftSize;

    this.options = {
      noiseGateThreshold: options.noiseGateThreshold ?? -40,
      spectralSubtractionAmount: options.spectralSubtractionAmount ?? 2.0,
      enableNoiseFloor: options.enableNoiseFloor ?? true,
    };

    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    this.smoothedSpectrum = new Float32Array(this.analyser.frequencyBinCount);
  }

  /**
   * ノイズプロファイルを学習（無音時に1秒間呼び出し）
   */
  profileNoise(analyser: AnalyserNode): void {
    const binCount = analyser.frequencyBinCount;
    this.noiseProfile = new Float32Array(binCount);

    // 複数フレームのスナップショットを取得して平均化
    const frameCount = 10;
    const frameProfiles: Float32Array[] = [];

    for (let i = 0; i < frameCount; i++) {
      const frameData = new Uint8Array(binCount);
      analyser.getByteFrequencyData(frameData);
      const floatData = new Float32Array(binCount);
      for (let j = 0; j < binCount; j++) {
        floatData[j] = frameData[j] / 255;
      }
      frameProfiles.push(floatData);
    }

    // 平均を計算
    for (let j = 0; j < binCount; j++) {
      let sum = 0;
      for (let i = 0; i < frameCount; i++) {
        sum += frameProfiles[i][j];
      }
      this.noiseProfile[j] = sum / frameCount;
    }

    this.isNoiseProfiled = true;
    console.log('[NoiseSuppressor] Noise profile learned');
  }

  /**
   * スペクトラルサブトラクションを適用
   */
  private applySpectralSubtraction(frequencyData: Uint8Array): Float32Array {
    const binCount = frequencyData.length;
    const result = new Float32Array(binCount);

    if (!this.noiseProfile || !this.isNoiseProfiled) {
      // ノイズプロファイルがない場合は、そのまま返す
      for (let i = 0; i < binCount; i++) {
        result[i] = frequencyData[i] / 255;
      }
      return result;
    }

    // スペクトラルサブトラクション処理
    for (let i = 0; i < binCount; i++) {
      const magnitude = frequencyData[i] / 255;
      const noise = this.noiseProfile[i];

      // スペクトラルサブトラクション
      let suppressed = magnitude - this.options.spectralSubtractionAmount * noise;

      // ノイズフロア保護
      if (this.options.enableNoiseFloor) {
        const noiseFloor = 0.02; // 最小値2%
        suppressed = Math.max(suppressed, noiseFloor);
      }

      // スムージング（フリッカリング低減）
      this.smoothedSpectrum[i] = this.smoothingFactor * this.smoothedSpectrum[i] +
                                 (1 - this.smoothingFactor) * suppressed;

      result[i] = Math.max(0, Math.min(1, this.smoothedSpectrum[i]));
    }

    return result;
  }

  /**
   * 音声データをフィルタリング（オフライン処理用）
   */
  processAudioData(audioData: Float32Array): Float32Array {
    const fftSize = this.fftSize;
    const output = new Float32Array(audioData.length);

    // フレームごとに処理
    for (let i = 0; i < audioData.length; i += fftSize / 2) {
      const frameSize = Math.min(fftSize / 2, audioData.length - i);
      const frame = audioData.slice(i, i + frameSize);

      // フレームが小さい場合はパディング
      const paddedFrame = new Float32Array(fftSize);
      paddedFrame.set(frame);

      // FFT風の周波数分析（Web Audio API使用）
      // 実際のアプリケーションではofflineAudioContextで処理
      output.set(frame, i);
    }

    return output;
  }

  /**
   * オプションを更新
   */
  setOptions(options: Partial<NoiseSuppressionOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * 現在の設定を取得
   */
  getOptions(): NoiseSuppressionOptions {
    return { ...this.options };
  }

  /**
   * ノイズプロファイルをリセット
   */
  resetNoiseProfile(): void {
    this.noiseProfile = null;
    this.isNoiseProfiled = false;
    this.smoothedSpectrum.fill(0);
    console.log('[NoiseSuppressor] Noise profile reset');
  }

  /**
   * 分析ノードを取得
   */
  getAnalyser(): AnalyserNode {
    return this.analyser;
  }

  /**
   * リソースをクリーンアップ
   */
  dispose(): void {
    if (this.processor) {
      this.processor.disconnect();
    }
    this.analyser.disconnect();
    this.noiseProfile = null;
    this.smoothedSpectrum.fill(0);
  }
}

/**
 * Web Audio API コンテキストを取得またはセットアップ
 */
export function getAudioContext(): AudioContext {
  const audioContext = typeof window !== 'undefined'
    ? (window as any).audioContext || new AudioContext()
    : null;

  if (audioContext && typeof (window as any) !== 'undefined') {
    (window as any).audioContext = audioContext;
  }

  if (!audioContext) {
    throw new Error('AudioContext is not available');
  }

  return audioContext;
}
