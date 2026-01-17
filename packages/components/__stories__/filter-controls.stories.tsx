import type { Meta, StoryObj } from "@storybook/react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from "react-native";
import { useColors } from "@/packages/hooks/use-colors";
import { IconSymbol } from "@/packages/components/ui/icon-symbol";

interface SmartFolder {
  id: string;
  name: string;
  icon: "clock.fill" | "calendar" | "exclamationmark.triangle.fill" | "face.smiling";
  color: string;
  count: number;
}

interface FilterControlsProps {
  searchQuery: string;
  filter: "all" | "transcribed" | "summarized";
  activeSmartFolder: string | null;
  hasHighlightsFilter: boolean;
  hasPendingActionsFilter: boolean;
  selectedTag: string | null;
  sortOrder: "newest" | "oldest" | "longest" | "shortest";
  viewMode: "list" | "grid";
  allTags: string[];
  smartFolders: SmartFolder[];
  recordingsCount: number;
}

function FilterControls({
  searchQuery,
  filter,
  activeSmartFolder,
  hasHighlightsFilter,
  hasPendingActionsFilter,
  selectedTag,
  sortOrder,
  viewMode,
  allTags,
  smartFolders,
  recordingsCount,
}: FilterControlsProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>ノート</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              {recordingsCount}件
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.selectModeButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <IconSymbol name="checkmark.circle" size={16} color={colors.muted} />
            <Text style={[styles.selectModeText, { color: colors.muted }]}>
              選択
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Smart Folders */}
      <View style={styles.smartFoldersRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.smartFoldersContent}
        >
          {smartFolders.map((folder) => {
            const isActive = activeSmartFolder === folder.id;
            return (
              <TouchableOpacity
                key={folder.id}
                style={[
                  styles.smartFolderButton,
                  {
                    backgroundColor: isActive ? folder.color + "20" : colors.surface,
                    borderColor: isActive ? folder.color : colors.border,
                  },
                ]}
              >
                <IconSymbol name={folder.icon} size={14} color={isActive ? folder.color : colors.muted} />
                <Text
                  style={[
                    styles.smartFolderText,
                    { color: isActive ? folder.color : colors.muted },
                  ]}
                >
                  {folder.name}
                </Text>
                <View style={[styles.smartFolderBadge, { backgroundColor: isActive ? folder.color : colors.muted + "30" }]}>
                  <Text style={[styles.smartFolderBadgeText, { color: isActive ? "#FFFFFF" : colors.muted }]}>
                    {folder.count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Search */}
      <View style={styles.searchWrapper}>
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <IconSymbol name="magnifyingglass" size={20} color={colors.muted} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="タイトル、タグ、内容を検索..."
            placeholderTextColor={colors.muted}
            value={searchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity>
              <IconSymbol name="xmark" size={18} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Row */}
      <View style={styles.filterRow}>
        <View style={styles.filterButtons}>
          {(["all", "transcribed", "summarized"] as const).map((f) => (
            <TouchableOpacity
              key={f}
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
          <TouchableOpacity
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
            style={[styles.viewModeButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <IconSymbol
              name={viewMode === "list" ? "square.grid.2x2" : "list.bullet"}
              size={14}
              color={colors.muted}
            />
          </TouchableOpacity>
          <TouchableOpacity
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f5f5f5",
  },
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
  smartFoldersRow: {
    marginBottom: 8,
  },
  smartFoldersContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  smartFolderButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  smartFolderText: {
    fontSize: 13,
    fontWeight: "500",
  },
  smartFolderBadge: {
    minWidth: 20,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  smartFolderBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  searchWrapper: {
    marginHorizontal: 20,
    marginBottom: 8,
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
    flexWrap: "wrap",
    gap: 8,
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
});

const meta: Meta<typeof FilterControls> = {
  title: "Notes/FilterControls",
  component: FilterControls,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof FilterControls>;

const defaultSmartFolders: SmartFolder[] = [
  { id: "unprocessed", name: "未処理", icon: "clock.fill", color: "#F59E0B", count: 3 },
  { id: "this-week", name: "今週", icon: "calendar", color: "#3B82F6", count: 8 },
  { id: "high-priority", name: "重要タスク", icon: "exclamationmark.triangle.fill", color: "#EF4444", count: 2 },
  { id: "positive-sentiment", name: "ポジティブ", icon: "face.smiling", color: "#10B981", count: 5 },
];

const defaultTags = ["会議", "アイデア", "タスク", "メモ", "重要"];

export const Default: Story = {
  args: {
    searchQuery: "",
    filter: "all",
    activeSmartFolder: null,
    hasHighlightsFilter: false,
    hasPendingActionsFilter: false,
    selectedTag: null,
    sortOrder: "newest",
    viewMode: "list",
    allTags: defaultTags,
    smartFolders: defaultSmartFolders,
    recordingsCount: 25,
  },
};

export const WithSearch: Story = {
  args: {
    searchQuery: "プロジェクト",
    filter: "all",
    activeSmartFolder: null,
    hasHighlightsFilter: false,
    hasPendingActionsFilter: false,
    selectedTag: null,
    sortOrder: "newest",
    viewMode: "list",
    allTags: defaultTags,
    smartFolders: defaultSmartFolders,
    recordingsCount: 5,
  },
};

export const TranscribedFilter: Story = {
  args: {
    searchQuery: "",
    filter: "transcribed",
    activeSmartFolder: null,
    hasHighlightsFilter: false,
    hasPendingActionsFilter: false,
    selectedTag: null,
    sortOrder: "newest",
    viewMode: "list",
    allTags: defaultTags,
    smartFolders: defaultSmartFolders,
    recordingsCount: 18,
  },
};

export const SmartFolderActive: Story = {
  args: {
    searchQuery: "",
    filter: "all",
    activeSmartFolder: "this-week",
    hasHighlightsFilter: false,
    hasPendingActionsFilter: false,
    selectedTag: null,
    sortOrder: "newest",
    viewMode: "list",
    allTags: defaultTags,
    smartFolders: defaultSmartFolders,
    recordingsCount: 8,
  },
};

export const HighlightsFilter: Story = {
  args: {
    searchQuery: "",
    filter: "all",
    activeSmartFolder: null,
    hasHighlightsFilter: true,
    hasPendingActionsFilter: false,
    selectedTag: null,
    sortOrder: "newest",
    viewMode: "list",
    allTags: defaultTags,
    smartFolders: defaultSmartFolders,
    recordingsCount: 10,
  },
};

export const TagSelected: Story = {
  args: {
    searchQuery: "",
    filter: "all",
    activeSmartFolder: null,
    hasHighlightsFilter: false,
    hasPendingActionsFilter: false,
    selectedTag: "会議",
    sortOrder: "newest",
    viewMode: "list",
    allTags: defaultTags,
    smartFolders: defaultSmartFolders,
    recordingsCount: 12,
  },
};

export const GridView: Story = {
  args: {
    searchQuery: "",
    filter: "all",
    activeSmartFolder: null,
    hasHighlightsFilter: false,
    hasPendingActionsFilter: false,
    selectedTag: null,
    sortOrder: "newest",
    viewMode: "grid",
    allTags: defaultTags,
    smartFolders: defaultSmartFolders,
    recordingsCount: 25,
  },
};

export const OldestFirst: Story = {
  args: {
    searchQuery: "",
    filter: "all",
    activeSmartFolder: null,
    hasHighlightsFilter: false,
    hasPendingActionsFilter: false,
    selectedTag: null,
    sortOrder: "oldest",
    viewMode: "list",
    allTags: defaultTags,
    smartFolders: defaultSmartFolders,
    recordingsCount: 25,
  },
};

export const MultipleFiltersActive: Story = {
  args: {
    searchQuery: "ミーティング",
    filter: "summarized",
    activeSmartFolder: "this-week",
    hasHighlightsFilter: true,
    hasPendingActionsFilter: true,
    selectedTag: "会議",
    sortOrder: "longest",
    viewMode: "list",
    allTags: defaultTags,
    smartFolders: defaultSmartFolders,
    recordingsCount: 2,
  },
};

export const NoTags: Story = {
  args: {
    searchQuery: "",
    filter: "all",
    activeSmartFolder: null,
    hasHighlightsFilter: false,
    hasPendingActionsFilter: false,
    selectedTag: null,
    sortOrder: "newest",
    viewMode: "list",
    allTags: [],
    smartFolders: defaultSmartFolders,
    recordingsCount: 25,
  },
};
