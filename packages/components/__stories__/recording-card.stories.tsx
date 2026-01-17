import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useColors } from "@/packages/hooks/use-colors";
import { IconSymbol } from "@/packages/components/ui/icon-symbol";
import type { Recording } from "@/packages/types/recording";

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  } else if (days === 1) {
    return "昨日";
  } else if (days < 7) {
    return `${days}日前`;
  } else {
    return date.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
  }
}

function getStatusLabel(status: Recording["status"]): { text: string; color: string } {
  switch (status) {
    case "recording":
      return { text: "録音中", color: "recording" };
    case "saved":
      return { text: "保存済み", color: "muted" };
    case "transcribing":
      return { text: "文字起こし中", color: "warning" };
    case "transcribed":
      return { text: "文字起こし完了", color: "success" };
    case "summarizing":
      return { text: "要約中", color: "warning" };
    case "summarized":
      return { text: "要約完了", color: "primary" };
    default:
      return { text: "", color: "muted" };
  }
}

interface RecordingCardProps {
  recording: Recording;
  columns: number;
  isSelectMode?: boolean;
  isSelected?: boolean;
}

function RecordingCard({
  recording,
  columns,
  isSelectMode = false,
  isSelected = false,
}: RecordingCardProps) {
  const colors = useColors();
  const statusInfo = getStatusLabel(recording.status);

  const cardWidth = columns > 1 ? `${Math.floor(100 / columns) - 2}%` as const : "100%" as const;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[
        styles.card,
        {
          backgroundColor: isSelected ? colors.primary + "10" : colors.surface,
          borderColor: isSelected ? colors.primary : colors.border,
          width: cardWidth,
          marginHorizontal: columns > 1 ? "1%" : 0,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        {isSelectMode && (
          <View style={[
            styles.checkbox,
            {
              backgroundColor: isSelected ? colors.primary : "transparent",
              borderColor: isSelected ? colors.primary : colors.muted,
            }
          ]}>
            {isSelected && (
              <IconSymbol name="checkmark" size={14} color="#FFFFFF" />
            )}
          </View>
        )}
        <Text style={[styles.cardTitle, { color: colors.foreground }, isSelectMode && styles.cardTitleWithCheckbox]} numberOfLines={1}>
          {recording.title}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: colors[statusInfo.color as keyof typeof colors] + "20" }]}>
          <Text style={[styles.statusText, { color: colors[statusInfo.color as keyof typeof colors] as string }]}>
            {statusInfo.text}
          </Text>
        </View>
      </View>

      <View style={styles.cardMeta}>
        <View style={styles.metaItem}>
          <IconSymbol name="clock.fill" size={14} color={colors.muted} />
          <Text style={[styles.metaText, { color: colors.muted }]}>
            {formatDuration(recording.duration)}
          </Text>
        </View>
        <Text style={[styles.metaText, { color: colors.muted }]}>
          {formatDate(recording.createdAt)}
        </Text>
      </View>

      {/* Metadata indicators row */}
      {(recording.highlights.length > 0 || recording.actionItems.length > 0 || recording.keywords.length > 0) && (
        <View style={styles.metadataRow}>
          {recording.highlights.length > 0 && (
            <View style={styles.metadataItem}>
              <IconSymbol name="star.fill" size={12} color={colors.highlight} />
              <Text style={[styles.metadataCount, { color: colors.highlight }]}>
                {recording.highlights.length}
              </Text>
            </View>
          )}
          {recording.actionItems.length > 0 && (
            <View style={styles.metadataItem}>
              <IconSymbol name="checkmark.circle.fill" size={12} color={colors.success} />
              <Text style={[styles.metadataCount, { color: colors.success }]}>
                {recording.actionItems.filter(a => !a.completed).length}/{recording.actionItems.length}
              </Text>
            </View>
          )}
          {recording.keywords.length > 0 && (
            <View style={styles.metadataItem}>
              <IconSymbol name="text.word.spacing" size={12} color={colors.primary} />
              <Text style={[styles.metadataCount, { color: colors.primary }]}>
                {recording.keywords.length}
              </Text>
            </View>
          )}
        </View>
      )}

      {recording.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {recording.tags.slice(0, 3).map((tag) => (
            <View
              key={tag.id}
              style={[
                styles.tagChip,
                { backgroundColor: tag.color || colors.primary + "20" },
              ]}
            >
              <Text
                style={[
                  styles.tagChipText,
                  { color: tag.color ? "#FFFFFF" : colors.primary },
                ]}
              >
                {tag.name}
              </Text>
            </View>
          ))}
          {recording.tags.length > 3 && (
            <Text style={[styles.moreTagsText, { color: colors.muted }]}>
              +{recording.tags.length - 3}
            </Text>
          )}
        </View>
      )}

      {recording.transcript && (
        <Text style={[styles.preview, { color: colors.muted }]} numberOfLines={2}>
          {recording.transcript.text.substring(0, 100)}...
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "600",
    flex: 1,
    marginRight: 8,
  },
  cardTitleWithCheckbox: {
    marginLeft: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  cardMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 13,
  },
  metadataRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  metadataItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metadataCount: {
    fontSize: 12,
    fontWeight: "500",
  },
  preview: {
    fontSize: 13,
    marginTop: 8,
    lineHeight: 18,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  tagChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagChipText: {
    fontSize: 11,
    fontWeight: "500",
  },
  moreTagsText: {
    fontSize: 11,
    alignSelf: "center",
  },
});

const meta: Meta<typeof RecordingCard> = {
  title: "Notes/RecordingCard",
  component: RecordingCard,
  decorators: [
    (Story) => (
      <ScrollView style={{ flex: 1, backgroundColor: "#f5f5f5", padding: 16 }}>
        <Story />
      </ScrollView>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof RecordingCard>;

const baseRecording: Recording = {
  id: "1",
  title: "週次ミーティング",
  audioUri: "",
  duration: 1800,
  createdAt: new Date(),
  updatedAt: new Date(),
  status: "saved",
  highlights: [],
  notes: "",
  tags: [],
  actionItems: [],
  keywords: [],
  qaHistory: [],
};

export const BasicCard: Story = {
  args: {
    recording: baseRecording,
    columns: 1,
    isSelectMode: false,
    isSelected: false,
  },
};

export const Transcribed: Story = {
  args: {
    recording: {
      ...baseRecording,
      status: "transcribed",
      transcript: {
        text: "今日のミーティングでは、プロジェクトの進捗状況について話し合いました。主なトピックは、新機能の開発状況、バグ修正の優先順位、そして来週のリリーススケジュールについてです。",
        segments: [],
        language: "ja",
        processedAt: new Date(),
      },
    },
    columns: 1,
  },
};

export const Summarized: Story = {
  args: {
    recording: {
      ...baseRecording,
      title: "プロジェクト計画会議",
      status: "summarized",
      transcript: {
        text: "今日のミーティングでは...",
        segments: [],
        language: "ja",
        processedAt: new Date(),
      },
      summary: {
        overview: "プロジェクトの進捗確認と今後の計画について議論",
        keyPoints: ["開発は予定通り進行中", "テストフェーズは来週開始"],
        actionItems: ["ドキュメントの更新"],
        processedAt: new Date(),
      },
    },
    columns: 1,
  },
};

export const WithTags: Story = {
  args: {
    recording: {
      ...baseRecording,
      title: "アイデアブレスト",
      status: "transcribed",
      tags: [
        { id: "1", name: "アイデア", color: "#3B82F6" },
        { id: "2", name: "ブレスト", color: "#10B981" },
        { id: "3", name: "重要", color: "#EF4444" },
        { id: "4", name: "フォローアップ" },
      ],
    },
    columns: 1,
  },
};

export const WithMetadata: Story = {
  args: {
    recording: {
      ...baseRecording,
      title: "1on1ミーティング",
      status: "summarized",
      highlights: [
        { id: "1", timestamp: 120 },
        { id: "2", timestamp: 350, label: "重要" },
      ],
      actionItems: [
        { id: "1", text: "レビューを完了する", priority: "high", completed: false },
        { id: "2", text: "報告書を提出", priority: "medium", completed: true },
        { id: "3", text: "チームに共有", priority: "low", completed: false },
      ],
      keywords: [
        { id: "1", text: "プロジェクト", importance: "high", frequency: 5 },
        { id: "2", text: "リリース", importance: "medium", frequency: 3 },
      ],
    },
    columns: 1,
  },
};

export const Transcribing: Story = {
  args: {
    recording: {
      ...baseRecording,
      title: "処理中の録音",
      status: "transcribing",
    },
    columns: 1,
  },
};

export const SelectMode: Story = {
  args: {
    recording: baseRecording,
    columns: 1,
    isSelectMode: true,
    isSelected: false,
  },
};

export const Selected: Story = {
  args: {
    recording: baseRecording,
    columns: 1,
    isSelectMode: true,
    isSelected: true,
  },
};

export const LongTitle: Story = {
  args: {
    recording: {
      ...baseRecording,
      title: "これは非常に長いタイトルの録音で、モバイル画面では切り詰められる可能性があります",
    },
    columns: 1,
  },
};

export const ShortDuration: Story = {
  args: {
    recording: {
      ...baseRecording,
      title: "短いメモ",
      duration: 15,
    },
    columns: 1,
  },
};

export const LongDuration: Story = {
  args: {
    recording: {
      ...baseRecording,
      title: "長時間録音",
      duration: 7200,
    },
    columns: 1,
  },
};
