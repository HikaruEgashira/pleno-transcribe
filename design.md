# Pleno Live - Design Document

## Overview

音声録音、AI文字起こし、要約、Q&A機能を備えたモバイルアプリ。Pleno Liveの主要機能をReact Native/Expoで実装する。

## Screen List

### 1. Home Screen (録音一覧)
- 録音ファイルの一覧表示（カード形式）
- 各カードに: タイトル、日時、長さ、文字起こし/要約ステータス
- フローティング録音ボタン（中央下部）
- 検索バー（上部）
- フィルター機能（すべて/文字起こし済み/要約済み）

### 2. Recording Screen (録音画面)
- 大きな録音ボタン（中央）
- 録音時間表示
- 波形ビジュアライザー
- ハイライトボタン（重要箇所マーク）
- テキストメモ入力フィールド
- 一時停止/再開ボタン
- 停止ボタン

### 3. Note Detail Screen (ノート詳細)
- タブ構成: 音声 | 文字起こし | 要約 | Q&A
- **音声タブ**: 再生コントロール、波形表示、ハイライトマーカー
- **文字起こしタブ**: テキスト表示、話者ラベル、タイムスタンプ
- **要約タブ**: AI生成要約、アクションアイテム、キーポイント
- **Q&Aタブ**: チャット形式のAI質問応答

### 4. Settings Screen (設定)
- 録音品質設定
- 言語設定
- 要約テンプレート選択
- データ管理（エクスポート/削除）
- アプリ情報

## Primary Content and Functionality

### Home Screen
- **FlatList**: 録音ノートのリスト
- **検索機能**: タイトル・文字起こしテキストで検索
- **FAB**: 新規録音開始
- **スワイプアクション**: 削除、共有

### Recording Screen
- **expo-audio**: マイク録音
- **リアルタイム波形**: 音声レベルの可視化
- **ハイライト機能**: タップでタイムスタンプ記録
- **メモ入力**: 録音中のテキストメモ追加

### Note Detail Screen
- **音声再生**: expo-audio player
- **文字起こし**: サーバーAI APIで処理
- **要約生成**: LLMで要約・アクションアイテム抽出
- **Q&A**: 録音内容に基づくAI質問応答

## Key User Flows

### Flow 1: 新規録音
1. Home → FABタップ
2. Recording Screen表示
3. 録音ボタンタップで開始
4. 必要に応じてハイライト/メモ追加
5. 停止ボタンで終了
6. 自動的にNote Detail Screenへ遷移
7. 文字起こし処理を開始

### Flow 2: 文字起こし・要約
1. Note Detail Screen → 文字起こしタブ
2. 「文字起こし開始」ボタンタップ
3. 処理中インジケーター表示
4. 完了後、テキスト表示
5. 要約タブで「要約生成」タップ
6. AI要約結果表示

### Flow 3: AI Q&A
1. Note Detail Screen → Q&Aタブ
2. 質問入力フィールドに入力
3. 送信ボタンタップ
4. AI回答表示（元音声への参照付き）
5. フォローアップ質問可能

### Flow 4: 検索・フィルター
1. Home → 検索バータップ
2. キーワード入力
3. リアルタイム検索結果表示
4. フィルターで絞り込み

## Color Choices

### Primary Palette
- **Primary**: `#6366F1` (Indigo) - メインアクション、録音ボタン
- **Secondary**: `#8B5CF6` (Purple) - AI関連機能のアクセント
- **Success**: `#22C55E` (Green) - 完了状態、録音中
- **Warning**: `#F59E0B` (Amber) - ハイライト、注意
- **Error**: `#EF4444` (Red) - 削除、エラー

### Background & Surface
- **Background Light**: `#FFFFFF`
- **Background Dark**: `#0F172A` (Slate 900)
- **Surface Light**: `#F8FAFC` (Slate 50)
- **Surface Dark**: `#1E293B` (Slate 800)

### Text
- **Foreground Light**: `#0F172A` (Slate 900)
- **Foreground Dark**: `#F8FAFC` (Slate 50)
- **Muted Light**: `#64748B` (Slate 500)
- **Muted Dark**: `#94A3B8` (Slate 400)

## Tab Navigation Structure

1. **Home** (house.fill) - 録音一覧
2. **Record** (mic.fill) - 録音画面（中央、強調）
3. **Settings** (gearshape.fill) - 設定

## Component Architecture

### Shared Components
- `RecordingCard`: 録音アイテムカード
- `AudioPlayer`: 音声再生コントロール
- `WaveformVisualizer`: 波形表示
- `TranscriptView`: 文字起こしテキスト表示
- `ChatMessage`: Q&Aメッセージ
- `LoadingOverlay`: 処理中オーバーレイ

### Data Models
```typescript
interface Recording {
  id: string;
  title: string;
  audioUri: string;
  duration: number;
  createdAt: Date;
  highlights: Highlight[];
  notes: string;
  transcript?: Transcript;
  summary?: Summary;
  qaHistory?: QAMessage[];
}

interface Highlight {
  id: string;
  timestamp: number;
  label?: string;
}

interface Transcript {
  text: string;
  segments: TranscriptSegment[];
  language: string;
  processedAt: Date;
}

interface TranscriptSegment {
  text: string;
  startTime: number;
  endTime: number;
  speaker?: string;
}

interface Summary {
  overview: string;
  keyPoints: string[];
  actionItems: string[];
  processedAt: Date;
}

interface QAMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  references?: { startTime: number; endTime: number; text: string }[];
}
```

## Technical Notes

- **ローカルストレージ**: AsyncStorage + expo-file-system for audio files
- **AI処理**: サーバーサイドのLLM API（内蔵）を使用
- **状態管理**: React Context + useReducer
- **音声録音**: expo-audio
- **音声再生**: expo-audio useAudioPlayer
