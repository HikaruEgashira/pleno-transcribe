import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useRecordingSession } from '@/lib/recording-session-context';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function GlobalRecordingBar() {
  const colors = useColors();
  const {
    state,
    pulseAnim,
    pauseResume,
    stopRecording,
    cancelRecording,
  } = useRecordingSession();

  const { isRecording, isPaused, duration } = state;

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
              { backgroundColor: colors.recording, transform: [{ scale: pulseAnim }] },
            ]}
          />
          <Text style={[styles.timer, { color: colors.foreground }]}>{formatTime(duration)}</Text>
        </View>

        {/* Right: Controls */}
        <View style={styles.controls}>
          <TouchableOpacity onPress={cancelRecording} style={styles.iconButton}>
            <IconSymbol name="xmark" size={20} color={colors.foreground} />
          </TouchableOpacity>

          <TouchableOpacity onPress={pauseResume} style={styles.iconButton}>
            <IconSymbol
              name={isPaused ? 'play.fill' : 'pause.fill'}
              size={20}
              color={colors.foreground}
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={stopRecording} style={styles.stopButton}>
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
