import type { Meta, StoryObj } from "@storybook/react";
import { View, Text, StyleSheet, TouchableOpacity, Animated } from "react-native";
import { useColors } from "@/packages/hooks/use-colors";
import { IconSymbol } from "@/packages/components/ui/icon-symbol";

interface RecordControlsProps {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  realtimeEnabled: boolean;
  connectionStatus: "connected" | "connecting" | "disconnected" | "error";
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
}

function RecordControlsDemo({ isRecording, isPaused, duration, realtimeEnabled, connectionStatus }: RecordControlsProps) {
  const colors = useColors();
  const pulseAnim = new Animated.Value(1);

  return (
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
                { backgroundColor: isPaused ? colors.muted : colors.recording, transform: [{ scale: pulseAnim }] },
              ]}
            />
            <Text style={[styles.recordingText, { color: isPaused ? colors.muted : colors.recording }]}>
              {isPaused ? "PAUSED" : "REC"}
            </Text>
          </View>
        )}
      </View>

      {/* Timer */}
      <View style={styles.timerContainer}>
        <Text style={[styles.timer, { color: colors.foreground }]}>{formatTime(duration)}</Text>
      </View>

      {/* Waveform Mock */}
      <View style={[styles.waveform, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}>
        <View style={styles.waveformBars}>
          {Array.from({ length: 50 }).map((_, i) => {
            const barHeight = isRecording && !isPaused ? 8 + Math.random() * 52 : 20;
            return (
              <View
                key={i}
                style={[
                  styles.waveformBar,
                  {
                    backgroundColor: isRecording && !isPaused ? colors.primary : colors.muted,
                    height: barHeight,
                  },
                ]}
              />
            );
          })}
        </View>
      </View>

      {/* Realtime Transcription Section */}
      {isRecording && realtimeEnabled && (
        <View style={[styles.realtimeSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.realtimeHeader}>
            <View style={styles.realtimeHeaderLeft}>
              <IconSymbol name="text.bubble" size={16} color={colors.primary} />
              <Text style={[styles.realtimeTitle, { color: colors.foreground }]}>
                リアルタイム文字起こし
              </Text>
            </View>
            <View style={styles.realtimeStatus}>
              {connectionStatus === "connected" && (
                <>
                  <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
                  <Text style={[styles.statusText, { color: colors.success }]}>接続中</Text>
                </>
              )}
              {connectionStatus === "connecting" && (
                <>
                  <View style={[styles.statusDot, { backgroundColor: colors.warning }]} />
                  <Text style={[styles.statusText, { color: colors.warning }]}>接続中...</Text>
                </>
              )}
              {connectionStatus === "disconnected" && (
                <>
                  <View style={[styles.statusDot, { backgroundColor: colors.muted }]} />
                  <Text style={[styles.statusText, { color: colors.muted }]}>未接続</Text>
                </>
              )}
              {connectionStatus === "error" && (
                <>
                  <View style={[styles.statusDot, { backgroundColor: colors.error }]} />
                  <Text style={[styles.statusText, { color: colors.error }]}>エラー</Text>
                </>
              )}
            </View>
          </View>
          <Text style={[styles.realtimePlaceholder, { color: colors.muted }]}>
            話し始めると、ここに文字起こし結果が表示されます...
          </Text>
        </View>
      )}

      {/* Controls */}
      {!isRecording && (
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.recordButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <IconSymbol name="mic.fill" size={40} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={[styles.instructions, { color: colors.muted }]}>
            タップして録音を開始
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 72,
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
  controls: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
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
  instructions: {
    textAlign: "center",
    fontSize: 14,
  },
  realtimeSection: {
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    minHeight: 120,
  },
  realtimeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  realtimeHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  realtimeTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  realtimeStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  realtimePlaceholder: {
    fontSize: 13,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 20,
  },
});

const meta: Meta<typeof RecordControlsDemo> = {
  title: "Recording/RecordControls",
  component: RecordControlsDemo,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof RecordControlsDemo>;

export const ReadyToRecord: Story = {
  args: {
    isRecording: false,
    isPaused: false,
    duration: 0,
    realtimeEnabled: false,
    connectionStatus: "disconnected",
  },
};

export const Recording: Story = {
  args: {
    isRecording: true,
    isPaused: false,
    duration: 65.42,
    realtimeEnabled: false,
    connectionStatus: "disconnected",
  },
};

export const RecordingWithRealtime: Story = {
  args: {
    isRecording: true,
    isPaused: false,
    duration: 120.5,
    realtimeEnabled: true,
    connectionStatus: "connected",
  },
};

export const RealtimeConnecting: Story = {
  args: {
    isRecording: true,
    isPaused: false,
    duration: 5.0,
    realtimeEnabled: true,
    connectionStatus: "connecting",
  },
};

export const RealtimeError: Story = {
  args: {
    isRecording: true,
    isPaused: false,
    duration: 45.0,
    realtimeEnabled: true,
    connectionStatus: "error",
  },
};

export const Paused: Story = {
  args: {
    isRecording: true,
    isPaused: true,
    duration: 180.0,
    realtimeEnabled: false,
    connectionStatus: "disconnected",
  },
};

export const LongRecording: Story = {
  args: {
    isRecording: true,
    isPaused: false,
    duration: 3720.0,
    realtimeEnabled: true,
    connectionStatus: "connected",
  },
};
