import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { Alert, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useAudioRecorder, useAudioRecorderState, RecordingPresets } from 'expo-audio';

import { useRecordings } from './recordings-context';
import { useRealtimeTranscription } from '@/packages/hooks/use-realtime-transcription';
import { useRealtimeTranslation } from '@/packages/hooks/use-realtime-translation';
import { useBackgroundRecording } from '@/packages/hooks/use-background-recording';
import { useRecordingDraft } from '@/packages/hooks/use-recording-draft';
import { Recording, Highlight, RecordingDraft } from '@/packages/types/recording';
import type { TranslationStatus } from '@/packages/types/realtime-transcription';
import { Storage, Haptics, FileSystem, Permissions, createAudioMetering, type AudioMeteringController } from '@/packages/platform';

const RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  isMeteringEnabled: true,
};

interface RecordingSessionState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  highlights: Highlight[];
  hasPermission: boolean | null;
  realtimeEnabled: boolean;
  translationEnabled: boolean;
  translationTargetLanguage: string;
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
  checkForRecovery: () => Promise<RecordingDraft | null>;
  clearRecoveryDraft: () => Promise<void>;
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
  const [currentRecordingId, setCurrentRecordingId] = useState<string | null>(null);
  const [justCompleted, setJustCompleted] = useState(false);
  const [metering, setMetering] = useState(-160);

  const isStartingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const audioMeteringRef = useRef<AudioMeteringController | null>(null);

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

  useAudioRecorderState(audioRecorder, 100);

  // Enable background recording for iOS/Android
  useBackgroundRecording(isRecording);

  // Auto-save draft hook
  const { startAutoSave, stopAutoSave, loadDraft, clearDraft } = useRecordingDraft();

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const saved = await Storage.getItem('app-settings');
        console.log('[RecordingSession] Loaded settings:', saved);
        if (saved) {
          const settings = JSON.parse(saved);
          console.log('[RecordingSession] Parsed settings:', {
            realtimeEnabled: settings.realtimeTranscription?.enabled,
            translationEnabled: settings.realtimeTranslation?.enabled,
            targetLanguage: settings.realtimeTranslation?.targetLanguage,
          });
          setRealtimeEnabled(settings.realtimeTranscription?.enabled || false);
          setTranslationEnabled(settings.realtimeTranslation?.enabled || false);
          setTranslationTargetLanguage(settings.realtimeTranslation?.targetLanguage || 'ja');
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    loadSettings();
  }, []);

  // Request microphone permission
  useEffect(() => {
    (async () => {
      const status = await Permissions.requestMicrophonePermission();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // Audio metering effect
  useEffect(() => {
    // リアルタイムが有効な場合はsoundLevelを使用
    if (realtimeEnabled && isRecording) {
      const db = realtimeSoundLevel > 0 ? 20 * Math.log10(realtimeSoundLevel) : -60;
      setMetering(Math.max(-60, Math.min(0, db)));
      return;
    }

    // 通常のメータリング
    if (isRecording && !isPaused && !realtimeEnabled) {
      if (!audioMeteringRef.current) {
        audioMeteringRef.current = createAudioMetering();
        audioMeteringRef.current.onMeteringUpdate((db) => {
          setMetering(db);
        });
      }
      audioMeteringRef.current.start().catch(console.error);
    } else {
      if (audioMeteringRef.current) {
        audioMeteringRef.current.stop();
        audioMeteringRef.current = null;
      }
      if (!isRecording) {
        setMetering(-160);
      }
    }

    return () => {
      if (audioMeteringRef.current) {
        audioMeteringRef.current.stop();
        audioMeteringRef.current = null;
      }
    };
  }, [isRecording, isPaused, realtimeEnabled, realtimeSoundLevel]);

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
  const MAX_FULL_HISTORY_SIZE = 6000;

  useEffect(() => {
    if (isRecording && !isPaused) {
      setMeteringHistory((prev) => {
        const newHistory = [...prev, metering];
        return newHistory.slice(-50);
      });
      setFullMeteringHistory((prev) => {
        if (prev.length >= MAX_FULL_HISTORY_SIZE) {
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

    await Haptics.impact('medium');

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

      // 自動保存を開始
      startAutoSave(() => ({
        id: recordingId,
        duration,
        highlights,
        realtimeEnabled,
        realtimeSegments: realtimeState.segments,
        meteringHistory: fullMeteringHistory,
      }));

      console.log('[RecordingSession] Starting recording with settings:', {
        realtimeEnabled,
        translationEnabled,
        translationTargetLanguage,
      });
      if (realtimeEnabled) {
        try {
          if (translationEnabled) {
            console.log('[RecordingSession] Clearing translation cache');
            clearTranslationCache();
          }
          console.log('[RecordingSession] Starting realtime session with translation:', translationEnabled);
          await startRealtimeSession(recordingId, {}, {
            onPartial: translationEnabled ? translatePartial : undefined,
            onCommitted: translationEnabled ? translateCommitted : undefined,
          });
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
    await Haptics.impact('light');

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
    await Haptics.notification('success');

    // 自動保存を停止
    stopAutoSave();

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

      // Blob URL の場合は Base64 に変換（Web）
      if (uri.startsWith('blob:')) {
        console.log('Converting blob to base64 for storage');
        try {
          const response = await fetch(uri);
          const blob = await response.blob();
          const base64Data = await FileSystem.blobToBase64(blob);
          console.log('Base64 conversion completed, length:', base64Data.length);
          finalUri = `data:audio/webm;base64,${base64Data}`;
        } catch (webError) {
          console.error('Failed to convert blob to base64:', webError);
          throw new Error('録音データの変換に失敗しました');
        }
      } else if (FileSystem.documentDirectory) {
        // Native: ファイルを移動
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `recording_${timestamp}.m4a`;
        const newUri = `${FileSystem.documentDirectory}recordings/${filename}`;

        await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}recordings/`, {
          intermediates: true,
        });

        await FileSystem.moveAsync(uri, newUri);
        finalUri = newUri;
      }

      const now = new Date();
      const recordingId = currentRecordingId || Date.now().toString();

      const normalizeWaveform = (data: number[]): number[] => {
        if (data.length === 0) return Array(40).fill(0.1);

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

          const transcriptSegments = realtimeState.segments
            .filter((s) => !s.isPartial)
            .map((s) => ({
              text: s.text,
              startTime: s.timestamp,
              endTime: s.timestamp,
              speaker: s.speaker,
              translatedText: translationEnabled ? getTranslation(s.id) : undefined,
            }));

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

      // ドラフトをクリア（正常終了）
      await clearDraft();

      router.push(`/note/${newRecording.id}`);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('エラー', '録音の保存に失敗しました');
      isStartingRef.current = false;
    }
  }, [audioRecorder, duration, highlights, addRecording, router, currentRecordingId, realtimeEnabled, stopRealtimeSession, realtimeState.segments, consolidateSegments, setTranscript, translationEnabled, getTranslation, translationTargetLanguage, fullMeteringHistory, stopAutoSave, clearDraft]);

  const cancelRecording = useCallback(async () => {
    await Haptics.notification('warning');

    // 自動保存を停止
    stopAutoSave();

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

      // ドラフトをクリア（キャンセル）
      await clearDraft();
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

      // エラー時もドラフトをクリア
      await clearDraft();
    }
  }, [audioRecorder, realtimeEnabled, currentRecordingId, stopRealtimeSession, stopAutoSave, clearDraft]);

  const addHighlightHandler = useCallback(() => {
    Haptics.impact('heavy');

    const newHighlight: Highlight = {
      id: Date.now().toString(),
      timestamp: duration,
    };
    setHighlights((prev) => [...prev, newHighlight]);
  }, [duration]);

  const clearJustCompleted = useCallback(() => {
    setJustCompleted(false);
  }, []);

  /**
   * 未保存の録音ドラフトを確認（アプリ起動時に呼び出す）
   */
  const checkForRecovery = useCallback(async (): Promise<RecordingDraft | null> => {
    if (isRecording) return null;
    return await loadDraft();
  }, [isRecording, loadDraft]);

  /**
   * 復元ドラフトをクリア（ユーザーが破棄を選択した場合）
   */
  const clearRecoveryDraft = useCallback(async (): Promise<void> => {
    await clearDraft();
  }, [clearDraft]);

  const state: RecordingSessionState = {
    isRecording,
    isPaused,
    duration,
    highlights,
    hasPermission,
    realtimeEnabled,
    translationEnabled,
    translationTargetLanguage,
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
        checkForRecovery,
        clearRecoveryDraft,
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
  checkForRecovery: async () => null,
  clearRecoveryDraft: async () => {},
};

export function useRecordingSession() {
  const context = useContext(RecordingSessionContext);
  return context ?? defaultValue;
}
