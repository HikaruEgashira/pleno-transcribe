/**
 * ノイズ抑制フック
 * 音声ストリームのリアルタイムノイズ抑制を管理
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import { NoiseSuppressor, getAudioContext, type NoiseSuppressionOptions } from '@/packages/lib/audio-processor/noise-suppressor';

export interface UseNoiseSuppressionState {
  isSupported: boolean;
  isEnabled: boolean;
  noiseProfiled: boolean;
  dBLevel: number;
  error: string | null;
}

export function useNoiseSuppression() {
  const suppressorRef = useRef<NoiseSuppressor | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const profileTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [state, setState] = useState<UseNoiseSuppressionState>({
    isSupported: typeof window !== 'undefined' && typeof AudioContext !== 'undefined',
    isEnabled: false,
    noiseProfiled: false,
    dBLevel: -60,
    error: null,
  });

  /**
   * ノイズ抑制を初期化
   */
  const initialize = useCallback(async (stream: MediaStream) => {
    if (!state.isSupported) {
      setState((prev) => ({
        ...prev,
        error: 'Web Audio APIはこのブラウザでサポートされていません',
      }));
      return;
    }

    try {
      const context = getAudioContext();
      contextRef.current = context;

      // マイクストリームをオーディオコンテキストに接続
      if (!sourceRef.current) {
        sourceRef.current = context.createMediaStreamSource(stream);
      }

      // ノイズサプレッサーを初期化
      suppressorRef.current = new NoiseSuppressor(context, {
        noiseGateThreshold: -40,
        spectralSubtractionAmount: 2.0,
        enableNoiseFloor: true,
      });

      // アナライザーに接続
      const analyser = suppressorRef.current.getAnalyser();
      sourceRef.current.connect(analyser);

      setState((prev) => ({
        ...prev,
        isEnabled: true,
        error: null,
      }));

      console.log('[useNoiseSuppression] Initialized successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '初期化に失敗しました';
      setState((prev) => ({
        ...prev,
        isEnabled: false,
        error: errorMessage,
      }));
      console.error('[useNoiseSuppression] Initialization failed:', error);
    }
  }, [state.isSupported]);

  /**
   * ノイズプロファイルを学習（無音時に～1秒）
   */
  const profileNoise = useCallback(async (durationMs: number = 1000) => {
    if (!suppressorRef.current) {
      setState((prev) => ({
        ...prev,
        error: 'ノイズサプレッサーが初期化されていません',
      }));
      return;
    }

    try {
      setState((prev) => ({
        ...prev,
        error: '無音環境でノイズプロファイルを学習中...',
      }));

      const analyser = suppressorRef.current.getAnalyser();
      suppressorRef.current.profileNoise(analyser);

      // 短時間待機してから完了
      await new Promise((resolve) => {
        profileTimeoutRef.current = setTimeout(resolve, durationMs);
      });

      setState((prev) => ({
        ...prev,
        noiseProfiled: true,
        error: null,
      }));

      console.log('[useNoiseSuppression] Noise profile completed');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'プロファイリング失敗';
      setState((prev) => ({
        ...prev,
        noiseProfiled: false,
        error: errorMessage,
      }));
      console.error('[useNoiseSuppression] Profiling failed:', error);
    }
  }, []);

  /**
   * ノイズプロファイルをリセット
   */
  const resetNoiseProfile = useCallback(() => {
    if (suppressorRef.current) {
      suppressorRef.current.resetNoiseProfile();
      setState((prev) => ({
        ...prev,
        noiseProfiled: false,
        error: null,
      }));
      console.log('[useNoiseSuppression] Noise profile reset');
    }
  }, []);

  /**
   * オプションを更新
   */
  const setOptions = useCallback((options: Partial<NoiseSuppressionOptions>) => {
    if (suppressorRef.current) {
      suppressorRef.current.setOptions(options);
      console.log('[useNoiseSuppression] Options updated:', options);
    }
  }, []);

  /**
   * 現在の設定を取得
   */
  const getOptions = useCallback((): NoiseSuppressionOptions | null => {
    if (!suppressorRef.current) {
      return null;
    }
    return suppressorRef.current.getOptions();
  }, []);

  /**
   * dBレベルを更新（アナライザーから）
   */
  const updatedBLevel = useCallback(() => {
    if (suppressorRef.current) {
      const analyser = suppressorRef.current.getAnalyser();
      const freqData = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(freqData);

      // 平均周波数エネルギーからdBを計算
      let sum = 0;
      for (let i = 0; i < freqData.length; i++) {
        sum += freqData[i];
      }
      const average = sum / freqData.length;
      const level = Math.max(-60, 20 * Math.log10(average / 255) || -60);

      setState((prev) => ({
        ...prev,
        dBLevel: level,
      }));
    }
  }, []);

  /**
   * リソースをクリーンアップ
   */
  const dispose = useCallback(() => {
    if (profileTimeoutRef.current) {
      clearTimeout(profileTimeoutRef.current);
      profileTimeoutRef.current = null;
    }

    if (suppressorRef.current) {
      suppressorRef.current.dispose();
      suppressorRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (contextRef.current && contextRef.current.state !== 'closed') {
      contextRef.current.close();
      contextRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      isEnabled: false,
      noiseProfiled: false,
      error: null,
    }));

    console.log('[useNoiseSuppression] Resources disposed');
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (profileTimeoutRef.current) {
        clearTimeout(profileTimeoutRef.current);
      }
    };
  }, []);

  return {
    state,
    initialize,
    profileNoise,
    resetNoiseProfile,
    setOptions,
    getOptions,
    updatedBLevel,
    dispose,
  };
}

/**
 * ノイズ抑制がサポートされているかチェック
 */
export function isNoiseSuppressionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    typeof AudioContext !== 'undefined' ||
    typeof (window as any).webkitAudioContext !== 'undefined'
  );
}
