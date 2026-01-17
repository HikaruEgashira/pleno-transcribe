import type { Meta, StoryObj } from "@storybook/react";
import { View, Text, StyleSheet, Animated, TouchableOpacity } from "react-native";
import { useColors } from "@/packages/hooks/use-colors";
import { IconSymbol } from "@/packages/components/ui/icon-symbol";

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

interface GlobalRecordingBarProps {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
}

function MockGlobalRecordingBar({ isRecording, isPaused, duration }: GlobalRecordingBarProps) {
  const colors = useColors();
  const pulseAnim = new Animated.Value(1);

  if (!isRecording) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      ]}
    >
      <View style={styles.row}>
        {/* Left: Recording indicator */}
        <View style={styles.leftSection}>
          <Animated.View
            style={[
              styles.recordingDot,
              { backgroundColor: isPaused ? colors.muted : colors.recording, transform: [{ scale: pulseAnim }] },
            ]}
          />
          <Text style={[styles.timer, { color: colors.foreground }]}>{formatTime(duration)}</Text>
        </View>

        {/* Right: Controls */}
        <View style={styles.controls}>
          <TouchableOpacity style={styles.iconButton}>
            <IconSymbol name="xmark" size={20} color={colors.foreground} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconButton}>
            <IconSymbol
              name={isPaused ? 'play.fill' : 'pause.fill'}
              size={20}
              color={colors.foreground}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.stopButton}>
            <IconSymbol name="stop.fill" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timer: {
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const meta: Meta<typeof MockGlobalRecordingBar> = {
  title: "Recording/GlobalRecordingBar",
  component: MockGlobalRecordingBar,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: "#f5f5f5" }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof MockGlobalRecordingBar>;

export const Recording: Story = {
  args: {
    isRecording: true,
    isPaused: false,
    duration: 65,
  },
};

export const Paused: Story = {
  args: {
    isRecording: true,
    isPaused: true,
    duration: 120,
  },
};

export const LongRecording: Story = {
  args: {
    isRecording: true,
    isPaused: false,
    duration: 3720,
  },
};

export const NotRecording: Story = {
  args: {
    isRecording: false,
    isPaused: false,
    duration: 0,
  },
};
