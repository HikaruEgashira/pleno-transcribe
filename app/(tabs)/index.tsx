import { useState, useMemo } from "react";
import {
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRecordings } from "@/lib/recordings-context";
import { useColors } from "@/hooks/use-colors";
import { Recording } from "@/types/recording";
import { cn } from "@/lib/utils";

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
  onPress: () => void;
  onDelete: () => void;
}

function RecordingCard({ recording, onPress, onDelete }: RecordingCardProps) {
  const colors = useColors();
  const statusInfo = getStatusLabel(recording.status);

  const handleLongPress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    Alert.alert("削除確認", `「${recording.title}」を削除しますか？`, [
      { text: "キャンセル", style: "cancel" },
      { text: "削除", style: "destructive", onPress: onDelete },
    ]);
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>
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

      {recording.highlights.length > 0 && (
        <View style={styles.highlightsRow}>
          <IconSymbol name="star.fill" size={12} color={colors.highlight} />
          <Text style={[styles.highlightCount, { color: colors.highlight }]}>
            {recording.highlights.length}個のハイライト
          </Text>
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

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const { state, deleteRecording } = useRecordings();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "transcribed" | "summarized">("all");

  const filteredRecordings = useMemo(() => {
    let result = state.recordings;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(query) ||
          r.transcript?.text.toLowerCase().includes(query) ||
          r.notes.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (filter === "transcribed") {
      result = result.filter((r) => r.transcript);
    } else if (filter === "summarized") {
      result = result.filter((r) => r.summary);
    }

    return result;
  }, [state.recordings, searchQuery, filter]);

  const handleRecordingPress = (recording: Recording) => {
    router.push(`/note/${recording.id}`);
  };

  const handleDelete = async (id: string) => {
    await deleteRecording(id);
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <IconSymbol name="mic.fill" size={64} color={colors.muted} />
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
        録音がありません
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
        下の録音ボタンをタップして{"\n"}最初の録音を開始しましょう
      </Text>
    </View>
  );

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>ノート</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          {state.recordings.length}件の録音
        </Text>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <IconSymbol name="magnifyingglass" size={20} color={colors.muted} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="録音を検索..."
          placeholderTextColor={colors.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <IconSymbol name="xmark" size={18} color={colors.muted} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterRow}>
        {(["all", "transcribed", "summarized"] as const).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[
              styles.filterButton,
              {
                backgroundColor: filter === f ? colors.primary : colors.surface,
                borderColor: filter === f ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.filterText,
                { color: filter === f ? "#FFFFFF" : colors.muted },
              ]}
            >
              {f === "all" ? "すべて" : f === "transcribed" ? "文字起こし済" : "要約済"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredRecordings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RecordingCard
            recording={item}
            onPress={() => handleRecordingPress(item)}
            onDelete={() => handleDelete(item.id)}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 13,
    fontWeight: "500",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    flexGrow: 1,
  },
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
  highlightsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  highlightCount: {
    fontSize: 12,
    fontWeight: "500",
  },
  preview: {
    fontSize: 13,
    marginTop: 8,
    lineHeight: 18,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
});
