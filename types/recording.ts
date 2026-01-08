import type { TranscriptSegment as RealtimeTranscriptSegment } from "./realtime-transcription";

export interface Highlight {
  id: string;
  timestamp: number;
  label?: string;
}

export interface TranscriptSegment {
  text: string;
  startTime: number;
  endTime: number;
  speaker?: string;
}

export interface Transcript {
  text: string;
  segments: TranscriptSegment[];
  language: string;
  processedAt: Date;
}

export interface Summary {
  overview: string;
  keyPoints: string[];
  actionItems: string[];
  processedAt: Date;
}

export interface QAReference {
  startTime: number;
  endTime: number;
  text: string;
}

export interface QAMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  references?: QAReference[];
}

export interface Recording {
  id: string;
  title: string;
  audioUri: string;
  duration: number;
  createdAt: Date;
  updatedAt: Date;
  highlights: Highlight[];
  notes: string;
  transcript?: Transcript;
  summary?: Summary;
  qaHistory: QAMessage[];
  status: 'recording' | 'saved' | 'transcribing' | 'transcribed' | 'summarizing' | 'summarized';
  /** リアルタイム文字起こし（録音中の一時データ） */
  realtimeTranscript?: {
    segments: RealtimeTranscriptSegment[];
    lastUpdated: Date;
  };
  /** 正規化済み波形データ (0-1) */
  waveformData?: number[];
}

export type RecordingStatus = Recording['status'];
