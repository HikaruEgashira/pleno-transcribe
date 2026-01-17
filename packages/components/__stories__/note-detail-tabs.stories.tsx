import type { Meta, StoryObj } from "@storybook/react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { useColors } from "@/packages/hooks/use-colors";
import { IconSymbol } from "@/packages/components/ui/icon-symbol";

type TabType = "audio" | "transcript" | "summary" | "qa";

interface TabBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

function TabBar({ activeTab, onTabChange }: TabBarProps) {
  const colors = useColors();

  const tabs: { key: TabType; label: string; icon: "waveform" | "doc.text.fill" | "star.fill" | "text.bubble.fill" }[] = [
    { key: "audio", label: "音声", icon: "waveform" },
    { key: "transcript", label: "文字起こし", icon: "doc.text.fill" },
    { key: "summary", label: "要約", icon: "star.fill" },
    { key: "qa", label: "Q&A", icon: "text.bubble.fill" },
  ];

  return (
    <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          onPress={() => onTabChange(tab.key)}
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
  );
}

interface AudioTabProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  hasHighlights: boolean;
}

function AudioTab({ currentTime, duration, isPlaying, hasHighlights }: AudioTabProps) {
  const colors = useColors();

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <View style={styles.audioTab}>
      {/* Waveform */}
      <View style={[styles.waveform, { backgroundColor: colors.surface }]}>
        <View style={styles.waveformBars}>
          {Array.from({ length: 40 }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.waveformBar,
                {
                  backgroundColor: i / 40 < currentTime / duration ? colors.primary : colors.border,
                  height: 20 + Math.random() * 40,
                },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Time display */}
      <View style={styles.timeRow}>
        <Text style={[styles.timeText, { color: colors.foreground }]}>
          {formatTime(currentTime)}
        </Text>
        <Text style={[styles.timeText, { color: colors.muted }]}>
          {formatTime(duration)}
        </Text>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={[styles.controlButton, { backgroundColor: colors.surface }]}>
          <Text style={[styles.skipText, { color: colors.foreground }]}>-15</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.playButton, { backgroundColor: colors.primary }]}>
          <IconSymbol name={isPlaying ? "pause.fill" : "play.fill"} size={32} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.controlButton, { backgroundColor: colors.surface }]}>
          <Text style={[styles.skipText, { color: colors.foreground }]}>+15</Text>
        </TouchableOpacity>
      </View>

      {/* Playback Speed */}
      <TouchableOpacity style={[styles.playbackRateButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.playbackRateText, { color: colors.foreground }]}>1x</Text>
      </TouchableOpacity>

      {/* Add Highlight Button */}
      <TouchableOpacity style={[styles.addHighlightButton, { backgroundColor: colors.highlight + '20', borderColor: colors.highlight }]}>
        <IconSymbol name="star.fill" size={18} color={colors.highlight} />
        <Text style={[styles.addHighlightText, { color: colors.highlight }]}>
          現在位置をハイライト
        </Text>
      </TouchableOpacity>

      {/* Highlights */}
      {hasHighlights && (
        <View style={styles.highlightsSection}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            ハイライト (2)
          </Text>
          {[
            { id: "1", timestamp: 120, label: "重要ポイント" },
            { id: "2", timestamp: 350, context: "...ここで議論された内容について..." },
          ].map((h) => (
            <View
              key={h.id}
              style={[styles.highlightItem, { backgroundColor: colors.surface }]}
            >
              <View style={styles.highlightContent}>
                <View style={styles.highlightHeader}>
                  <IconSymbol name="star.fill" size={16} color={colors.highlight} />
                  <Text style={[styles.highlightTime, { color: colors.foreground }]}>
                    {formatTime(h.timestamp)}
                  </Text>
                  {h.label && (
                    <Text style={[styles.highlightLabel, { color: colors.muted }]}>
                      {h.label}
                    </Text>
                  )}
                </View>
                {h.context && (
                  <Text
                    style={[styles.highlightContext, { color: colors.muted }]}
                    numberOfLines={2}
                  >
                    {h.context}
                  </Text>
                )}
              </View>
              <TouchableOpacity style={styles.highlightDeleteButton}>
                <IconSymbol name="xmark" size={14} color={colors.muted} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

interface SummaryTabProps {
  hasSummary: boolean;
  hasTags: boolean;
  hasActionItems: boolean;
  hasKeywords: boolean;
  hasSentiment: boolean;
}

function SummaryTab({ hasSummary, hasTags, hasActionItems, hasKeywords, hasSentiment }: SummaryTabProps) {
  const colors = useColors();

  if (!hasSummary) {
    return (
      <View style={styles.emptyTab}>
        <IconSymbol name="star.fill" size={48} color={colors.muted} />
        <Text style={[styles.emptyText, { color: colors.muted }]}>
          要約がまだありません
        </Text>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.primary }]}>
          <Text style={styles.actionButtonText}>要約を生成</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.summaryTab} contentContainerStyle={{ paddingBottom: 20 }}>
      <View style={styles.summarySection}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>概要</Text>
        <Text style={[styles.summaryText, { color: colors.foreground }]}>
          プロジェクトの進捗状況について議論し、今後のマイルストーンを確認しました。主要な懸念点と解決策について合意に達しました。
        </Text>
      </View>

      <View style={styles.summarySection}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>重要なポイント</Text>
        {["開発は予定通り進行中", "テストフェーズは来週から開始", "リリースは3月末を目標"].map((point, i) => (
          <View key={i} style={styles.bulletItem}>
            <View style={[styles.bullet, { backgroundColor: colors.primary }]} />
            <Text style={[styles.bulletText, { color: colors.foreground }]}>{point}</Text>
          </View>
        ))}
      </View>

      {hasTags && (
        <View style={styles.summarySection}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>タグ</Text>
          <View style={styles.tagsContainer}>
            {[
              { name: "会議", color: "#3B82F6" },
              { name: "プロジェクト", color: "#10B981" },
              { name: "重要", color: "#EF4444" },
            ].map((tag, i) => (
              <View key={i} style={[styles.tagChip, { backgroundColor: tag.color }]}>
                <Text style={styles.tagText}>{tag.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {hasActionItems && (
        <View style={styles.summarySection}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>アクションアイテム</Text>
          {[
            { text: "ドキュメントを更新する", priority: "high", completed: false },
            { text: "テスト環境を準備", priority: "medium", completed: true },
            { text: "チームに共有", priority: "low", completed: false },
          ].map((item, i) => (
            <View key={i} style={styles.actionItemRow}>
              <View
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: item.completed ? colors.success : "transparent",
                    borderColor: item.completed ? colors.success : colors.border,
                  },
                ]}
              >
                {item.completed && <IconSymbol name="checkmark" size={12} color="#FFFFFF" />}
              </View>
              <View
                style={[
                  styles.priorityBadge,
                  {
                    backgroundColor:
                      item.priority === "high"
                        ? colors.error + "20"
                        : item.priority === "medium"
                        ? colors.warning + "20"
                        : colors.muted + "20",
                  },
                ]}
              >
                <Text
                  style={{
                    color:
                      item.priority === "high"
                        ? colors.error
                        : item.priority === "medium"
                        ? colors.warning
                        : colors.muted,
                    fontSize: 11,
                    fontWeight: "600",
                  }}
                >
                  {item.priority === "high" ? "高" : item.priority === "medium" ? "中" : "低"}
                </Text>
              </View>
              <Text
                style={[
                  styles.actionItemText,
                  {
                    color: item.completed ? colors.muted : colors.foreground,
                    textDecorationLine: item.completed ? "line-through" : "none",
                  },
                ]}
              >
                {item.text}
              </Text>
            </View>
          ))}
        </View>
      )}

      {hasKeywords && (
        <View style={styles.summarySection}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>キーワード</Text>
          <View style={styles.tagsContainer}>
            {[
              { text: "プロジェクト", frequency: 5 },
              { text: "リリース", frequency: 3 },
              { text: "テスト", frequency: 2 },
            ].map((kw, i) => (
              <View key={i} style={[styles.keywordChip, { backgroundColor: colors.primary + "20" }]}>
                <Text style={[styles.tagText, { color: colors.primary }]}>{kw.text}</Text>
                <Text style={[styles.keywordFrequency, { color: colors.muted }]}>×{kw.frequency}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {hasSentiment && (
        <View style={styles.summarySection}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>感情分析</Text>
          <View style={styles.sentimentContainer}>
            <View style={[styles.sentimentBadge, { backgroundColor: colors.success + "20" }]}>
              <IconSymbol name="face.smiling" size={18} color={colors.success} />
              <Text style={[styles.sentimentLabel, { color: colors.success }]}>ポジティブ</Text>
            </View>
            <Text style={[styles.sentimentScore, { color: colors.muted }]}>信頼度: 85%</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

interface NoteDetailTabsProps {
  activeTab: TabType;
  hasTranscript: boolean;
  hasSummary: boolean;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
}

function NoteDetailTabs({
  activeTab,
  hasTranscript,
  hasSummary,
  currentTime,
  duration,
  isPlaying,
}: NoteDetailTabsProps) {
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TabBar activeTab={activeTab} onTabChange={() => {}} />

      <View style={styles.content}>
        {activeTab === "audio" && (
          <AudioTab
            currentTime={currentTime}
            duration={duration}
            isPlaying={isPlaying}
            hasHighlights={true}
          />
        )}
        {activeTab === "transcript" && (
          hasTranscript ? (
            <ScrollView style={styles.transcriptTab}>
              <Text style={[styles.transcriptText, { color: colors.foreground }]}>
                今日のミーティングでは、プロジェクトの進捗状況について話し合いました。主なトピックは、新機能の開発状況、バグ修正の優先順位、そして来週のリリーススケジュールについてです。

                チームは予定通り開発を進めており、主要な機能は全て実装完了しています。テストフェーズについては来週から開始する予定で、品質保証チームと連携して進めていきます。

                リリースに向けて、ドキュメントの更新とユーザーガイドの作成も並行して進める必要があります。
              </Text>
              <View style={styles.translateButtonContainer}>
                <TouchableOpacity style={[styles.translateButton, { backgroundColor: colors.primary }]}>
                  <IconSymbol name="doc.text.fill" size={16} color="#FFFFFF" />
                  <Text style={styles.translateButtonText}>英語に翻訳</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            <View style={styles.emptyTab}>
              <IconSymbol name="doc.text.fill" size={48} color={colors.muted} />
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                文字起こしがまだありません
              </Text>
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.primary }]}>
                <Text style={styles.actionButtonText}>文字起こしを開始</Text>
              </TouchableOpacity>
            </View>
          )
        )}
        {activeTab === "summary" && (
          <SummaryTab
            hasSummary={hasSummary}
            hasTags={true}
            hasActionItems={true}
            hasKeywords={true}
            hasSentiment={true}
          />
        )}
        {activeTab === "qa" && (
          hasTranscript ? (
            <View style={styles.qaTab}>
              <View style={styles.qaEmpty}>
                <IconSymbol name="text.bubble.fill" size={48} color={colors.muted} />
                <Text style={[styles.emptyText, { color: colors.muted }]}>
                  録音内容について質問してください
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyTab}>
              <IconSymbol name="text.bubble.fill" size={48} color={colors.muted} />
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                まず文字起こしを行ってください
              </Text>
            </View>
          )
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    padding: 20,
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
  playbackRateButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    alignSelf: "center",
  },
  playbackRateText: {
    fontSize: 14,
    fontWeight: "600",
  },
  addHighlightButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  addHighlightText: {
    fontSize: 14,
    fontWeight: "600",
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
  highlightContent: {
    flex: 1,
    gap: 4,
  },
  highlightHeader: {
    flexDirection: "row",
    alignItems: "center",
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
  highlightContext: {
    fontSize: 12,
    lineHeight: 18,
    marginLeft: 24,
  },
  highlightDeleteButton: {
    padding: 6,
  },
  transcriptTab: {
    flex: 1,
  },
  transcriptText: {
    fontSize: 16,
    lineHeight: 26,
  },
  translateButtonContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  translateButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  translateButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  summaryTab: {
    flex: 1,
  },
  summarySection: {
    marginBottom: 24,
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
    color: "#FFFFFF",
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
  actionItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 30,
    alignItems: "center",
  },
  actionItemText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  sentimentContainer: {
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
  qaTab: {
    flex: 1,
  },
  qaEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 16,
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
});

const meta: Meta<typeof NoteDetailTabs> = {
  title: "NoteDetail/Tabs",
  component: NoteDetailTabs,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof NoteDetailTabs>;

export const AudioTabWithHighlights: Story = {
  args: {
    activeTab: "audio",
    hasTranscript: true,
    hasSummary: true,
    currentTime: 120,
    duration: 1800,
    isPlaying: false,
  },
};

export const TranscriptTab: Story = {
  args: {
    activeTab: "transcript",
    hasTranscript: true,
    hasSummary: true,
    currentTime: 0,
    duration: 1800,
    isPlaying: false,
  },
};

export const TranscriptTabEmpty: Story = {
  args: {
    activeTab: "transcript",
    hasTranscript: false,
    hasSummary: false,
    currentTime: 0,
    duration: 1800,
    isPlaying: false,
  },
};

export const SummaryTabFull: Story = {
  args: {
    activeTab: "summary",
    hasTranscript: true,
    hasSummary: true,
    currentTime: 0,
    duration: 1800,
    isPlaying: false,
  },
};

export const SummaryTabEmpty: Story = {
  args: {
    activeTab: "summary",
    hasTranscript: true,
    hasSummary: false,
    currentTime: 0,
    duration: 1800,
    isPlaying: false,
  },
};

export const QATab: Story = {
  args: {
    activeTab: "qa",
    hasTranscript: true,
    hasSummary: true,
    currentTime: 0,
    duration: 1800,
    isPlaying: false,
  },
};

export const QATabNoTranscript: Story = {
  args: {
    activeTab: "qa",
    hasTranscript: false,
    hasSummary: false,
    currentTime: 0,
    duration: 1800,
    isPlaying: false,
  },
};
