import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  Animated as RNAnimated,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Swipeable } from "react-native-gesture-handler";

import { ScreenContainer } from "@/packages/components/screen-container";
import { Haptics, Storage } from "@/packages/platform";
import { IconSymbol } from "@/packages/components/ui/icon-symbol";
import { useRecordings } from "@/packages/lib/recordings-context";
import { useColors } from "@/packages/hooks/use-colors";
import { useResponsive } from "@/packages/hooks/use-responsive";
import { Recording } from "@/packages/types/recording";
import { useTranslation } from "@/packages/lib/i18n/context";

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
  columns: number;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: () => void;
}

const RecordingCard = React.memo(function RecordingCard({
  recording,
  onPress,
  onDelete,
  columns,
  isSelectMode = false,
  isSelected = false,
  onToggleSelection,
}: RecordingCardProps) {
  const colors = useColors();
  const statusInfo = getStatusLabel(recording.status);
  const swipeableRef = useRef<Swipeable>(null);

  const handleLongPress = useCallback(() => {
    if (isSelectMode) return;
    Haptics.impact('medium');
    Alert.alert("削除確認", `「${recording.title}」を削除しますか？`, [
      { text: "キャンセル", style: "cancel" },
      { text: "削除", style: "destructive", onPress: onDelete },
    ]);
  }, [recording.title, onDelete, isSelectMode]);

  const handlePress = useCallback(() => {
    if (isSelectMode && onToggleSelection) {
      Haptics.impact('light');
      onToggleSelection();
    } else {
      onPress();
    }
  }, [isSelectMode, onToggleSelection, onPress]);

  const handleDelete = useCallback(() => {
    Haptics.impact('medium');
    Alert.alert("削除確認", `「${recording.title}」を削除しますか？`, [
      { text: "キャンセル", style: "cancel", onPress: () => swipeableRef.current?.close() },
      { text: "削除", style: "destructive", onPress: onDelete },
    ]);
  }, [recording.title, onDelete]);

  const renderRightActions = (
    progress: RNAnimated.AnimatedInterpolation<number>,
    dragX: RNAnimated.AnimatedInterpolation<number>
  ) => {
    const translateX = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [0, 80],
      extrapolate: "clamp",
    });

    const opacity = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    return (
      <RNAnimated.View
        style={[
          styles.deleteAction,
          {
            opacity,
            transform: [{ translateX }],
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.deleteButton, { backgroundColor: colors.error }]}
          onPress={handleDelete}
          activeOpacity={0.8}
        >
          <IconSymbol name="trash.fill" size={22} color="#FFFFFF" />
          <Text style={styles.deleteText}>削除</Text>
        </TouchableOpacity>
      </RNAnimated.View>
    );
  };

  const cardWidth = columns > 1 ? `${Math.floor(100 / columns) - 2}%` as const : "100%" as const;

  const cardContent = (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={handleLongPress}
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

  // Web doesn't support Swipeable well, so use long press only
  if (Platform.OS === "web") {
    return cardContent;
  }

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      overshootRight={false}
      friction={2}
    >
      {cardContent}
    </Swipeable>
  );
}, (prevProps, nextProps) => {
  // onPress/onDeleteは毎回新規生成されるので、recordingの実質的な変化のみを比較
  return (
    prevProps.recording.id === nextProps.recording.id &&
    prevProps.recording.status === nextProps.recording.status &&
    prevProps.recording.title === nextProps.recording.title &&
    prevProps.recording.duration === nextProps.recording.duration &&
    prevProps.recording.highlights.length === nextProps.recording.highlights.length &&
    prevProps.recording.transcript?.text === nextProps.recording.transcript?.text &&
    prevProps.columns === nextProps.columns &&
    prevProps.isSelectMode === nextProps.isSelectMode &&
    prevProps.isSelected === nextProps.isSelected
  );
});

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const { columns, isDesktop } = useResponsive();
  const { state, deleteRecording } = useRecordings();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "transcribed" | "summarized">("all");
  const [hasHighlightsFilter, setHasHighlightsFilter] = useState(false);
  const [hasPendingActionsFilter, setHasPendingActionsFilter] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "longest" | "shortest">("newest");
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // 表示モードに基づいてカラム数を計算
  const effectiveColumns = useMemo(() => {
    if (viewMode === "list") return 1;
    // グリッドモードではレスポンシブのカラム数を使用
    return columns;
  }, [viewMode, columns]);

  // 検索履歴をロード
  useEffect(() => {
    const loadSearchHistory = async () => {
      try {
        const saved = await Storage.getItem("search-history");
        if (saved) {
          setSearchHistory(JSON.parse(saved));
        }
      } catch (error) {
        console.error("Failed to load search history:", error);
      }
    };
    loadSearchHistory();
  }, []);

  // 検索履歴を保存
  const saveToSearchHistory = useCallback(async (query: string) => {
    if (!query.trim()) return;
    const trimmedQuery = query.trim();
    // 重複を削除して先頭に追加
    const updatedHistory = [
      trimmedQuery,
      ...searchHistory.filter((h) => h !== trimmedQuery),
    ].slice(0, 10); // 最大10件
    setSearchHistory(updatedHistory);
    try {
      await Storage.setItem("search-history", JSON.stringify(updatedHistory));
    } catch (error) {
      console.error("Failed to save search history:", error);
    }
  }, [searchHistory]);

  // 検索履歴から削除
  const removeFromSearchHistory = useCallback(async (query: string) => {
    const updatedHistory = searchHistory.filter((h) => h !== query);
    setSearchHistory(updatedHistory);
    try {
      await Storage.setItem("search-history", JSON.stringify(updatedHistory));
    } catch (error) {
      console.error("Failed to save search history:", error);
    }
  }, [searchHistory]);

  // 検索履歴をクリア
  const clearSearchHistory = useCallback(async () => {
    setSearchHistory([]);
    try {
      await Storage.removeItem("search-history");
    } catch (error) {
      console.error("Failed to clear search history:", error);
    }
  }, []);

  // 全ての一意なタグを収集
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    state.recordings.forEach((r) => {
      r.tags.forEach((t) => tagSet.add(t.name));
    });
    return Array.from(tagSet).sort();
  }, [state.recordings]);

  // 検索クエリのデバウンス処理（300ms）
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredRecordings = useMemo(() => {
    let result = state.recordings;

    // Apply search filter with debounced query
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(query) ||
          r.transcript?.text.toLowerCase().includes(query) ||
          r.notes.toLowerCase().includes(query) ||
          // Phase 2 P5: Enhanced search with keywords, tags, and action items
          r.keywords.some((k) => k.text.toLowerCase().includes(query)) ||
          r.tags.some((t) => t.name.toLowerCase().includes(query)) ||
          r.actionItems.some((a) => a.text.toLowerCase().includes(query))
      );
    }

    // Apply status filter
    if (filter === "transcribed") {
      result = result.filter((r) => r.transcript);
    } else if (filter === "summarized") {
      result = result.filter((r) => r.summary);
    }

    // Apply highlights filter
    if (hasHighlightsFilter) {
      result = result.filter((r) => r.highlights.length > 0);
    }

    // Apply pending actions filter
    if (hasPendingActionsFilter) {
      result = result.filter((r) => r.actionItems.some((a) => !a.completed));
    }

    // Apply tag filter
    if (selectedTag) {
      result = result.filter((r) => r.tags.some((t) => t.name === selectedTag));
    }

    // Apply sort
    result = [...result].sort((a, b) => {
      switch (sortOrder) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "longest":
          return b.duration - a.duration;
        case "shortest":
          return a.duration - b.duration;
        default:
          return 0;
      }
    });

    return result;
  }, [state.recordings, debouncedSearchQuery, filter, hasHighlightsFilter, hasPendingActionsFilter, selectedTag, sortOrder]);

  // コールバックをメモ化してRecordingCardの再レンダリングを防止
  const handleRecordingPress = useCallback((id: string) => {
    router.push(`/note/${id}`);
  }, [router]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteRecording(id);
  }, [deleteRecording]);

  const handleToggleSelectMode = useCallback(() => {
    setIsSelectMode((prev) => !prev);
    setSelectedIds(new Set());
  }, []);

  const handleToggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const allIds = filteredRecordings.map((r) => r.id);
    setSelectedIds(new Set(allIds));
  }, [filteredRecordings]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;

    Alert.alert(
      "一括削除",
      `${selectedIds.size}件の録音を削除しますか？`,
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除",
          style: "destructive",
          onPress: async () => {
            Haptics.impact('heavy');
            for (const id of selectedIds) {
              await deleteRecording(id);
            }
            setSelectedIds(new Set());
            setIsSelectMode(false);
          },
        },
      ]
    );
  }, [selectedIds, deleteRecording]);

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
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>{t("notes.title")}</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              {state.recordings.length}{t("common.recording_noun")}
            </Text>
          </View>
          {state.recordings.length > 0 && (
            <TouchableOpacity
              onPress={handleToggleSelectMode}
              style={[
                styles.selectModeButton,
                {
                  backgroundColor: isSelectMode ? colors.primary + "20" : colors.surface,
                  borderColor: isSelectMode ? colors.primary : colors.border,
                },
              ]}
            >
              <IconSymbol
                name={isSelectMode ? "xmark" : "checkmark.circle"}
                size={16}
                color={isSelectMode ? colors.primary : colors.muted}
              />
              <Text style={[styles.selectModeText, { color: isSelectMode ? colors.primary : colors.muted }]}>
                {isSelectMode ? "キャンセル" : "選択"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.searchWrapper}>
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <IconSymbol name="magnifyingglass" size={20} color={colors.muted} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder={t("notes.searchPlaceholder")}
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setShowSearchHistory(true)}
            onBlur={() => setTimeout(() => setShowSearchHistory(false), 200)}
            onSubmitEditing={() => {
              if (searchQuery.trim()) {
                saveToSearchHistory(searchQuery);
              }
              setShowSearchHistory(false);
            }}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <IconSymbol name="xmark" size={18} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Search History Dropdown */}
        {showSearchHistory && searchHistory.length > 0 && (
          <View style={[styles.searchHistoryDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.searchHistoryHeader}>
              <Text style={[styles.searchHistoryTitle, { color: colors.muted }]}>検索履歴</Text>
              <TouchableOpacity onPress={clearSearchHistory}>
                <Text style={[styles.searchHistoryClear, { color: colors.primary }]}>クリア</Text>
              </TouchableOpacity>
            </View>
            {searchHistory.map((item) => (
              <View key={item} style={styles.searchHistoryItem}>
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery(item);
                    setShowSearchHistory(false);
                  }}
                  style={styles.searchHistoryItemContent}
                >
                  <IconSymbol name="clock.fill" size={14} color={colors.muted} />
                  <Text style={[styles.searchHistoryText, { color: colors.foreground }]}>{item}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeFromSearchHistory(item)}>
                  <IconSymbol name="xmark" size={14} color={colors.muted} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.filterRow}>
        <View style={styles.filterButtons}>
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
                {f === "all" ? t("notes.allNotes") : f === "transcribed" ? t("notes.transcribed") : t("notes.summarized")}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={() => setHasHighlightsFilter(!hasHighlightsFilter)}
            style={[
              styles.filterButton,
              {
                backgroundColor: hasHighlightsFilter ? colors.highlight + "20" : colors.surface,
                borderColor: hasHighlightsFilter ? colors.highlight : colors.border,
              },
            ]}
          >
            <View style={styles.filterButtonContent}>
              <IconSymbol name="star.fill" size={12} color={hasHighlightsFilter ? colors.highlight : colors.muted} />
              <Text
                style={[
                  styles.filterText,
                  { color: hasHighlightsFilter ? colors.highlight : colors.muted },
                ]}
              >
                ハイライト
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setHasPendingActionsFilter(!hasPendingActionsFilter)}
            style={[
              styles.filterButton,
              {
                backgroundColor: hasPendingActionsFilter ? colors.success + "20" : colors.surface,
                borderColor: hasPendingActionsFilter ? colors.success : colors.border,
              },
            ]}
          >
            <View style={styles.filterButtonContent}>
              <IconSymbol name="checkmark" size={12} color={hasPendingActionsFilter ? colors.success : colors.muted} />
              <Text
                style={[
                  styles.filterText,
                  { color: hasPendingActionsFilter ? colors.success : colors.muted },
                ]}
              >
                未完了タスク
              </Text>
            </View>
          </TouchableOpacity>
        </View>
        <View style={styles.sortAndViewButtons}>
          <TouchableOpacity
            onPress={() => setViewMode(viewMode === "list" ? "grid" : "list")}
            style={[styles.viewModeButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <IconSymbol
              name={viewMode === "list" ? "square.grid.2x2" : "list.bullet"}
              size={14}
              color={colors.muted}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              const orders: ("newest" | "oldest" | "longest" | "shortest")[] = ["newest", "oldest", "longest", "shortest"];
              const currentIndex = orders.indexOf(sortOrder);
              setSortOrder(orders[(currentIndex + 1) % orders.length]);
            }}
            style={[styles.sortButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <IconSymbol
              name={sortOrder === "newest" || sortOrder === "oldest" ? "calendar" : "clock"}
              size={14}
              color={colors.muted}
            />
            <Text style={[styles.sortText, { color: colors.muted }]}>
              {sortOrder === "newest" ? "新しい順" : sortOrder === "oldest" ? "古い順" : sortOrder === "longest" ? "長い順" : "短い順"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tag Filter */}
      {allTags.length > 0 && (
        <View style={styles.tagFilterRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tagFilterContent}
          >
            <TouchableOpacity
              onPress={() => setSelectedTag(null)}
              style={[
                styles.tagFilterButton,
                {
                  backgroundColor: selectedTag === null ? colors.primary + "20" : colors.surface,
                  borderColor: selectedTag === null ? colors.primary : colors.border,
                },
              ]}
            >
              <IconSymbol name="tag.fill" size={14} color={selectedTag === null ? colors.primary : colors.muted} />
              <Text
                style={[
                  styles.tagFilterText,
                  { color: selectedTag === null ? colors.primary : colors.muted },
                ]}
              >
                すべてのタグ
              </Text>
            </TouchableOpacity>
            {allTags.map((tag) => (
              <TouchableOpacity
                key={tag}
                onPress={() => setSelectedTag(selectedTag === tag ? null : tag)}
                style={[
                  styles.tagFilterButton,
                  {
                    backgroundColor: selectedTag === tag ? colors.primary + "20" : colors.surface,
                    borderColor: selectedTag === tag ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tagFilterText,
                    { color: selectedTag === tag ? colors.primary : colors.muted },
                  ]}
                >
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <FlatList
        data={filteredRecordings}
        keyExtractor={(item) => item.id}
        key={`grid-${effectiveColumns}`}
        numColumns={effectiveColumns}
        renderItem={({ item }) => (
          <RecordingCard
            recording={item}
            onPress={() => handleRecordingPress(item.id)}
            onDelete={() => handleDelete(item.id)}
            columns={effectiveColumns}
            isSelectMode={isSelectMode}
            isSelected={selectedIds.has(item.id)}
            onToggleSelection={() => handleToggleSelection(item.id)}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          isDesktop && styles.listContentDesktop,
          isSelectMode && { paddingBottom: 160 },
        ]}
        columnWrapperStyle={effectiveColumns > 1 ? styles.columnWrapper : undefined}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        // パフォーマンス最適化: 大量データ対応
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
      />

      {/* Bottom action bar for batch operations */}
      {isSelectMode && (
        <View style={[styles.batchActionBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <View style={styles.batchActionInfo}>
            <Text style={[styles.batchActionCount, { color: colors.foreground }]}>
              {selectedIds.size}件選択中
            </Text>
            <View style={styles.batchActionButtons}>
              <TouchableOpacity
                onPress={selectedIds.size === filteredRecordings.length ? handleDeselectAll : handleSelectAll}
                style={[styles.batchActionButton, { borderColor: colors.border }]}
              >
                <Text style={[styles.batchActionButtonText, { color: colors.primary }]}>
                  {selectedIds.size === filteredRecordings.length ? "全解除" : "全選択"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity
            onPress={handleBatchDelete}
            disabled={selectedIds.size === 0}
            style={[
              styles.batchDeleteButton,
              {
                backgroundColor: selectedIds.size > 0 ? colors.error : colors.muted + "40",
              },
            ]}
          >
            <IconSymbol name="trash.fill" size={18} color="#FFFFFF" />
            <Text style={styles.batchDeleteText}>削除</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  selectModeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  selectModeText: {
    fontSize: 14,
    fontWeight: "500",
  },
  searchWrapper: {
    position: "relative",
    marginHorizontal: 20,
    zIndex: 100,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchHistoryDropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
  },
  searchHistoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
    marginBottom: 4,
  },
  searchHistoryTitle: {
    fontSize: 12,
    fontWeight: "600",
  },
  searchHistoryClear: {
    fontSize: 12,
    fontWeight: "500",
  },
  searchHistoryItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchHistoryItemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  searchHistoryText: {
    fontSize: 14,
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
    justifyContent: "space-between",
    alignItems: "center",
  },
  filterButtons: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  sortAndViewButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  viewModeButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  sortText: {
    fontSize: 12,
    fontWeight: "500",
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
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
  listContentDesktop: {
    maxWidth: 1200,
    alignSelf: "center",
    width: "100%",
  },
  columnWrapper: {
    justifyContent: "flex-start",
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
  deleteAction: {
    justifyContent: "center",
    alignItems: "flex-end",
    marginBottom: 12,
  },
  deleteButton: {
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    height: "100%",
    borderRadius: 16,
    gap: 4,
  },
  deleteText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  tagFilterRow: {
    paddingBottom: 8,
  },
  tagFilterContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  tagFilterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  tagFilterText: {
    fontSize: 13,
    fontWeight: "500",
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
  batchActionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 40,
    borderTopWidth: 1,
  },
  batchActionInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  batchActionCount: {
    fontSize: 16,
    fontWeight: "600",
  },
  batchActionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  batchActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  batchActionButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  batchDeleteButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  batchDeleteText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
