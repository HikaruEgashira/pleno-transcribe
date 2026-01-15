import { useState, useEffect } from "react";
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
  Platform,
  TextInput,
} from "react-native";
import Constants from "expo-constants";

import { ScreenContainer } from "@/packages/components/screen-container";
import { Haptics, Storage } from "@/packages/platform";
import { IconSymbol } from "@/packages/components/ui/icon-symbol";
import { useRecordings } from "@/packages/lib/recordings-context";
import { useColors } from "@/packages/hooks/use-colors";
import { useThemeContext } from "@/packages/lib/theme-provider";
import { useTranslation } from "@/packages/lib/i18n/context";
import { trpc } from "@/packages/lib/trpc";

type SummaryTemplate = "general" | "meeting" | "interview" | "lecture" | string;
type Language = "ja" | "en" | "auto";
type TranscriptionProvider = "elevenlabs" | "gemini";

interface CustomTemplate {
  id: string;
  name: string;
  prompt: string;
  createdAt: Date;
}

interface SettingsState {
  language: Language;
  summaryTemplate: SummaryTemplate;
  autoTranscribe: boolean;
  autoSummarize: boolean;
  transcriptionProvider: TranscriptionProvider;
  realtimeTranscription: {
    enabled: boolean;
    language: string;
    enableSpeakerDiarization: boolean;
  };
  realtimeTranslation: {
    enabled: boolean;
    targetLanguage: string;
  };
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

const TRANSLATION_LANGUAGES: { value: string; label: string }[] = [
  { value: "ja", label: "日本語" },
  { value: "en", label: "English (英語)" },
];

const SETTINGS_KEY = "app-settings";
const CUSTOM_TEMPLATES_KEY = "custom-templates";

export default function SettingsScreen() {
  const colors = useColors();
  const { state: recordingsState, addRecording } = useRecordings();
  const { colorScheme, setColorScheme } = useThemeContext();
  const { t } = useTranslation();

  const [settings, setSettings] = useState<SettingsState>({
    language: "auto",
    summaryTemplate: "general",
    autoTranscribe: true,
    autoSummarize: true,
    transcriptionProvider: "elevenlabs",
    realtimeTranscription: {
      enabled: true,
      language: "ja",
      enableSpeakerDiarization: true,
    },
    realtimeTranslation: {
      enabled: false,
      targetLanguage: "ja",
    },
  });

  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplatePrompt, setNewTemplatePrompt] = useState("");

  // Load settings and custom templates on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const saved = await Storage.getItem(SETTINGS_KEY);
        if (saved) {
          const savedSettings = JSON.parse(saved);
          // Merge with default settings to handle missing fields
          setSettings((prev) => ({
            ...prev,
            ...savedSettings,
            realtimeTranscription: {
              ...prev.realtimeTranscription,
              ...(savedSettings.realtimeTranscription || {}),
            },
            realtimeTranslation: {
              ...prev.realtimeTranslation,
              ...(savedSettings.realtimeTranslation || {}),
            },
          }));
        }

        // Load custom templates
        const savedTemplates = await Storage.getItem(CUSTOM_TEMPLATES_KEY);
        if (savedTemplates) {
          const templates: CustomTemplate[] = JSON.parse(savedTemplates);
          // Parse dates
          setCustomTemplates(templates.map(t => ({
            ...t,
            createdAt: new Date(t.createdAt),
          })));
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    };
    loadSettings();
  }, []);

  // Save settings whenever they change
  useEffect(() => {
    const saveSettings = async () => {
      try {
        await Storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      } catch (error) {
        console.error("Failed to save settings:", error);
      }
    };
    saveSettings();
  }, [settings]);

  const handleLanguageChange = (language: Language) => {
    Haptics.impact('light');
    setSettings((prev) => ({ ...prev, language }));
  };

  const handleTemplateChange = (template: SummaryTemplate) => {
    Haptics.impact('light');
    setSettings((prev) => ({ ...prev, summaryTemplate: template }));
  };

  const handleToggle = (key: "autoTranscribe" | "autoSummarize") => {
    Haptics.impact('light');
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleClearData = async () => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm("すべての録音データを削除しますか？この操作は取り消せません。");
      if (confirmed) {
        try {
          await Storage.clear();
          window.alert("すべてのデータが削除されました。ページを再読み込みしてください。");
          window.location.reload();
        } catch {
          window.alert("データの削除に失敗しました");
        }
      }
    } else {
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
                await Storage.clear();
                Alert.alert("完了", "すべてのデータが削除されました。アプリを再起動してください。");
              } catch {
                Alert.alert("エラー", "データの削除に失敗しました");
              }
            },
          },
        ]
      );
    }
  };

  const importMutation = trpc.ai.importRecording.useMutation();

  const handleImport = async () => {
    Haptics.impact('light');

    if (Platform.OS === "web") {
      // Web: ファイル選択ダイアログを表示
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json,.csv";
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        try {
          const content = await file.text();
          const format = file.name.endsWith(".csv") ? "csv" : "json";

          const result = await importMutation.mutateAsync({
            format: format as "csv" | "json",
            data: content,
          });

          if (result.success && result.recordings) {
            // インポートした録音をストレージに追加
            for (const rec of result.recordings) {
              await addRecording({
                ...rec,
                audioUri: "",
                duration: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
                highlights: [],
                notes: "",
                tags: rec.tags || [],
                actionItems: rec.actionItems || [],
                keywords: rec.keywords || [],
                qaHistory: [],
                status: "saved",
              });
            }
            window.alert(`${result.count}件の録音メタデータをインポートしました。`);
          }
        } catch (error) {
          console.error("Import error:", error);
          window.alert("インポートに失敗しました");
        }
      };
      input.click();
    } else {
      // Native: DocumentPickerを使用
      try {
        const { getDocumentAsync } = await import("expo-document-picker");
        const result = await getDocumentAsync({
          type: ["application/json", "text/csv"],
        });

        if (result.canceled || !result.assets?.[0]) return;

        const file = result.assets[0];
        const response = await fetch(file.uri);
        const content = await response.text();
        const format = file.name?.endsWith(".csv") ? "csv" : "json";

        const importResult = await importMutation.mutateAsync({
          format: format as "csv" | "json",
          data: content,
        });

        if (importResult.success && importResult.recordings) {
          for (const rec of importResult.recordings) {
            await addRecording({
              ...rec,
              audioUri: "",
              duration: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
              highlights: [],
              notes: "",
              tags: rec.tags || [],
              actionItems: rec.actionItems || [],
              keywords: rec.keywords || [],
              qaHistory: [],
              status: "saved",
            });
          }
          Alert.alert("完了", `${importResult.count}件の録音メタデータをインポートしました。`);
        }
      } catch (error) {
        console.error("Import error:", error);
        Alert.alert("エラー", "インポートに失敗しました");
      }
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim() || !newTemplatePrompt.trim()) {
      Alert.alert("エラー", "テンプレート名とプロンプトを入力してください");
      return;
    }

    const newTemplate: CustomTemplate = {
      id: Date.now().toString(),
      name: newTemplateName.trim(),
      prompt: newTemplatePrompt.trim(),
      createdAt: new Date(),
    };

    const updatedTemplates = [...customTemplates, newTemplate];
    setCustomTemplates(updatedTemplates);
    await Storage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(updatedTemplates));

    // Reset form
    setNewTemplateName("");
    setNewTemplatePrompt("");
    setShowTemplateForm(false);

    Alert.alert("完了", "カスタムテンプレートを作成しました");
  };

  const handleDeleteTemplate = async (templateId: string) => {
    const updated = customTemplates.filter(t => t.id !== templateId);
    setCustomTemplates(updated);
    await Storage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(updated));
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

        {/* Dark Mode */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleContent}>
              <Text style={[styles.toggleLabel, { color: colors.foreground }]}>ダークモード</Text>
              <Text style={[styles.toggleDescription, { color: colors.muted }]}>
                暗い環境での目の疲労を軽減
              </Text>
            </View>
            <Switch
              value={colorScheme === "dark"}
              onValueChange={async (value) => {
                await setColorScheme(value ? "dark" : "light");
                await Storage.setItem("theme-preference", value ? "dark" : "light");
                await Haptics.impact("light");
              }}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Transcription Provider - Hidden: ElevenLabs is now default
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>文字起こしプロバイダ</Text>
          {TRANSCRIPTION_PROVIDERS.map((provider) => (
            <TouchableOpacity
              key={provider.value}
              onPress={() => handleProviderChange(provider.value)}
              style={[
                styles.templateItem,
                {
                  backgroundColor:
                    settings.transcriptionProvider === provider.value
                      ? colors.primary + "15"
                      : "transparent",
                  borderColor:
                    settings.transcriptionProvider === provider.value ? colors.primary : colors.border,
                },
              ]}
            >
              <View style={styles.templateContent}>
                <Text
                  style={[
                    styles.templateLabel,
                    {
                      color:
                        settings.transcriptionProvider === provider.value
                          ? colors.primary
                          : colors.foreground,
                    },
                  ]}
                >
                  {provider.label}
                </Text>
                <Text style={[styles.templateDescription, { color: colors.muted }]}>
                  {provider.description}
                </Text>
              </View>
              {settings.transcriptionProvider === provider.value && (
                <IconSymbol name="checkmark" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
        */}

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

          {/* Custom Templates */}
          {customTemplates.length > 0 && (
            <View style={[styles.customTemplatesSection, { borderTopColor: colors.border }]}>
              <Text style={[styles.subsectionTitle, { color: colors.foreground }]}>
                カスタムテンプレート ({customTemplates.length})
              </Text>
              {customTemplates.map((template) => (
                <View
                  key={template.id}
                  style={[
                    styles.customTemplateItem,
                    { backgroundColor: colors.background, borderColor: colors.border }
                  ]}
                >
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={() => handleTemplateChange(template.id)}
                  >
                    <Text style={[styles.customTemplateName, { color: colors.foreground }]}>
                      {template.name}
                    </Text>
                    <Text
                      style={[styles.customTemplatePrompt, { color: colors.muted }]}
                      numberOfLines={2}
                    >
                      {template.prompt}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteTemplate(template.id)}
                    style={styles.deleteButton}
                  >
                    <IconSymbol name="xmark" size={18} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Add Custom Template Button */}
          <TouchableOpacity
            onPress={() => setShowTemplateForm(!showTemplateForm)}
            style={[styles.addTemplateButton, { backgroundColor: colors.primary + "15" }]}
          >
            <IconSymbol name="plus" size={18} color={colors.primary} />
            <Text style={[styles.addTemplateButtonText, { color: colors.primary }]}>
              カスタムテンプレートを追加
            </Text>
          </TouchableOpacity>

          {/* Template Form */}
          {showTemplateForm && (
            <View style={[styles.templateForm, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.formLabel, { color: colors.foreground }]}>テンプレート名</Text>
              <TextInput
                style={[
                  styles.textInput,
                  { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }
                ]}
                placeholder="例: マーケティング会議"
                placeholderTextColor={colors.muted}
                value={newTemplateName}
                onChangeText={setNewTemplateName}
              />

              <Text style={[styles.formLabel, { color: colors.foreground, marginTop: 16 }]}>
                プロンプト
              </Text>
              <TextInput
                style={[
                  styles.textInputMultiline,
                  { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }
                ]}
                placeholder="カスタマイズしたプロンプトを入力してください"
                placeholderTextColor={colors.muted}
                value={newTemplatePrompt}
                onChangeText={setNewTemplatePrompt}
                multiline
                numberOfLines={4}
              />

              <View style={styles.formButtons}>
                <TouchableOpacity
                  onPress={handleCreateTemplate}
                  style={[styles.formButton, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.formButtonText}>作成</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setShowTemplateForm(false);
                    setNewTemplateName("");
                    setNewTemplatePrompt("");
                  }}
                  style={[styles.formButton, { backgroundColor: colors.muted + "20" }]}
                >
                  <Text style={[styles.formButtonText, { color: colors.foreground }]}>キャンセル</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
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

        {/* Realtime Transcription */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            リアルタイム文字起こし
          </Text>
          <View style={[styles.toggleRow, { borderBottomColor: colors.border }]}>
            <View style={styles.toggleContent}>
              <Text style={[styles.toggleLabel, { color: colors.foreground }]}>
                リアルタイムモード
              </Text>
              <Text style={[styles.toggleDescription, { color: colors.muted }]}>
                録音中にリアルタイムで文字起こし結果を表示（150ms遅延）
              </Text>
            </View>
            <Switch
              value={settings.realtimeTranscription.enabled}
              onValueChange={() => {
                Haptics.impact('light');
                setSettings((prev) => ({
                  ...prev,
                  realtimeTranscription: {
                    ...prev.realtimeTranscription,
                    enabled: !prev.realtimeTranscription.enabled,
                  },
                }));
              }}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
          {settings.realtimeTranscription.enabled && (
            <>
              <View style={styles.toggleRow}>
                <View style={styles.toggleContent}>
                  <Text style={[styles.toggleLabel, { color: colors.foreground }]}>話者分離</Text>
                  <Text style={[styles.toggleDescription, { color: colors.muted }]}>
                    複数の話者を自動識別してラベル付け
                  </Text>
                </View>
                <Switch
                  value={settings.realtimeTranscription.enableSpeakerDiarization}
                  onValueChange={() => {
                    Haptics.impact('light');
                    setSettings((prev) => ({
                      ...prev,
                      realtimeTranscription: {
                        ...prev.realtimeTranscription,
                        enableSpeakerDiarization:
                          !prev.realtimeTranscription.enableSpeakerDiarization,
                      },
                    }));
                  }}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
              <View style={[styles.noteBox, { backgroundColor: colors.warning + "15" }]}>
                <IconSymbol name="exclamationmark.triangle.fill" size={16} color={colors.warning} />
                <Text style={[styles.noteText, { color: colors.warning }]}>
                  リアルタイムモードはネットワーク使用量とバッテリー消費が増加します
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Realtime Translation */}
        {settings.realtimeTranscription.enabled && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              リアルタイム翻訳
            </Text>
            <View style={[styles.toggleRow, { borderBottomColor: colors.border }]}>
              <View style={styles.toggleContent}>
                <Text style={[styles.toggleLabel, { color: colors.foreground }]}>
                  翻訳を有効化
                </Text>
                <Text style={[styles.toggleDescription, { color: colors.muted }]}>
                  文字起こし結果をリアルタイムで翻訳
                </Text>
              </View>
              <Switch
                value={settings.realtimeTranslation.enabled}
                onValueChange={() => {
                  Haptics.impact('light');
                  setSettings((prev) => ({
                    ...prev,
                    realtimeTranslation: {
                      ...prev.realtimeTranslation,
                      enabled: !prev.realtimeTranslation.enabled,
                    },
                  }));
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
            {settings.realtimeTranslation.enabled && (
              <>
                <Text style={[styles.optionLabel, { color: colors.muted, marginTop: 12, marginBottom: 8 }]}>
                  翻訳先言語
                </Text>
                {TRANSLATION_LANGUAGES.map((lang) => (
                  <TouchableOpacity
                    key={lang.value}
                    onPress={() => {
                      Haptics.impact('light');
                      setSettings((prev) => ({
                        ...prev,
                        realtimeTranslation: {
                          ...prev.realtimeTranslation,
                          targetLanguage: lang.value,
                        },
                      }));
                    }}
                    style={[
                      styles.templateItem,
                      {
                        backgroundColor:
                          settings.realtimeTranslation.targetLanguage === lang.value
                            ? colors.primary + "15"
                            : "transparent",
                        borderColor:
                          settings.realtimeTranslation.targetLanguage === lang.value
                            ? colors.primary
                            : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.templateLabel,
                        {
                          color:
                            settings.realtimeTranslation.targetLanguage === lang.value
                              ? colors.primary
                              : colors.foreground,
                        },
                      ]}
                    >
                      {lang.label}
                    </Text>
                    {settings.realtimeTranslation.targetLanguage === lang.value && (
                      <IconSymbol name="checkmark" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
                <View style={[styles.noteBox, { backgroundColor: colors.warning + "15" }]}>
                  <IconSymbol name="exclamationmark.triangle.fill" size={16} color={colors.warning} />
                  <Text style={[styles.noteText, { color: colors.warning }]}>
                    リアルタイム翻訳はAPI使用量が増加します
                  </Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* Data Management */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>データ管理</Text>
          <TouchableOpacity
            onPress={handleImport}
            disabled={importMutation.isPending}
            style={[styles.importButton, { borderColor: colors.primary }]}
          >
            {importMutation.isPending ? (
              <Text style={[styles.importButtonText, { color: colors.primary }]}>
                インポート中...
              </Text>
            ) : (
              <>
                <IconSymbol name="square.and.arrow.down" size={20} color={colors.primary} />
                <Text style={[styles.importButtonText, { color: colors.primary }]}>
                  ファイルからインポート (JSON/CSV)
                </Text>
              </>
            )}
          </TouchableOpacity>
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
            <Text style={[styles.infoValue, { color: colors.foreground }]}>
              {Constants.expoConfig?.version ?? "1.4.1"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>アプリ名</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>
              {Constants.expoConfig?.name ?? "Pleno Transcribe"}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.muted }]}>
            Pleno Transcribe
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
  optionLabel: {
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
  importButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    marginBottom: 12,
  },
  importButtonText: {
    fontSize: 15,
    fontWeight: "500",
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
  noteBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
    gap: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
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
  customTemplatesSection: {
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 12,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10,
  },
  customTemplateItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    gap: 8,
  },
  customTemplateName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  customTemplatePrompt: {
    fontSize: 12,
    lineHeight: 16,
  },
  deleteButton: {
    padding: 6,
  },
  addTemplateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 12,
  },
  addTemplateButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  templateForm: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textInputMultiline: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    textAlignVertical: "top",
  },
  formButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  formButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
  },
  formButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
