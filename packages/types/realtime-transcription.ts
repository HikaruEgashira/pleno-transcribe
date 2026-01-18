/**
 * リアルタイム文字起こし機能の型定義
 */

/**
 * ElevenLabs Realtime APIのオプション
 */
export interface RealtimeOptions {
  /** 言語コード（ISO 639-1形式） */
  languageCode?: string;
  /** 話者分離（diarization）を有効化 */
  enableDiarization?: boolean;
  /** Voice Activity Detection設定 */
  vad?: {
    /** 沈黙判定時間（秒） */
    silenceThresholdSecs?: number;
    /** 最小音声継続時間（秒） */
    minSpeechDurationSecs?: number;
  };
  /** 内部マイクストリーミングをスキップ（外部から音声を送信する場合） */
  skipAudioStreaming?: boolean;
}

/**
 * 文字起こしセグメント
 */
export interface TranscriptSegment {
  /** 一意のID */
  id: string;
  /** テキスト内容 */
  text: string;
  /** 部分的な結果か確定結果か */
  isPartial: boolean;
  /** 録音開始からのタイムスタンプ（秒） */
  timestamp: number;
  /** 話者ID（diarizationが有効な場合） */
  speaker?: string;
  /** 信頼度スコア（0-1） */
  confidence?: number;
}

/**
 * リアルタイム文字起こしの状態
 */
export interface RealtimeTranscriptionState {
  /** セッションがアクティブかどうか */
  isActive: boolean;
  /** 文字起こしセグメントのリスト */
  segments: TranscriptSegment[];
  /** WebSocket接続状態 */
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  /** エラーメッセージ */
  error?: string;
}

/**
 * ElevenLabs Realtime APIメッセージ型
 */
export interface RealtimeMessage {
  /** メッセージタイプ（ElevenLabsは message_type を使用） */
  message_type?: 'session_started' | 'partial_transcript' | 'committed_transcript' |
        'committed_transcript_with_timestamps' | 'error';
  /** 旧フィールド名（互換性のため） */
  type?: string;
  /** メッセージデータ */
  [key: string]: unknown;
}

/**
 * Partial Transcriptメッセージ
 */
export interface PartialTranscriptMessage extends RealtimeMessage {
  type: 'partial_transcript';
  /** 部分的な文字起こしテキスト */
  text: string;
}

/**
 * Committed Transcriptメッセージ
 */
export interface CommittedTranscriptMessage extends RealtimeMessage {
  type: 'committed_transcript';
  /** 確定した文字起こしテキスト */
  text: string;
}

/**
 * Committed Transcript with Timestampsメッセージ
 */
export interface CommittedTranscriptWithTimestampsMessage extends RealtimeMessage {
  type: 'committed_transcript_with_timestamps';
  /** 確定した文字起こしテキスト */
  text: string;
  /** 単語レベルの情報 */
  words: Array<{
    text: string;
    start: number;
    end: number;
    speaker_id?: string;
  }>;
}

/**
 * エラーメッセージ
 */
export interface ErrorMessage extends RealtimeMessage {
  type: 'error';
  /** エラーコード */
  code: string;
  /** エラーメッセージ */
  message: string;
}

/**
 * 翻訳ステータス
 */
export type TranslationStatus = 'pending' | 'completed' | 'error';

/**
 * 翻訳対応言語
 */
export type TargetLanguage = 'ja' | 'en';

/**
 * 翻訳設定
 */
export interface TranslationSettings {
  enabled: boolean;
  targetLanguage: TargetLanguage;
}

/**
 * 翻訳リクエスト
 */
export interface TranslateRequest {
  texts: Array<{ id: string; text: string }>;
  targetLanguage: string;
}

/**
 * 翻訳レスポンス
 */
export interface TranslateResponse {
  translations: Array<{ id: string; translatedText: string }>;
}
