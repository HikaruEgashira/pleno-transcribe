import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { Platform, Alert, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useAudioRecorder, RecordingPresets, AudioModule, setAudioModeAsync } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useRecordings } from './recordings-context';
import { useRealtimeTranscription } from '@/hooks/use-realtime-transcription';
import { useAudioMetering } from '@/hooks/use-audio-metering';
import { Recording, Highlight } from '@/types/recording';

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
  startRecording: () => Promise<void>;
  pauseResume: () => Promise<void>;
  stopRecording: () => Promise<void>;
  cancelRecording: () => Promise<void>;
  addHighlight: () => void;
  clearJustCompleted: () => void;
  tryAutoStartOnFirstLaunch: () => void;
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
  const [currentRecordingId, setCurrentRecordingId] = useState<string | null>(null);
  const [justCompleted, setJustCompleted] = useState(false);

  const isStartingRef = useRef(false);
  const hasAutoStartedOnFirstLaunchRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const audioRecorder = useAudioRecorder(RECORDING_OPTIONS);
  const [meteringHistory, setMeteringHistory] = useState<number[]>([]);
  const [fullMeteringHistory, setFullMeteringHistory] = useState<number[]>([]);
  const metering = useAudioMetering(isRecording && !isPaused);

  const {
    state: realtimeState,
    startSession: startRealtimeSession,
    stopSession: stopRealtimeSession,
    consolidateSegments,
    mergedSegments,
  } = useRealtimeTranscription();

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const saved = await AsyncStorage.getItem('app-settings');
        if (saved) {
          const settings = JSON.parse(saved);
          setRealtimeEnabled(settings.realtimeTranscription?.enabled || false);
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

  // Update metering history
  useEffect(() => {
    if (isRecording && !isPaused) {
      setMeteringHistory((prev) => {
        const newHistory = [...prev, metering];
        return newHistory.slice(-50);
      });
      setFullMeteringHistory((prev) => [...prev, metering]);
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

      if (realtimeEnabled) {
        try {
          await startRealtimeSession(recordingId);
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
  }, [audioRecorder, realtimeEnabled, startRealtimeSession, isRecording]);

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
          const transcriptSegments = realtimeState.segments
            .filter((s) => !s.isPartial)
            .map((s) => ({
              text: s.text,
              startTime: s.timestamp,
              endTime: s.timestamp,
              speaker: s.speaker,
            }));
          await setTranscript(recordingId, {
            text: realtimeText,
            segments: transcriptSegments,
            language: 'ja',
            processedAt: now,
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
  }, [audioRecorder, duration, highlights, addRecording, router, currentRecordingId, realtimeEnabled, stopRealtimeSession, realtimeState.segments, consolidateSegments, setTranscript]);

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

  const tryAutoStartOnFirstLaunch = useCallback(() => {
    if (hasAutoStartedOnFirstLaunchRef.current || isRecording) {
      return;
    }
    if (hasPermission) {
      hasAutoStartedOnFirstLaunchRef.current = true;
      startRecording();
    }
  }, [hasPermission, isRecording, startRecording]);

  const state: RecordingSessionState = {
    isRecording,
    isPaused,
    duration,
    highlights,
    hasPermission,
    realtimeEnabled,
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
        startRecording,
        pauseResume,
        stopRecording,
        cancelRecording,
        addHighlight: addHighlightHandler,
        clearJustCompleted,
        tryAutoStartOnFirstLaunch,
      }}
    >
      {children}
    </RecordingSessionContext.Provider>
  );
}

export function useRecordingSession() {
  const context = useContext(RecordingSessionContext);
  if (!context) {
    throw new Error('useRecordingSession must be used within a RecordingSessionProvider');
  }
  return context;
}
