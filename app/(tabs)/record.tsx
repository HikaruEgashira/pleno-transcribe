import { useEffect, useRef } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
} from "react-native";
import { useKeepAwake } from "expo-keep-awake";

import { ScreenContainer } from "@/packages/components/screen-container";
import { IconSymbol } from "@/packages/components/ui/icon-symbol";
import { useColors } from "@/packages/hooks/use-colors";
import { useResponsive } from "@/packages/hooks/use-responsive";
import { useRecordingSession } from "@/packages/lib/recording-session-context";

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
}

export default function RecordScreen() {
  const colors = useColors();
  const { isDesktop, layoutMode } = useResponsive();
  const scrollViewRef = useRef<ScrollView>(null);

  const {
    state,
    pulseAnim,
    realtimeState,
    mergedSegments,
    getTranslation,
    getTranslationStatus,
    isTranslating,
    startRecording,
  } = useRecordingSession();

  const {
    isRecording,
    isPaused,
    duration,
    hasPermission,
    realtimeEnabled,
    translationEnabled,
    meteringHistory,
  } = state;

  // Keep screen awake during recording
  useKeepAwake();

  // Auto-scroll realtime transcript
  useEffect(() => {
    if (realtimeState.segments.length > 0 && scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [realtimeState.segments]);

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
      <View style={[styles.container, isDesktop && styles.containerDesktop]}>
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

        {/* Waveform */}
        <View style={[styles.waveform, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}>
          <View style={styles.waveformBars}>
            {Array.from({ length: 50 }).map((_, i) => {
              const metering = meteringHistory[i] ?? -160;
              // -30dB〜0dBを0〜1にマッピング、pow(1.3)でコントラスト強調
              const value = Math.max(0, Math.min(1, (metering + 30) / 30));
              const normalizedHeight = Math.pow(value, 1.3);
              const barHeight = isRecording && !isPaused ? 8 + normalizedHeight * 52 : 20;
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

        {/* Realtime Transcription */}
        {isRecording && realtimeEnabled && (
          <View style={[styles.realtimeSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.realtimeHeader}>
              <View style={styles.realtimeHeaderLeft}>
                <IconSymbol name="text.bubble" size={16} color={colors.primary} />
                <Text style={[styles.realtimeTitle, { color: colors.foreground }]}>
                  リアルタイム文字起こし
                </Text>
                {translationEnabled && isTranslating && (
                  <Text style={[styles.translatingBadge, { color: colors.primary, backgroundColor: colors.primary + "20" }]}>
                    翻訳中...
                  </Text>
                )}
              </View>
              <View style={styles.realtimeStatus}>
                {realtimeState.connectionStatus === "connected" && (
                  <>
                    <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
                    <Text style={[styles.statusText, { color: colors.success }]}>接続中</Text>
                  </>
                )}
                {realtimeState.connectionStatus === "connecting" && (
                  <>
                    <View style={[styles.statusDot, { backgroundColor: colors.warning }]} />
                    <Text style={[styles.statusText, { color: colors.warning }]}>接続中...</Text>
                  </>
                )}
                {realtimeState.connectionStatus === "disconnected" && (
                  <>
                    <View style={[styles.statusDot, { backgroundColor: colors.muted }]} />
                    <Text style={[styles.statusText, { color: colors.muted }]}>未接続</Text>
                  </>
                )}
                {realtimeState.connectionStatus === "error" && (
                  <>
                    <View style={[styles.statusDot, { backgroundColor: colors.error }]} />
                    <Text style={[styles.statusText, { color: colors.error }]}>エラー</Text>
                  </>
                )}
              </View>
            </View>
            <ScrollView
              ref={scrollViewRef}
              style={styles.realtimeContent}
              showsVerticalScrollIndicator={true}
            >
              {realtimeState.error && (
                <Text style={[styles.realtimePlaceholder, { color: colors.error }]}>
                  エラー: {realtimeState.error}
                </Text>
              )}
              {!realtimeState.error && realtimeState.segments.length === 0 ? (
                <Text style={[styles.realtimePlaceholder, { color: colors.muted }]}>
                  話し始めると、ここに文字起こし結果が表示されます...
                </Text>
              ) : (
                mergedSegments.map((segment) => {
                  const translation = translationEnabled ? getTranslation(segment.id) : undefined;
                  const translationStatus = translationEnabled ? getTranslationStatus(segment.id) : undefined;

                  return (
                    <View key={segment.id} style={styles.segmentItem}>
                      {segment.speaker && (
                        <Text style={[styles.speakerLabel, { color: colors.secondary }]}>
                          [{segment.speaker}]
                        </Text>
                      )}
                      {/* 並列表示レイアウト */}
                      <View style={translationEnabled ? styles.segmentRow : undefined}>
                        {/* 元テキスト */}
                        <View style={translationEnabled ? styles.segmentColumn : undefined}>
                          <Text
                            style={[
                              styles.segmentText,
                              {
                                color: segment.isPartial ? colors.muted : colors.foreground,
                                fontStyle: segment.isPartial ? "italic" : "normal",
                              },
                            ]}
                          >
                            {segment.text}
                          </Text>
                        </View>
                        {/* 翻訳テキスト */}
                        {translationEnabled && (
                          <View style={[styles.segmentColumn, styles.translationColumn, { borderLeftColor: colors.border }]}>
                            {translationStatus === "pending" ? (
                              <Text style={[styles.translationPending, { color: colors.muted }]}>
                                翻訳中...
                              </Text>
                            ) : translationStatus === "error" ? (
                              <Text style={[styles.translationError, { color: colors.error }]}>
                                翻訳エラー
                              </Text>
                            ) : translation ? (
                              <Text
                                style={[
                                  styles.segmentText,
                                  {
                                    color: segment.isPartial ? colors.primary + "99" : colors.primary,
                                    fontStyle: segment.isPartial ? "italic" : "normal",
                                  },
                                ]}
                              >
                                {translation}
                              </Text>
                            ) : null}
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        )}

        {/* Controls - Not recording: centered */}
        {!isRecording && (
          <View style={styles.controls}>
            <TouchableOpacity
              onPress={startRecording}
              style={[styles.recordButton, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
            >
              <IconSymbol name="mic.fill" size={40} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={[styles.instructions, { color: colors.muted }]}>
              ボタンをタップして録音を開始
            </Text>
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 72,
  },
  containerDesktop: {
    maxWidth: 900,
    alignSelf: "center",
    width: "100%",
    paddingHorizontal: 40,
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
    flex: 1,
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
  realtimeContent: {
    flex: 1,
  },
  realtimePlaceholder: {
    fontSize: 13,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 20,
  },
  segmentItem: {
    marginBottom: 8,
  },
  speakerLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 2,
  },
  segmentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  segmentRow: {
    flexDirection: "row",
    gap: 12,
  },
  segmentColumn: {
    flex: 1,
  },
  translationColumn: {
    borderLeftWidth: 2,
    paddingLeft: 12,
  },
  translationPending: {
    fontSize: 12,
    fontStyle: "italic",
  },
  translationError: {
    fontSize: 12,
  },
  translatingBadge: {
    fontSize: 10,
    fontWeight: "500",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
});
