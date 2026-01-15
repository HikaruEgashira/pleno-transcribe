import { useState, useEffect, useCallback } from "react";
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAudioPlayer, setAudioModeAsync } from "expo-audio";

import { ScreenContainer } from "@/packages/components/screen-container";
import { Haptics, Storage, FileSystem } from "@/packages/platform";
import { IconSymbol } from "@/packages/components/ui/icon-symbol";
import { useRecordings } from "@/packages/lib/recordings-context";
import { useColors } from "@/packages/hooks/use-colors";
import { QAMessage } from "@/packages/types/recording";
import { trpc } from "@/packages/lib/trpc";
import { GlobalRecordingBar } from "@/packages/components/global-recording-bar";

type TabType = "audio" | "transcript" | "summary" | "qa";

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const { getRecording, updateRecording, setTranscript, setSummary, addQAMessage } = useRecordings();

  const [activeTab, setActiveTab] = useState<TabType>("audio");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [qaInput, setQaInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcriptionProvider, setTranscriptionProvider] = useState<"elevenlabs" | "gemini">("gemini");

  const recording = getRecording(id || "");
  const player = useAudioPlayer(recording?.audioUri || "");

  // Load transcription provider from settings and handle auto-processing
  useEffect(() => {
    const loadProvider = async () => {
      try {
        const saved = await Storage.getItem("app-settings");
        if (saved) {
          const settings = JSON.parse(saved);
          if (settings.transcriptionProvider) {
            setTranscriptionProvider(settings.transcriptionProvider);
          }

          // Auto transcribe if enabled and not already transcribed
          if (settings.autoTranscribe && recording && !recording.transcript && !isProcessing) {
            console.log("[Auto] Starting auto-transcription");
            handleTranscribe();
          }
        }
      } catch (error) {
        console.error("Failed to load transcription provider:", error);
      }
    };
    loadProvider();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording?.id]); // Re-run only when recording ID changes to avoid infinite loops

  // Auto summarize when transcription completes
  useEffect(() => {
    const autoSummarize = async () => {
      try {
        const saved = await Storage.getItem("app-settings");
        if (saved) {
          const settings = JSON.parse(saved);
          // Auto summarize if enabled, transcription exists, and summary doesn't exist yet
          if (settings.autoSummarize && recording && recording.transcript && !recording.summary && !isProcessing) {
            console.log("[Auto] Starting auto-summarization");
            handleSummarize();
          }
        }
      } catch (error) {
        console.error("Failed to auto-summarize:", error);
      }
    };
    autoSummarize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording?.transcript]); // Re-run only when transcript changes to avoid infinite loops

  // Transcription mutation
  const transcribeMutation = trpc.ai.transcribe.useMutation();

  // Summary mutation
  const summarizeMutation = trpc.ai.chat.useMutation();

  // Q&A mutation
  const qaMutation = trpc.ai.askQuestion.useMutation();

  // Tags mutation
  const tagsMutation = trpc.ai.generateTags.useMutation();

  // Action items mutation
  const actionItemsMutation = trpc.ai.extractActionItems.useMutation();

  // Keywords mutation
  const keywordsMutation = trpc.ai.extractKeywords.useMutation();

  // Sentiment analysis mutation
  const sentimentMutation = trpc.ai.analyzeSentiment.useMutation();

  // Export mutation
  const exportMutation = trpc.ai.exportMarkdown.useMutation();

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true });
    return () => {
      player.release();
    };
  }, [player]);

  useEffect(() => {
    if (player) {
      const interval = setInterval(() => {
        if (isPlaying) {
          setCurrentTime(player.currentTime);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [player, isPlaying]);

  const handlePlayPause = useCallback(() => {
    Haptics.impact('light');
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, player]);

  const handleSeek = useCallback(
    (time: number) => {
      player.seekTo(time);
      setCurrentTime(time);
    },
    [player]
  );

  const handleTranscribe = async () => {
    if (!recording) return;
    setIsProcessing(true);
    updateRecording(recording.id, { status: "transcribing" });

    try {
      // Read audio file and convert to base64
      let audioBase64: string | undefined;
      let filename = "recording.m4a";

      if (recording.audioUri) {
        console.log("[Transcribe] Audio URI:", recording.audioUri.substring(0, 100) + "...");

        // Handle Web platform
        if (Platform.OS === "web") {
          console.log("[Transcribe] Running on web");

          // Check if audioUri is already a data URL
          if (recording.audioUri.startsWith("data:")) {
            console.log("[Transcribe] Data URL detected - extracting base64");
            // Extract base64 from data URL
            const base64Data = recording.audioUri.split(',')[1];
            if (!base64Data) {
              throw new Error("Data URLからbase64データを抽出できませんでした");
            }
            console.log("[Transcribe] Base64 data length:", base64Data.length);
            audioBase64 = base64Data;
            filename = "recording.webm"; // Web recordings are typically webm
          } else if (recording.audioUri.startsWith("blob:")) {
            // Handle blob URL (fallback for older recordings)
            console.log("[Transcribe] Blob URL detected - fetching and converting");
            try {
              const response = await fetch(recording.audioUri);
              const blob = await response.blob();

              // Convert blob to base64
              const base64Data = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                  const result = reader.result as string;
                  // Remove data URL prefix (e.g., "data:audio/webm;base64,")
                  const base64 = result.split(',')[1];
                  resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });

              console.log("[Transcribe] Base64 data length:", base64Data.length);
              audioBase64 = base64Data;
              filename = "recording.webm";
            } catch (webError) {
              console.error("[Transcribe] Failed to read blob:", webError);
              throw new Error("Blob URLからの音声データの読み込みに失敗しました");
            }
          } else {
            throw new Error("未対応の音声URI形式です: " + recording.audioUri.substring(0, 50));
          }
        } else {
          // Handle native platforms (iOS/Android)
          if (recording.audioUri.startsWith("file://") || !recording.audioUri.startsWith("http")) {
            console.log("[Transcribe] Reading local file as base64...");

            // Check if file exists
            const fileInfo = await FileSystem.getInfoAsync(recording.audioUri);
            console.log("[Transcribe] File info:", fileInfo);

            if (!fileInfo.exists) {
              throw new Error("音声ファイルが見つかりません: " + recording.audioUri);
            }

            // Read local file as base64
            const base64Data = await FileSystem.readAsBase64(recording.audioUri);

            console.log("[Transcribe] Base64 data length:", base64Data.length);
            audioBase64 = base64Data;
            filename = recording.audioUri.split("/").pop() || "recording.m4a";
          }
        }
      }

      if (!audioBase64) {
        throw new Error("音声データの読み込みに失敗しました");
      }

      console.log("[Transcribe] Sending to API with base64 length:", audioBase64.length);

      const result = await transcribeMutation.mutateAsync({
        audioBase64,
        filename,
        languageCode: "ja",
        diarize: transcriptionProvider === "elevenlabs",
        provider: transcriptionProvider,
      });

      console.log("[Transcribe] Result:", result);

      if (result.text) {
        setTranscript(recording.id, {
          text: result.text,
          segments: [],
          language: result.languageCode || "ja",
          processedAt: new Date(),
        });
      }
    } catch (error) {
      console.error("Transcription error:", error);
      const errorMessage = error instanceof Error ? error.message : "文字起こしに失敗しました";
      // Show error to user via alert or state
      if (Platform.OS !== "web") {
        const { Alert } = await import("react-native");
        Alert.alert("エラー", errorMessage);
      } else {
        alert(errorMessage);
      }
      updateRecording(recording.id, { status: "saved" });
    } finally {
      setIsProcessing(false);
    }
  };

const handleSummarize = async () => {
    if (!recording?.transcript) return;
    setIsProcessing(true);
    updateRecording(recording.id, { status: "summarizing" });

    try {
      const result = await summarizeMutation.mutateAsync({
        message: `以下の文字起こしテキストを要約してください。概要、重要なポイント3つ、アクションアイテム（あれば）を箇条書きで出力してください：\n\n${recording.transcript.text}`,
      });
      if (result.message) {
        const lines = result.message.split("\n").filter((l: string) => l.trim());
        setSummary(recording.id, {
          overview: lines[0] || "",
          keyPoints: lines.slice(1, 4),
          actionItems: lines.slice(4, 7),
          processedAt: new Date(),
        });
      }

      // Auto-generate AI analysis after summarization
      if (recording.tags.length === 0) {
        handleGenerateTags();
      }
      if (recording.actionItems.length === 0) {
        handleExtractActionItems();
      }
      if (recording.keywords.length === 0) {
        handleExtractKeywords();
      }
      if (!recording.sentiment) {
        handleAnalyzeSentiment();
      }
    } catch (error) {
      console.error("Summary error:", error);
      updateRecording(recording.id, { status: "transcribed" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateTags = async () => {
    if (!recording?.transcript) return;

    try {
      const result = await tagsMutation.mutateAsync({
        text: recording.transcript.text,
        maxTags: 5,
      });
      if (result.tags && result.tags.length > 0) {
        updateRecording(recording.id, { tags: result.tags });
      }
    } catch (error) {
      console.error("Tags generation error:", error);
    }
  };

  const handleExtractActionItems = async () => {
    if (!recording?.transcript) return;

    try {
      const result = await actionItemsMutation.mutateAsync({
        text: recording.transcript.text,
        maxItems: 10,
      });
      if (result.actionItems && result.actionItems.length > 0) {
        updateRecording(recording.id, { actionItems: result.actionItems });
      }
    } catch (error) {
      console.error("Action items extraction error:", error);
    }
  };

  const handleExtractKeywords = async () => {
    if (!recording?.transcript) return;

    try {
      const result = await keywordsMutation.mutateAsync({
        text: recording.transcript.text,
        maxKeywords: 10,
      });
      if (result.keywords && result.keywords.length > 0) {
        updateRecording(recording.id, { keywords: result.keywords });
      }
    } catch (error) {
      console.error("Keywords extraction error:", error);
    }
  };

  const handleAnalyzeSentiment = async () => {
    if (!recording?.transcript) return;

    try {
      const result = await sentimentMutation.mutateAsync({
        text: recording.transcript.text,
      });
      if (result) {
        updateRecording(recording.id, { sentiment: result });
      }
    } catch (error) {
      console.error("Sentiment analysis error:", error);
    }
  };

  const handleExportMarkdown = async () => {
    if (!recording) return;

    try {
      const result = await exportMutation.mutateAsync({
        recordingId: recording.id,
        title: recording.title,
        transcript: recording.transcript ? {
          text: recording.transcript.text,
          segments: recording.transcript.segments.map(s => ({
            text: s.text,
            startTime: s.startTime,
            endTime: s.endTime,
            speaker: s.speaker,
          })),
        } : undefined,
        summary: recording.summary ? {
          overview: recording.summary.overview,
          keyPoints: recording.summary.keyPoints,
          actionItems: recording.summary.actionItems,
        } : undefined,
        keywords: recording.keywords.map(k => ({
          text: k.text,
          importance: k.importance,
          frequency: k.frequency,
        })),
        tags: recording.tags.map(t => ({ name: t.name })),
        actionItems: recording.actionItems.map(a => ({
          text: a.text,
          priority: a.priority,
          completed: a.completed,
        })),
        sentiment: recording.sentiment ? {
          overallSentiment: recording.sentiment.overallSentiment,
          summary: recording.sentiment.summary,
        } : undefined,
      });

      if (result.markdown) {
        // Web: ダウンロードリンクを作成
        if (Platform.OS === "web") {
          const blob = new Blob([result.markdown], { type: "text/markdown" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = result.filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } else {
          // Native: ファイルを保存
          const fileUri = `${FileSystem.cacheDirectory}${result.filename}`;
          await FileSystem.writeAsString(fileUri, result.markdown, {
            encoding: FileSystem.EncodingType.UTF8,
          });
          // 共有シートを表示
          const { shareAsync } = await import("expo-sharing");
          await shareAsync(fileUri);
        }
      }
    } catch (error) {
      console.error("Export error:", error);
      if (Platform.OS !== "web") {
        const { Alert } = await import("react-native");
        Alert.alert("エラー", "エクスポートに失敗しました");
      } else {
        alert("エクスポートに失敗しました");
      }
    }
  };

  const handleAskQuestion = async () => {
    if (!recording?.transcript || !qaInput.trim()) return;

    const userMessage: QAMessage = {
      id: Date.now().toString(),
      role: "user",
      content: qaInput,
      timestamp: new Date(),
    };
    addQAMessage(recording.id, userMessage);
    const question = qaInput;
    setQaInput("");
    setIsProcessing(true);

    try {
      const result = await qaMutation.mutateAsync({
        question,
        transcriptText: recording.transcript.text,
        previousQA: recording.qaHistory.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });
      if (result.answer) {
        const assistantMessage: QAMessage = {
          id: Date.now().toString(),
          role: "assistant",
          content: result.answer,
          timestamp: new Date(),
        };
        addQAMessage(recording.id, assistantMessage);
      }
    } catch (error) {
      console.error("Q&A error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!recording) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View style={styles.centered}>
          <Text style={{ color: colors.foreground }}>録音が見つかりません</Text>
        </View>
      </ScreenContainer>
    );
  }

  const tabs: { key: TabType; label: string; icon: "waveform" | "doc.text.fill" | "star.fill" | "text.bubble.fill" }[] = [
    { key: "audio", label: "音声", icon: "waveform" },
    { key: "transcript", label: "文字起こし", icon: "doc.text.fill" },
    { key: "summary", label: "要約", icon: "star.fill" },
    { key: "qa", label: "Q&A", icon: "text.bubble.fill" },
  ];

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: colors.surface }]}
          >
            <IconSymbol name="arrow.left" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
              {recording.title}
            </Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              {formatTime(recording.duration)}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleExportMarkdown}
            disabled={exportMutation.isPending}
            style={[styles.exportButton, { backgroundColor: colors.surface }]}
          >
            {exportMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <IconSymbol name="square.and.arrow.up" size={20} color={colors.primary} />
            )}
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[
                styles.tab,
                activeTab === tab.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
              ]}
            >
              <IconSymbol
                name={tab.icon}
                size={18}
                color={activeTab === tab.key ? colors.primary : colors.muted}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: activeTab === tab.key ? colors.primary : colors.muted },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {activeTab === "audio" && (
            <View style={styles.audioTab}>
              {/* Waveform */}
              <View style={[styles.waveform, { backgroundColor: colors.surface }]}>
                <View style={styles.waveformBars}>
                  {Array.from({ length: 40 }).map((_, i) => {
                    const waveformValue = recording.waveformData?.[i] ?? 0.1;
                    return (
                      <View
                        key={i}
                        style={[
                          styles.waveformBar,
                          {
                            backgroundColor:
                              i / 40 < currentTime / recording.duration
                                ? colors.primary
                                : colors.border,
                            height: 20 + waveformValue * 40,
                          },
                        ]}
                      />
                    );
                  })}
                </View>
              </View>

              {/* Time display */}
              <View style={styles.timeRow}>
                <Text style={[styles.timeText, { color: colors.foreground }]}>
                  {formatTime(currentTime)}
                </Text>
                <Text style={[styles.timeText, { color: colors.muted }]}>
                  {formatTime(recording.duration)}
                </Text>
              </View>

              {/* Controls */}
              <View style={styles.controls}>
                <TouchableOpacity
                  onPress={() => handleSeek(Math.max(0, currentTime - 15))}
                  style={[styles.controlButton, { backgroundColor: colors.surface }]}
                >
                  <Text style={[styles.skipText, { color: colors.foreground }]}>-15</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handlePlayPause}
                  style={[styles.playButton, { backgroundColor: colors.primary }]}
                >
                  <IconSymbol
                    name={isPlaying ? "pause.fill" : "play.fill"}
                    size={32}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleSeek(Math.min(recording.duration, currentTime + 15))}
                  style={[styles.controlButton, { backgroundColor: colors.surface }]}
                >
                  <Text style={[styles.skipText, { color: colors.foreground }]}>+15</Text>
                </TouchableOpacity>
              </View>

              {/* Highlights */}
              {recording.highlights.length > 0 && (
                <View style={styles.highlightsSection}>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                    ハイライト
                  </Text>
                  {recording.highlights.map((h) => (
                    <TouchableOpacity
                      key={h.id}
                      onPress={() => handleSeek(h.timestamp)}
                      style={[styles.highlightItem, { backgroundColor: colors.surface }]}
                    >
                      <IconSymbol name="star.fill" size={16} color={colors.highlight} />
                      <Text style={[styles.highlightTime, { color: colors.foreground }]}>
                        {formatTime(h.timestamp)}
                      </Text>
                      {h.label && (
                        <Text style={[styles.highlightLabel, { color: colors.muted }]}>
                          {h.label}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {activeTab === "transcript" && (
            <View style={styles.transcriptTab}>
              {recording.transcript ? (
                <View style={styles.transcriptContent}>
                  {/* 翻訳がある場合は並列表示 */}
                  {recording.transcript.translation ? (
                    <>
                      <View style={styles.transcriptSection}>
                        <Text style={[styles.transcriptLabel, { color: colors.muted }]}>
                          原文
                        </Text>
                        <Text style={[styles.transcriptText, { color: colors.foreground }]}>
                          {recording.transcript.text}
                        </Text>
                      </View>
                      <View style={[styles.transcriptDivider, { backgroundColor: colors.border }]} />
                      <View style={styles.transcriptSection}>
                        <Text style={[styles.transcriptLabel, { color: colors.muted }]}>
                          翻訳 ({recording.transcript.translation.targetLanguage === 'ja' ? '日本語' : 'English'})
                        </Text>
                        <Text style={[styles.transcriptText, { color: colors.foreground }]}>
                          {recording.transcript.translation.text}
                        </Text>
                      </View>
                    </>
                  ) : (
                    <Text style={[styles.transcriptText, { color: colors.foreground }]}>
                      {recording.transcript.text}
                    </Text>
                  )}
                </View>
              ) : (
                <View style={styles.emptyTab}>
                  <IconSymbol name="doc.text.fill" size={48} color={colors.muted} />
                  <Text style={[styles.emptyText, { color: colors.muted }]}>
                    文字起こしがまだありません
                  </Text>
                  <Text style={[styles.providerHint, { color: colors.muted }]}>
                    プロバイダ: {transcriptionProvider === "gemini" ? "Gemini" : "ElevenLabs"}
                  </Text>
                  <TouchableOpacity
                    onPress={handleTranscribe}
                    disabled={isProcessing}
                    style={[styles.actionButton, { backgroundColor: colors.primary }]}
                  >
                    {isProcessing ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.actionButtonText}>文字起こしを開始</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {activeTab === "summary" && (
            <View style={styles.summaryTab}>
              {recording.summary ? (
                <>
                  <View style={styles.summarySection}>
                    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>概要</Text>
                    <Text style={[styles.summaryText, { color: colors.foreground }]}>
                      {recording.summary.overview}
                    </Text>
                  </View>

                  <View style={styles.summarySection}>
                    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                      重要なポイント
                    </Text>
                    {recording.summary.keyPoints.map((point, i) => (
                      <View key={i} style={styles.bulletItem}>
                        <View style={[styles.bullet, { backgroundColor: colors.primary }]} />
                        <Text style={[styles.bulletText, { color: colors.foreground }]}>
                          {point}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.summarySection}>
                    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                      アクションアイテム
                    </Text>
                    {recording.summary.actionItems.map((item, i) => (
                      <View key={i} style={styles.bulletItem}>
                        <View style={[styles.bullet, { backgroundColor: colors.success }]} />
                        <Text style={[styles.bulletText, { color: colors.foreground }]}>
                          {item}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Tags Section */}
                  <View style={styles.summarySection}>
                    <View style={styles.tagsSectionHeader}>
                      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                        タグ
                      </Text>
                      {recording.tags.length === 0 && recording.transcript && (
                        <TouchableOpacity
                          onPress={handleGenerateTags}
                          disabled={tagsMutation.isPending}
                          style={[styles.generateTagsButton, { backgroundColor: colors.surface }]}
                        >
                          {tagsMutation.isPending ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                          ) : (
                            <>
                              <IconSymbol name="sparkles" size={14} color={colors.primary} />
                              <Text style={[styles.generateTagsText, { color: colors.primary }]}>
                                生成
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                    {recording.tags.length > 0 ? (
                      <View style={styles.tagsContainer}>
                        {recording.tags.map((tag) => (
                          <View
                            key={tag.id}
                            style={[
                              styles.tagChip,
                              { backgroundColor: tag.color || colors.primary + '20' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.tagText,
                                { color: tag.color ? '#FFFFFF' : colors.primary },
                              ]}
                            >
                              {tag.name}
                            </Text>
                            {tag.isAutoGenerated && tag.confidence && (
                              <Text
                                style={[
                                  styles.tagConfidence,
                                  { color: tag.color ? 'rgba(255,255,255,0.7)' : colors.muted },
                                ]}
                              >
                                {Math.round(tag.confidence * 100)}%
                              </Text>
                            )}
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={[styles.emptyTagsText, { color: colors.muted }]}>
                        タグがありません
                      </Text>
                    )}
                  </View>

                  {/* Action Items Section */}
                  <View style={styles.summarySection}>
                    <View style={styles.tagsSectionHeader}>
                      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                        アクションアイテム
                      </Text>
                      {recording.actionItems.length === 0 && recording.transcript && (
                        <TouchableOpacity
                          onPress={handleExtractActionItems}
                          disabled={actionItemsMutation.isPending}
                          style={[styles.generateTagsButton, { backgroundColor: colors.surface }]}
                        >
                          {actionItemsMutation.isPending ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                          ) : (
                            <>
                              <IconSymbol name="sparkles" size={14} color={colors.primary} />
                              <Text style={[styles.generateTagsText, { color: colors.primary }]}>
                                抽出
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                    {recording.actionItems.length > 0 ? (
                      <View style={styles.actionItemsList}>
                        {recording.actionItems.map((item) => (
                          <View key={item.id} style={styles.actionItemRow}>
                            <View
                              style={[
                                styles.priorityBadge,
                                {
                                  backgroundColor:
                                    item.priority === 'high'
                                      ? colors.error + '20'
                                      : item.priority === 'medium'
                                      ? colors.warning + '20'
                                      : colors.muted + '20',
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.priorityText,
                                  {
                                    color:
                                      item.priority === 'high'
                                        ? colors.error
                                        : item.priority === 'medium'
                                        ? colors.warning
                                        : colors.muted,
                                  },
                                ]}
                              >
                                {item.priority === 'high' ? '高' : item.priority === 'medium' ? '中' : '低'}
                              </Text>
                            </View>
                            <Text style={[styles.actionItemText, { color: colors.foreground }]}>
                              {item.text}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={[styles.emptyTagsText, { color: colors.muted }]}>
                        アクションアイテムがありません
                      </Text>
                    )}
                  </View>

                  {/* Keywords Section */}
                  <View style={styles.summarySection}>
                    <View style={styles.tagsSectionHeader}>
                      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                        キーワード
                      </Text>
                      {recording.keywords.length === 0 && recording.transcript && (
                        <TouchableOpacity
                          onPress={handleExtractKeywords}
                          disabled={keywordsMutation.isPending}
                          style={[styles.generateTagsButton, { backgroundColor: colors.surface }]}
                        >
                          {keywordsMutation.isPending ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                          ) : (
                            <>
                              <IconSymbol name="sparkles" size={14} color={colors.primary} />
                              <Text style={[styles.generateTagsText, { color: colors.primary }]}>
                                抽出
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                    {recording.keywords.length > 0 ? (
                      <View style={styles.tagsContainer}>
                        {recording.keywords.map((keyword) => (
                          <View
                            key={keyword.id}
                            style={[
                              styles.keywordChip,
                              {
                                backgroundColor:
                                  keyword.importance === 'high'
                                    ? colors.primary + '30'
                                    : keyword.importance === 'medium'
                                    ? colors.primary + '20'
                                    : colors.primary + '10',
                              },
                            ]}
                          >
                            <Text style={[styles.tagText, { color: colors.primary }]}>
                              {keyword.text}
                            </Text>
                            {keyword.frequency > 1 && (
                              <Text style={[styles.keywordFrequency, { color: colors.muted }]}>
                                ×{keyword.frequency}
                              </Text>
                            )}
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={[styles.emptyTagsText, { color: colors.muted }]}>
                        キーワードがありません
                      </Text>
                    )}
                  </View>

                  {/* Sentiment Analysis Section */}
                  <View style={styles.summarySection}>
                    <View style={styles.tagsSectionHeader}>
                      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                        感情分析
                      </Text>
                      {!recording.sentiment && recording.transcript && (
                        <TouchableOpacity
                          onPress={handleAnalyzeSentiment}
                          disabled={sentimentMutation.isPending}
                          style={[styles.generateTagsButton, { backgroundColor: colors.surface }]}
                        >
                          {sentimentMutation.isPending ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                          ) : (
                            <>
                              <IconSymbol name="sparkles" size={14} color={colors.primary} />
                              <Text style={[styles.generateTagsText, { color: colors.primary }]}>
                                分析
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                    {recording.sentiment ? (
                      <View style={styles.sentimentContainer}>
                        <View style={styles.sentimentHeader}>
                          <View
                            style={[
                              styles.sentimentBadge,
                              {
                                backgroundColor:
                                  recording.sentiment.overallSentiment === 'positive'
                                    ? colors.success + '20'
                                    : recording.sentiment.overallSentiment === 'negative'
                                    ? colors.error + '20'
                                    : colors.muted + '20',
                              },
                            ]}
                          >
                            <IconSymbol
                              name={
                                recording.sentiment.overallSentiment === 'positive'
                                  ? 'face.smiling'
                                  : recording.sentiment.overallSentiment === 'negative'
                                  ? 'face.smiling'
                                  : 'face.smiling'
                              }
                              size={18}
                              color={
                                recording.sentiment.overallSentiment === 'positive'
                                  ? colors.success
                                  : recording.sentiment.overallSentiment === 'negative'
                                  ? colors.error
                                  : colors.muted
                              }
                            />
                            <Text
                              style={[
                                styles.sentimentLabel,
                                {
                                  color:
                                    recording.sentiment.overallSentiment === 'positive'
                                      ? colors.success
                                      : recording.sentiment.overallSentiment === 'negative'
                                      ? colors.error
                                      : colors.muted,
                                },
                              ]}
                            >
                              {recording.sentiment.overallSentiment === 'positive'
                                ? 'ポジティブ'
                                : recording.sentiment.overallSentiment === 'negative'
                                ? 'ネガティブ'
                                : 'ニュートラル'}
                            </Text>
                          </View>
                          <Text style={[styles.sentimentScore, { color: colors.muted }]}>
                            信頼度: {Math.round(recording.sentiment.confidence * 100)}%
                          </Text>
                        </View>
                        {recording.sentiment.summary && (
                          <Text style={[styles.sentimentSummary, { color: colors.foreground }]}>
                            {recording.sentiment.summary}
                          </Text>
                        )}
                        <View style={styles.emotionsGrid}>
                          {Object.entries(recording.sentiment.emotions).map(([emotion, value]) => (
                            <View key={emotion} style={styles.emotionItem}>
                              <Text style={[styles.emotionLabel, { color: colors.muted }]}>
                                {emotion === 'joy' ? '喜び' :
                                 emotion === 'sadness' ? '悲しみ' :
                                 emotion === 'anger' ? '怒り' :
                                 emotion === 'fear' ? '恐れ' :
                                 emotion === 'surprise' ? '驚き' : '嫌悪'}
                              </Text>
                              <View style={[styles.emotionBar, { backgroundColor: colors.border }]}>
                                <View
                                  style={[
                                    styles.emotionFill,
                                    { width: `${value * 100}%`, backgroundColor: colors.primary },
                                  ]}
                                />
                              </View>
                            </View>
                          ))}
                        </View>
                      </View>
                    ) : (
                      <Text style={[styles.emptyTagsText, { color: colors.muted }]}>
                        感情分析がありません
                      </Text>
                    )}
                  </View>
                </>
              ) : (
                <View style={styles.emptyTab}>
                  <IconSymbol name="star.fill" size={48} color={colors.muted} />
                  <Text style={[styles.emptyText, { color: colors.muted }]}>
                    {recording.transcript
                      ? "要約がまだありません"
                      : "まず文字起こしを行ってください"}
                  </Text>
                  {recording.transcript && (
                    <TouchableOpacity
                      onPress={handleSummarize}
                      disabled={isProcessing}
                      style={[styles.actionButton, { backgroundColor: colors.primary }]}
                    >
                      {isProcessing ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={styles.actionButtonText}>要約を生成</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )}

          {activeTab === "qa" && (
            <View style={styles.qaTab}>
              {recording.transcript ? (
                <>
                  <View style={styles.qaMessages}>
                    {recording.qaHistory.length === 0 ? (
                      <View style={styles.qaEmpty}>
                        <IconSymbol name="text.bubble.fill" size={48} color={colors.muted} />
                        <Text style={[styles.emptyText, { color: colors.muted }]}>
                          録音内容について質問してください
                        </Text>
                      </View>
                    ) : (
                      recording.qaHistory.map((msg) => (
                        <View
                          key={msg.id}
                          style={[
                            styles.qaMessage,
                            msg.role === "user"
                              ? { alignSelf: "flex-end", backgroundColor: colors.primary }
                              : { alignSelf: "flex-start", backgroundColor: colors.surface },
                          ]}
                        >
                          <Text
                            style={[
                              styles.qaMessageText,
                              { color: msg.role === "user" ? "#FFFFFF" : colors.foreground },
                            ]}
                          >
                            {msg.content}
                          </Text>
                        </View>
                      ))
                    )}
                    {isProcessing && (
                      <View style={[styles.qaMessage, { backgroundColor: colors.surface }]}>
                        <ActivityIndicator size="small" color={colors.primary} />
                      </View>
                    )}
                  </View>
                </>
              ) : (
                <View style={styles.emptyTab}>
                  <IconSymbol name="text.bubble.fill" size={48} color={colors.muted} />
                  <Text style={[styles.emptyText, { color: colors.muted }]}>
                    まず文字起こしを行ってください
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Q&A Input */}
        {activeTab === "qa" && recording.transcript && (
          <View style={[styles.qaInputContainer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
            <TextInput
              style={[styles.qaInput, { backgroundColor: colors.surface, color: colors.foreground }]}
              placeholder="質問を入力..."
              placeholderTextColor={colors.muted}
              value={qaInput}
              onChangeText={setQaInput}
              returnKeyType="send"
              onSubmitEditing={handleAskQuestion}
            />
            <TouchableOpacity
              onPress={handleAskQuestion}
              disabled={!qaInput.trim() || isProcessing}
              style={[
                styles.sendButton,
                { backgroundColor: qaInput.trim() ? colors.primary : colors.muted },
              ]}
            >
              <IconSymbol name="paperplane.fill" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
        <GlobalRecordingBar />
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  exportButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    flexGrow: 1,
  },
  audioTab: {
    gap: 24,
  },
  waveform: {
    height: 100,
    borderRadius: 12,
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
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  timeText: {
    fontSize: 14,
    fontWeight: "500",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  skipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  highlightsSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  highlightItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  highlightTime: {
    fontSize: 14,
    fontWeight: "500",
  },
  highlightLabel: {
    fontSize: 14,
    flex: 1,
  },
  transcriptTab: {
    flex: 1,
  },
  transcriptContent: {
    flex: 1,
  },
  transcriptSection: {
    marginBottom: 16,
  },
  transcriptLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  transcriptDivider: {
    height: 1,
    marginVertical: 16,
  },
  transcriptText: {
    fontSize: 16,
    lineHeight: 26,
  },
  emptyTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 16,
  },
  emptyText: {
    fontSize: 15,
    textAlign: "center",
  },
  actionButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 8,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  summaryTab: {
    gap: 24,
  },
  summarySection: {
    gap: 8,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 24,
  },
  bulletItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 4,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 24,
  },
  qaTab: {
    flex: 1,
  },
  qaMessages: {
    flex: 1,
    gap: 12,
  },
  qaEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 16,
  },
  qaMessage: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 16,
  },
  qaMessageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  qaInputContainer: {
    flexDirection: "row",
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
  },
  qaInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    fontSize: 15,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  providerHint: {
    fontSize: 13,
    marginTop: 4,
  },
  tagsSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  generateTagsButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  generateTagsText: {
    fontSize: 13,
    fontWeight: "500",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  tagText: {
    fontSize: 13,
    fontWeight: "500",
  },
  tagConfidence: {
    fontSize: 11,
  },
  emptyTagsText: {
    fontSize: 14,
  },
  actionItemsList: {
    gap: 10,
  },
  actionItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 30,
    alignItems: "center",
  },
  priorityText: {
    fontSize: 11,
    fontWeight: "600",
  },
  actionItemText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  keywordChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  keywordFrequency: {
    fontSize: 11,
  },
  sentimentContainer: {
    gap: 12,
  },
  sentimentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sentimentBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  sentimentLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  sentimentScore: {
    fontSize: 12,
  },
  sentimentSummary: {
    fontSize: 14,
    lineHeight: 20,
  },
  emotionsGrid: {
    gap: 8,
  },
  emotionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  emotionLabel: {
    fontSize: 12,
    width: 40,
  },
  emotionBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  emotionFill: {
    height: "100%",
    borderRadius: 4,
  },
});
