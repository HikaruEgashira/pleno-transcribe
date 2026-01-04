import { useState } from "react";
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRecordings } from "@/lib/recordings-context";
import { useColors } from "@/hooks/use-colors";

type SummaryTemplate = "general" | "meeting" | "interview" | "lecture";
type Language = "ja" | "en" | "auto";

interface SettingsState {
  language: Language;
  summaryTemplate: SummaryTemplate;
  autoTranscribe: boolean;
  autoSummarize: boolean;
}

const LANGUAGES: { value: Language; label: string }[] = [
  { value: "auto", label: "自動検出" },
  { value: "ja", label: "日本語" },
  { value: "en", label: "English" },
];

const TEMPLATES: { value: SummaryTemplate; label: string; description: string }[] = [
  { value: "general", label: "一般", description: "汎用的な要約形式" },
  { value: "meeting", label: "会議", description: "議題・決定事項・アクションアイテム" },
  { value: "interview", label: "インタビュー", description: "主要トピック・重要発言・結論" },
  { value: "lecture", label: "講義", description: "主要概念・学習ポイント" },
];

export default function SettingsScreen() {
  const colors = useColors();
  const { state: recordingsState } = useRecordings();

  const [settings, setSettings] = useState<SettingsState>({
    language: "auto",
    summaryTemplate: "general",
    autoTranscribe: false,
    autoSummarize: false,
  });

  const handleLanguageChange = (language: Language) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSettings((prev) => ({ ...prev, language }));
  };

  const handleTemplateChange = (template: SummaryTemplate) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSettings((prev) => ({ ...prev, summaryTemplate: template }));
  };

  const handleToggle = (key: "autoTranscribe" | "autoSummarize") => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleClearData = () => {
    Alert.alert(
      "データを削除",
      "すべての録音データを削除しますか？この操作は取り消せません。",
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              Alert.alert("完了", "すべてのデータが削除されました。アプリを再起動してください。");
            } catch (error) {
              Alert.alert("エラー", "データの削除に失敗しました");
            }
          },
        },
      ]
    );
  };

  const totalDuration = recordingsState.recordings.reduce((sum, r) => sum + r.duration, 0);
  const transcribedCount = recordingsState.recordings.filter((r) => r.transcript).length;
  const summarizedCount = recordingsState.recordings.filter((r) => r.summary).length;

  return (
    <ScreenContainer>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>設定</Text>
        </View>

        {/* Statistics */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>統計</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {recordingsState.recordings.length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>録音数</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {Math.floor(totalDuration / 60)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>合計時間(分)</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.success }]}>{transcribedCount}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>文字起こし済</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.secondary }]}>{summarizedCount}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>要約済</Text>
            </View>
          </View>
        </View>

        {/* Language */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>言語設定</Text>
          <View style={styles.optionGroup}>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.value}
                onPress={() => handleLanguageChange(lang.value)}
                style={[
                  styles.optionButton,
                  {
                    backgroundColor:
                      settings.language === lang.value ? colors.primary : colors.background,
                    borderColor:
                      settings.language === lang.value ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.optionText,
                    {
                      color:
                        settings.language === lang.value ? "#FFFFFF" : colors.foreground,
                    },
                  ]}
                >
                  {lang.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Summary Template */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>要約テンプレート</Text>
          {TEMPLATES.map((template) => (
            <TouchableOpacity
              key={template.value}
              onPress={() => handleTemplateChange(template.value)}
              style={[
                styles.templateItem,
                {
                  backgroundColor:
                    settings.summaryTemplate === template.value
                      ? colors.primary + "15"
                      : "transparent",
                  borderColor:
                    settings.summaryTemplate === template.value ? colors.primary : colors.border,
                },
              ]}
            >
              <View style={styles.templateContent}>
                <Text
                  style={[
                    styles.templateLabel,
                    {
                      color:
                        settings.summaryTemplate === template.value
                          ? colors.primary
                          : colors.foreground,
                    },
                  ]}
                >
                  {template.label}
                </Text>
                <Text style={[styles.templateDescription, { color: colors.muted }]}>
                  {template.description}
                </Text>
              </View>
              {settings.summaryTemplate === template.value && (
                <IconSymbol name="checkmark" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Auto Processing */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>自動処理</Text>
          <View style={[styles.toggleRow, { borderBottomColor: colors.border }]}>
            <View style={styles.toggleContent}>
              <Text style={[styles.toggleLabel, { color: colors.foreground }]}>
                自動文字起こし
              </Text>
              <Text style={[styles.toggleDescription, { color: colors.muted }]}>
                録音完了後に自動で文字起こしを開始
              </Text>
            </View>
            <Switch
              value={settings.autoTranscribe}
              onValueChange={() => handleToggle("autoTranscribe")}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View style={styles.toggleRow}>
            <View style={styles.toggleContent}>
              <Text style={[styles.toggleLabel, { color: colors.foreground }]}>自動要約</Text>
              <Text style={[styles.toggleDescription, { color: colors.muted }]}>
                文字起こし完了後に自動で要約を生成
              </Text>
            </View>
            <Switch
              value={settings.autoSummarize}
              onValueChange={() => handleToggle("autoSummarize")}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Data Management */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>データ管理</Text>
          <TouchableOpacity
            onPress={handleClearData}
            style={[styles.dangerButton, { borderColor: colors.error }]}
          >
            <IconSymbol name="trash.fill" size={20} color={colors.error} />
            <Text style={[styles.dangerButtonText, { color: colors.error }]}>
              すべてのデータを削除
            </Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>アプリ情報</Text>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>バージョン</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>1.0.0</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>ビルド</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>2024.01</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.muted }]}>
            Plaud Note Pro Alternative
          </Text>
          <Text style={[styles.footerSubtext, { color: colors.muted }]}>
            音声録音・文字起こし・AI要約アプリ
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  statItem: {
    width: "50%",
    paddingVertical: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 13,
    marginTop: 2,
  },
  optionGroup: {
    flexDirection: "row",
    gap: 8,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  optionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  templateItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  templateContent: {
    flex: 1,
  },
  templateLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  templateDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  toggleContent: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  toggleDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  dangerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  dangerButtonText: {
    fontSize: 15,
    fontWeight: "500",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  footer: {
    alignItems: "center",
    paddingVertical: 32,
  },
  footerText: {
    fontSize: 14,
    fontWeight: "500",
  },
  footerSubtext: {
    fontSize: 12,
    marginTop: 4,
  },
});
