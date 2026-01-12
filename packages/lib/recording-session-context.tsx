import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { Platform, Alert, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useAudioRecorder, useAudioRecorderState, RecordingPresets, AudioModule, setAudioModeAsync } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useRecordings } from './recordings-context';
import { useRealtimeTranscription } from '@/packages/hooks/use-realtime-transcription';
import { useRealtimeTranslation } from '@/packages/hooks/use-realtime-translation';
import { useAudioMetering } from '@/packages/hooks/use-audio-metering';
import { useNativeMetering } from '@/packages/hooks/use-native-metering';
import { useBackgroundRecording } from '@/packages/hooks/use-background-recording';
import { Recording, Highlight } from '@/packages/types/recording';
import type { TranslationStatus } from '@/packages/types/realtime-transcription';

const RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  isMeteringEnabled: true,
};

export type AudioSource = "microphone" | "system" | "both";

interface RecordingSessionState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  highlights: Highlight[];
  hasPermission: boolean | null;
  realtimeEnabled: boolean;
  translationEnabled: boolean;
  translationTargetLanguage: string;
  audioSource: AudioSource;
  currentRecordingId: string | null;
  justCompleted: boolean;
  metering: number;
  meteringHistory: number[];
}

interface RecordingSessionContextValue {
  state: RecordingSessionState;
  pulseAnim: Animated.Value;
  realtimeState: ReturnType<typeof useRealtimeTranscription>['state'];
  mergedSegments: ReturnType<typeof useRealtimeTranscription>['mergedSegments'];
  getTranslation: (segmentId: string) => string | undefined;
  getTranslationStatus: (segmentId: string) => TranslationStatus | undefined;
  isTranslating: boolean;
  startRecording: () => Promise<void>;
  pauseResume: () => Promise<void>;
  stopRecording: () => Promise<void>;
  cancelRecording: () => Promise<void>;
  addHighlight: () => void;
  clearJustCompleted: () => void;
}

const RecordingSessionContext = createContext<RecordingSessionContextValue | null>(null);

export function RecordingSessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { addRecording, updateRealtimeTranscript, setTranscript } = useRecordings();

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);
  const [translationEnabled, setTranslationEnabled] = useState(false);
  const [translationTargetLanguage, setTranslationTargetLanguage] = useState('ja');
  const [audioSource, setAudioSource] = useState<AudioSource>('microphone');
  const [currentRecordingId, setCurrentRecordingId] = useState<string | null>(null);
  const [justCompleted, setJustCompleted] = useState(false);

  const isStartingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const audioRecorder = useAudioRecorder(RECORDING_OPTIONS);
  const [meteringHistory, setMeteringHistory] = useState<number[]>([]);
  const [fullMeteringHistory, setFullMeteringHistory] = useState<number[]>([]);

  const {
    state: realtimeState,
    startSession: startRealtimeSession,
    stopSession: stopRealtimeSession,
    consolidateSegments,
    mergedSegments,
    soundLevel: realtimeSoundLevel,
  } = useRealtimeTranscription();

  // 翻訳フック
  // Note: enabled から isRecording を削除。isRecording を含めると、startRecording 時に
  // コールバックが作成された時点で enabled=false となり、翻訳が動作しない。
  // コールバックの有無は startRealtimeSession 呼び出し時に制御する。
  const {
    translatePartial,
    translateCommitted,
    getTranslation,
    getTranslationStatus,
    clearCache: clearTranslationCache,
    isTranslating,
  } = useRealtimeTranslation({
    enabled: translationEnabled && realtimeEnabled,
    targetLanguage: translationTargetLanguage,
  });

  // Web: use Web Audio API via useAudioMetering hook
  // Native (Android/iOS): use expo-audio-stream's soundLevel for metering
  // Note: expo-audio's metering doesn't work reliably on Android
  const webMetering = useAudioMetering(isRecording && !isPaused);
  const recorderState = useAudioRecorderState(audioRecorder, 100);

  // ネイティブメータリング（リアルタイム転写が無効の場合のみ使用）
  // 注意: expo-audio と expo-audio-stream は同時に使用できないため、
  // リアルタイム転写が有効な場合は soundLevel を使用
  const shouldUseNativeMetering = Platform.OS !== 'web' && !realtimeEnabled && isRecording && !isPaused;
  const nativeMetering = useNativeMetering(shouldUseNativeMetering);

  // メータリング値の決定:
  // - Web: useAudioMetering
  // - Native + リアルタイム有効: realtimeSoundLevel から変換
  // - Native + リアルタイム無効: useNativeMetering
  const metering = (() => {
    if (Platform.OS === 'web') {
      return webMetering;
    }
    if (realtimeEnabled && isRecording) {
      // soundLevel (0〜1) を dB に変換
      const db = realtimeSoundLevel > 0 ? 20 * Math.log10(realtimeSoundLevel) : -60;
      return Math.max(-60, Math.min(0, db));
    }
    // ネイティブメータリングを使用
    return nativeMetering;
  })();

  // Enable background recording for iOS/Android
  useBackgroundRecording(isRecording);

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const saved = await AsyncStorage.getItem('app-settings');
        console.log('[RecordingSession] Loaded settings:', saved);
        if (saved) {
          const settings = JSON.parse(saved);
          console.log('[RecordingSession] Parsed settings:', {
            realtimeEnabled: settings.realtimeTranscription?.enabled,
            translationEnabled: settings.realtimeTranslation?.enabled,
            targetLanguage: settings.realtimeTranslation?.targetLanguage,
            audioSource: settings.audioSource,
          });
          setRealtimeEnabled(settings.realtimeTranscription?.enabled || false);
          setTranslationEnabled(settings.realtimeTranslation?.enabled || false);
          setTranslationTargetLanguage(settings.realtimeTranslation?.targetLanguage || 'ja');
          setAudioSource(settings.audioSource || 'microphone');
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    loadSettings();
  }, []);

  // Request microphone permission (skip on web - permission will be requested on first recording)
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Web: マイク許可は録音開始時にブラウザが自動的に求めるので、trueとして扱う
      setHasPermission(true);
      return;
    }
    (async () => {
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
        shouldPlayInBackground: true,
        allowsBackgroundRecording: true,
      });
      const status = await AudioModule.requestRecordingPermissionsAsync();
      setHasPermission(status.granted);
    })();
  }, []);

  // Timer for duration
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 0.1);
      }, 100);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, isPaused]);

  // Update metering history with memory limit
  // 長時間録音でもメモリ使用量を制限（最大10分 = 6000サンプル @ 100ms）
  const MAX_FULL_HISTORY_SIZE = 6000;

  useEffect(() => {
    if (isRecording && !isPaused) {
      setMeteringHistory((prev) => {
        const newHistory = [...prev, metering];
        return newHistory.slice(-50);
      });
      setFullMeteringHistory((prev) => {
        // メモリ制限: 最大サイズを超えたら間引き（ダウンサンプリング）
        if (prev.length >= MAX_FULL_HISTORY_SIZE) {
          // 2サンプルを1サンプルに圧縮して半分にする
          const downsampled = [];
          for (let i = 0; i < prev.length - 1; i += 2) {
            downsampled.push((prev[i] + prev[i + 1]) / 2);
          }
          return [...downsampled, metering];
        }
        return [...prev, metering];
      });
    }
  }, [isRecording, isPaused, metering]);

  // Pulse animation
  useEffect(() => {
    if (isRecording && !isPaused) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, isPaused, pulseAnim]);

  // Sync realtime transcript to context
  useEffect(() => {
    if (currentRecordingId && realtimeState.segments.length > 0) {
      updateRealtimeTranscript(currentRecordingId, realtimeState.segments);
    }
  }, [currentRecordingId, realtimeState.segments, updateRealtimeTranscript]);

  const startRecording = useCallback(async () => {
    if (isStartingRef.current || isRecording) {
      console.log('Recording already in progress or starting, skipping');
      return;
    }
    isStartingRef.current = true;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);
      setHighlights([]);
      setMeteringHistory([]);
      setFullMeteringHistory([]);

      const recordingId = Date.now().toString();
      setCurrentRecordingId(recordingId);

      console.log('[RecordingSession] Starting recording with settings:', {
        realtimeEnabled,
        translationEnabled,
        translationTargetLanguage,
        audioSource,
      });
      if (realtimeEnabled) {
        try {
          // 翻訳キャッシュをクリア
          if (translationEnabled) {
            console.log('[RecordingSession] Clearing translation cache');
            clearTranslationCache();
          }
          // 翻訳コールバックを渡してリアルタイムセッション開始
          console.log('[RecordingSession] Starting realtime session with translation:', translationEnabled, 'audioSource:', audioSource);
          await startRealtimeSession(recordingId, {}, {
            onPartial: translationEnabled ? translatePartial : undefined,
            onCommitted: translationEnabled ? translateCommitted : undefined,
          }, audioSource);
          console.log('Realtime transcription session started');
        } catch (error) {
          console.error('Failed to start realtime session:', error);
        }
      }
      isStartingRef.current = false;
    } catch (error) {
      console.error('Failed to start recording:', error);
      isStartingRef.current = false;
      Alert.alert('エラー', '録音を開始できませんでした');
    }
  }, [audioRecorder, realtimeEnabled, translationEnabled, startRealtimeSession, translatePartial, translateCommitted, clearTranslationCache, isRecording]);

  const pauseResume = useCallback(async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      if (isPaused) {
        await audioRecorder.record();
        setIsPaused(false);
      } else {
        audioRecorder.pause();
        setIsPaused(true);
      }
    } catch (error) {
      console.error('Failed to pause/resume:', error);
    }
  }, [audioRecorder, isPaused]);

  const stopRecording = useCallback(async () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    try {
      if (realtimeEnabled && currentRecordingId) {
        try {
          await stopRealtimeSession();
          console.log('Realtime transcription session stopped');
        } catch (error) {
          console.error('Failed to stop realtime session:', error);
        }
      }

      await audioRecorder.stop();
      setIsRecording(false);
      setIsPaused(false);

      const uri = audioRecorder.uri;
      if (!uri) {
        Alert.alert('エラー', '録音ファイルが見つかりません');
        return;
      }

      console.log('Recording stopped, URI:', uri);

      let finalUri = uri;

      if (Platform.OS === 'web') {
        console.log('Web platform - converting blob to base64 for storage');
        try {
          const response = await fetch(uri);
          const blob = await response.blob();

          const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              const base64 = result.split(',')[1];
              resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          console.log('Base64 conversion completed, length:', base64Data.length);
          finalUri = `data:audio/webm;base64,${base64Data}`;
        } catch (webError) {
          console.error('Failed to convert blob to base64:', webError);
          throw new Error('録音データの変換に失敗しました');
        }
      } else {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `recording_${timestamp}.m4a`;
        const newUri = `${FileSystem.documentDirectory}recordings/${filename}`;

        await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}recordings/`, {
          intermediates: true,
        });

        await FileSystem.moveAsync({
          from: uri,
          to: newUri,
        });

        finalUri = newUri;
      }

      const now = new Date();
      const recordingId = currentRecordingId || Date.now().toString();

      // 波形データを正規化・リサンプリング（40個に）
      const normalizeWaveform = (data: number[]): number[] => {
        if (data.length === 0) return Array(40).fill(0.1);

        // -30dB〜0dBを0〜1にマッピング、pow(1.3)でコントラスト強調
        const normalized = data.map(db => {
          const value = Math.max(0, Math.min(1, (db + 30) / 30));
          return Math.pow(value, 1.3);
        });
        if (data.length <= 40) return [...normalized, ...Array(40 - normalized.length).fill(0)];
        const ratio = data.length / 40;
        return Array.from({ length: 40 }, (_, i) => {
          const slice = normalized.slice(Math.floor(i * ratio), Math.floor((i + 1) * ratio));
          return slice.reduce((a, b) => a + b, 0) / slice.length;
        });
      };

      const newRecording: Recording = {
        id: recordingId,
        title: `録音 ${now.toLocaleDateString('ja-JP')} ${now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`,
        audioUri: finalUri,
        duration: Math.floor(duration),
        createdAt: now,
        updatedAt: now,
        highlights,
        notes: '',
        qaHistory: [],
        status: 'saved',
        waveformData: normalizeWaveform(fullMeteringHistory),
      };

      console.log('Adding recording:', newRecording.id);
      await addRecording(newRecording);
      console.log('Recording added successfully');

      if (realtimeEnabled && realtimeState.segments.length > 0) {
        const realtimeText = consolidateSegments();
        if (realtimeText.trim()) {
          console.log('Saving realtime transcription result:', realtimeText.substring(0, 100));

          // 翻訳テキストを含めてセグメントを作成
          const transcriptSegments = realtimeState.segments
            .filter((s) => !s.isPartial)
            .map((s) => ({
              text: s.text,
              startTime: s.timestamp,
              endTime: s.timestamp,
              speaker: s.speaker,
              translatedText: translationEnabled ? getTranslation(s.id) : undefined,
            }));

          // 翻訳全文を生成
          let translationData: { targetLanguage: string; text: string } | undefined;
          if (translationEnabled) {
            const translatedTexts = transcriptSegments
              .map((s) => s.translatedText)
              .filter(Boolean);
            if (translatedTexts.length > 0) {
              translationData = {
                targetLanguage: translationTargetLanguage,
                text: translatedTexts.join('\n'),
              };
              console.log('Saving translation result:', translationData.text.substring(0, 100));
            }
          }

          await setTranscript(recordingId, {
            text: realtimeText,
            segments: transcriptSegments,
            language: 'ja',
            processedAt: now,
            translation: translationData,
          });
        }
      }

      setDuration(0);
      setHighlights([]);
      setCurrentRecordingId(null);
      setJustCompleted(true);
      isStartingRef.current = false;

      router.push(`/note/${newRecording.id}`);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('エラー', '録音の保存に失敗しました');
      isStartingRef.current = false;
    }
  }, [audioRecorder, duration, highlights, addRecording, router, currentRecordingId, realtimeEnabled, stopRealtimeSession, realtimeState.segments, consolidateSegments, setTranscript, translationEnabled, getTranslation, translationTargetLanguage]);

  const cancelRecording = useCallback(async () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }

    try {
      if (realtimeEnabled && currentRecordingId) {
        try {
          await stopRealtimeSession();
        } catch (error) {
          console.error('Failed to stop realtime session:', error);
        }
      }

      await audioRecorder.stop();

      setIsRecording(false);
      setIsPaused(false);
      setDuration(0);
      setHighlights([]);
      setFullMeteringHistory([]);
      setCurrentRecordingId(null);
      setJustCompleted(true);
      isStartingRef.current = false;
    } catch (error) {
      console.error('Failed to cancel recording:', error);
      setIsRecording(false);
      setIsPaused(false);
      setDuration(0);
      setHighlights([]);
      setFullMeteringHistory([]);
      setCurrentRecordingId(null);
      setJustCompleted(true);
      isStartingRef.current = false;
    }
  }, [audioRecorder, realtimeEnabled, currentRecordingId, stopRealtimeSession]);

  const addHighlightHandler = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }

    const newHighlight: Highlight = {
      id: Date.now().toString(),
      timestamp: duration,
    };
    setHighlights((prev) => [...prev, newHighlight]);
  }, [duration]);

  const clearJustCompleted = useCallback(() => {
    setJustCompleted(false);
  }, []);

  const state: RecordingSessionState = {
    isRecording,
    isPaused,
    duration,
    highlights,
    hasPermission,
    realtimeEnabled,
    translationEnabled,
    translationTargetLanguage,
    audioSource,
    currentRecordingId,
    justCompleted,
    metering,
    meteringHistory,
  };

  return (
    <RecordingSessionContext.Provider
      value={{
        state,
        pulseAnim,
        realtimeState,
        mergedSegments,
        getTranslation,
        getTranslationStatus,
        isTranslating,
        startRecording,
        pauseResume,
        stopRecording,
        cancelRecording,
        addHighlight: addHighlightHandler,
        clearJustCompleted,
      }}
    >
      {children}
    </RecordingSessionContext.Provider>
  );
}

// ウェブのランディングページなど、プロバイダーがない場合のデフォルト値
const defaultState: RecordingSessionState = {
  isRecording: false,
  isPaused: false,
  duration: 0,
  highlights: [],
  hasPermission: null,
  realtimeEnabled: false,
  translationEnabled: false,
  translationTargetLanguage: 'ja',
  audioSource: 'microphone',
  currentRecordingId: null,
  justCompleted: false,
  metering: -160,
  meteringHistory: [],
};

const defaultValue: RecordingSessionContextValue = {
  state: defaultState,
  pulseAnim: new Animated.Value(1),
  realtimeState: { isActive: false, segments: [], connectionStatus: 'disconnected', error: undefined },
  mergedSegments: [],
  getTranslation: () => undefined,
  getTranslationStatus: () => undefined,
  isTranslating: false,
  startRecording: async () => {},
  pauseResume: async () => {},
  stopRecording: async () => {},
  cancelRecording: async () => {},
  addHighlight: () => {},
  clearJustCompleted: () => {},
};

export function useRecordingSession() {
  const context = useContext(RecordingSessionContext);
  // プロバイダーがない場合はデフォルト値を返す（ウェブのランディングページなど）
  return context ?? defaultValue;
}
