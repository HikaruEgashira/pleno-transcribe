import { useState, useEffect, useRef, useCallback } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  Alert,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { useAudioRecorder, RecordingPresets, AudioModule } from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRecordings } from "@/lib/recordings-context";
import { useColors } from "@/hooks/use-colors";
import { Recording, Highlight } from "@/types/recording";

const RECORDING_OPTIONS = RecordingPresets.HIGH_QUALITY;

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
}

export default function RecordScreen() {
  const router = useRouter();
  const colors = useColors();
  const { addRecording } = useRecordings();

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [notes, setNotes] = useState("");
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const audioRecorder = useAudioRecorder(RECORDING_OPTIONS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Request microphone permission
  useEffect(() => {
    (async () => {
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

  // Pulse animation for recording indicator
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

  const handleStartRecording = useCallback(async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      // Prepare the recorder before starting
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);
      setHighlights([]);
      setNotes("");
    } catch (error) {
      console.error("Failed to start recording:", error);
      Alert.alert("エラー", "録音を開始できませんでした");
    }
  }, [audioRecorder]);

  const handlePauseResume = useCallback(async () => {
    if (Platform.OS !== "web") {
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
      console.error("Failed to pause/resume:", error);
    }
  }, [audioRecorder, isPaused]);

  const handleStopRecording = useCallback(async () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    try {
      await audioRecorder.stop();
      setIsRecording(false);
      setIsPaused(false);

      const uri = audioRecorder.uri;
      if (!uri) {
        Alert.alert("エラー", "録音ファイルが見つかりません");
        return;
      }

      // Generate unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `recording_${timestamp}.m4a`;
      const newUri = `${FileSystem.documentDirectory}recordings/${filename}`;

      // Ensure directory exists
      await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}recordings/`, {
        intermediates: true,
      });

      // Move file to permanent location
      await FileSystem.moveAsync({
        from: uri,
        to: newUri,
      });

      // Create recording object
      const now = new Date();
      const newRecording: Recording = {
        id: Date.now().toString(),
        title: `録音 ${now.toLocaleDateString("ja-JP")} ${now.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}`,
        audioUri: newUri,
        duration: Math.floor(duration),
        createdAt: now,
        updatedAt: now,
        highlights,
        notes,
        qaHistory: [],
        status: "saved",
      };

      await addRecording(newRecording);

      // Reset state
      setDuration(0);
      setHighlights([]);
      setNotes("");

      // Navigate to note detail
      router.push(`/note/${newRecording.id}`);
    } catch (error) {
      console.error("Failed to stop recording:", error);
      Alert.alert("エラー", "録音の保存に失敗しました");
    }
  }, [audioRecorder, duration, highlights, notes, addRecording, router]);

  const handleAddHighlight = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }

    const newHighlight: Highlight = {
      id: Date.now().toString(),
      timestamp: duration,
    };
    setHighlights((prev) => [...prev, newHighlight]);
  }, [duration]);

  if (hasPermission === null) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <Text style={{ color: colors.foreground }}>マイクの許可を確認中...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (hasPermission === false) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <IconSymbol name="mic.fill" size={64} color={colors.error} />
          <Text style={[styles.permissionTitle, { color: colors.foreground }]}>
            マイクへのアクセスが必要です
          </Text>
          <Text style={[styles.permissionText, { color: colors.muted }]}>
            設定からマイクへのアクセスを許可してください
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {isRecording ? "録音中" : "新規録音"}
          </Text>
          {isRecording && (
            <View style={styles.recordingIndicator}>
              <Animated.View
                style={[
                  styles.recordingDot,
                  { backgroundColor: colors.recording, transform: [{ scale: pulseAnim }] },
                ]}
              />
              <Text style={[styles.recordingText, { color: colors.recording }]}>REC</Text>
            </View>
          )}
        </View>

        {/* Timer */}
        <View style={styles.timerContainer}>
          <Text style={[styles.timer, { color: colors.foreground }]}>{formatTime(duration)}</Text>
        </View>

        {/* Waveform placeholder */}
        <View style={[styles.waveform, { backgroundColor: colors.surface }]}>
          <View style={styles.waveformBars}>
            {Array.from({ length: 50 }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.waveformBar,
                  {
                    backgroundColor: isRecording && !isPaused ? colors.primary : colors.border,
                    height: isRecording && !isPaused ? 10 + Math.random() * 50 : 20,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Highlights count */}
        {highlights.length > 0 && (
          <View style={styles.highlightsInfo}>
            <IconSymbol name="star.fill" size={16} color={colors.highlight} />
            <Text style={[styles.highlightsText, { color: colors.highlight }]}>
              {highlights.length}個のハイライト
            </Text>
          </View>
        )}

        {/* Notes input */}
        {isRecording && (
          <View style={[styles.notesContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput
              style={[styles.notesInput, { color: colors.foreground }]}
              placeholder="メモを追加..."
              placeholderTextColor={colors.muted}
              value={notes}
              onChangeText={setNotes}
              multiline
              maxLength={500}
            />
          </View>
        )}

        {/* Controls */}
        <View style={styles.controls}>
          {!isRecording ? (
            <TouchableOpacity
              onPress={handleStartRecording}
              style={[styles.recordButton, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
            >
              <IconSymbol name="mic.fill" size={40} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <View style={styles.recordingControls}>
              {/* Highlight button */}
              <TouchableOpacity
                onPress={handleAddHighlight}
                style={[styles.controlButton, { backgroundColor: colors.highlight }]}
              >
                <IconSymbol name="star.fill" size={24} color="#FFFFFF" />
              </TouchableOpacity>

              {/* Pause/Resume button */}
              <TouchableOpacity
                onPress={handlePauseResume}
                style={[styles.pauseButton, { backgroundColor: isPaused ? colors.primary : colors.surface }]}
              >
                <IconSymbol
                  name={isPaused ? "play.fill" : "pause.fill"}
                  size={32}
                  color={isPaused ? "#FFFFFF" : colors.foreground}
                />
              </TouchableOpacity>

              {/* Stop button */}
              <TouchableOpacity
                onPress={handleStopRecording}
                style={[styles.controlButton, { backgroundColor: colors.error }]}
              >
                <IconSymbol name="stop.fill" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Instructions */}
        {!isRecording && (
          <Text style={[styles.instructions, { color: colors.muted }]}>
            ボタンをタップして録音を開始
          </Text>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
  },
  permissionText: {
    fontSize: 14,
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  recordingText: {
    fontSize: 14,
    fontWeight: "700",
  },
  timerContainer: {
    alignItems: "center",
    paddingVertical: 32,
  },
  timer: {
    fontSize: 56,
    fontWeight: "300",
    fontVariant: ["tabular-nums"],
  },
  waveform: {
    height: 120,
    borderRadius: 16,
    padding: 16,
    justifyContent: "center",
  },
  waveformBars: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: "100%",
  },
  waveformBar: {
    width: 3,
    borderRadius: 2,
  },
  highlightsInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 16,
  },
  highlightsText: {
    fontSize: 14,
    fontWeight: "500",
  },
  notesContainer: {
    marginTop: 20,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    minHeight: 80,
  },
  notesInput: {
    fontSize: 15,
    lineHeight: 22,
  },
  controls: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  recordButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  recordingControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  pauseButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  instructions: {
    textAlign: "center",
    fontSize: 14,
    marginBottom: 40,
  },
});
