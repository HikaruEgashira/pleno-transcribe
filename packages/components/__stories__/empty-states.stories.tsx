import type { Meta, StoryObj } from "@storybook/react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useColors } from "@/packages/hooks/use-colors";
import { IconSymbol } from "@/packages/components/ui/icon-symbol";

interface EmptyStateProps {
  icon: "mic.fill" | "doc.text.fill" | "star.fill" | "text.bubble.fill" | "magnifyingglass";
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

function EmptyState({ icon, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <IconSymbol name={icon} size={64} color={colors.muted} />
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text>
      )}
      {actionLabel && onAction && (
        <TouchableOpacity
          onPress={onAction}
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.actionButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
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

const meta: Meta<typeof EmptyState> = {
  title: "States/EmptyState",
  component: EmptyState,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof EmptyState>;

export const NoRecordings: Story = {
  args: {
    icon: "mic.fill",
    title: "録音がありません",
    subtitle: "下の録音ボタンをタップして\n最初の録音を開始しましょう",
  },
};

export const NoTranscript: Story = {
  args: {
    icon: "doc.text.fill",
    title: "文字起こしがまだありません",
    actionLabel: "文字起こしを開始",
    onAction: () => {},
  },
};

export const NoSummary: Story = {
  args: {
    icon: "star.fill",
    title: "要約がまだありません",
    subtitle: "まず文字起こしを行ってください",
  },
};

export const NoSummaryWithTranscript: Story = {
  args: {
    icon: "star.fill",
    title: "要約がまだありません",
    actionLabel: "要約を生成",
    onAction: () => {},
  },
};

export const NoQAHistory: Story = {
  args: {
    icon: "text.bubble.fill",
    title: "録音内容について質問してください",
    subtitle: "AIが録音内容に基づいて回答します",
  },
};

export const NoSearchResults: Story = {
  args: {
    icon: "magnifyingglass",
    title: "検索結果がありません",
    subtitle: "別のキーワードで検索してみてください",
  },
};

export const MicrophonePermissionDenied: Story = {
  args: {
    icon: "mic.fill",
    title: "マイクへのアクセスが必要です",
    subtitle: "設定からマイクへのアクセスを許可してください",
  },
};
