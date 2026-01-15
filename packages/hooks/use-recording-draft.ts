/**
 * 録音ドラフトの自動保存・復元フック
 * アプリクラッシュ時の録音データ保護用
 */

import { useCallback, useRef } from 'react';
import { Storage } from '@/packages/platform';
import type { RecordingDraft, Highlight } from '@/packages/types/recording';
import type { TranscriptSegment } from '@/packages/types/realtime-transcription';

const DRAFT_STORAGE_KEY = 'pleno_live_recording_draft';
const AUTO_SAVE_INTERVAL_MS = 10000; // 10秒ごとに自動保存

interface DraftSaveParams {
  id: string;
  duration: number;
  highlights: Highlight[];
  realtimeEnabled: boolean;
  realtimeSegments?: TranscriptSegment[];
  meteringHistory: number[];
}

export function useRecordingDraft() {
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSaveRef = useRef<DraftSaveParams | null>(null);

  /**
   * ドラフトを保存
   */
  const saveDraft = useCallback(async (params: DraftSaveParams): Promise<void> => {
    try {
      const draft: RecordingDraft = {
        id: params.id,
        startedAt: new Date(),
        lastSavedAt: new Date(),
        duration: params.duration,
        highlights: params.highlights,
        realtimeEnabled: params.realtimeEnabled,
        realtimeSegments: params.realtimeSegments,
        meteringHistory: params.meteringHistory.slice(-1000), // 最新1000件のみ保存
      };
      await Storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      console.log('[RecordingDraft] Saved draft:', { id: params.id, duration: params.duration });
    } catch (error) {
      console.error('[RecordingDraft] Failed to save draft:', error);
    }
  }, []);

  /**
   * ドラフトを読み込み
   */
  const loadDraft = useCallback(async (): Promise<RecordingDraft | null> => {
    try {
      const saved = await Storage.getItem(DRAFT_STORAGE_KEY);
      if (!saved) return null;

      const draft = JSON.parse(saved) as RecordingDraft;
      // 日付の復元
      draft.startedAt = new Date(draft.startedAt);
      draft.lastSavedAt = new Date(draft.lastSavedAt);

      console.log('[RecordingDraft] Loaded draft:', { id: draft.id, duration: draft.duration });
      return draft;
    } catch (error) {
      console.error('[RecordingDraft] Failed to load draft:', error);
      return null;
    }
  }, []);

  /**
   * ドラフトを削除
   */
  const clearDraft = useCallback(async (): Promise<void> => {
    try {
      await Storage.removeItem(DRAFT_STORAGE_KEY);
      console.log('[RecordingDraft] Cleared draft');
    } catch (error) {
      console.error('[RecordingDraft] Failed to clear draft:', error);
    }
  }, []);

  /**
   * 自動保存を開始
   */
  const startAutoSave = useCallback((getParams: () => DraftSaveParams) => {
    // 既存のタイマーをクリア
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
    }

    // 即座に初回保存
    const params = getParams();
    saveDraft(params);
    lastSaveRef.current = params;

    // 定期的な自動保存を設定
    autoSaveTimerRef.current = setInterval(async () => {
      const currentParams = getParams();

      // 変更がある場合のみ保存
      const lastSave = lastSaveRef.current;
      if (lastSave &&
          lastSave.duration === currentParams.duration &&
          lastSave.highlights.length === currentParams.highlights.length) {
        return;
      }

      await saveDraft(currentParams);
      lastSaveRef.current = currentParams;
    }, AUTO_SAVE_INTERVAL_MS);

    console.log('[RecordingDraft] Auto-save started');
  }, [saveDraft]);

  /**
   * 自動保存を停止
   */
  const stopAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    lastSaveRef.current = null;
    console.log('[RecordingDraft] Auto-save stopped');
  }, []);

  /**
   * ドラフトが存在するかチェック
   */
  const hasDraft = useCallback(async (): Promise<boolean> => {
    const draft = await loadDraft();
    return draft !== null;
  }, [loadDraft]);

  return {
    saveDraft,
    loadDraft,
    clearDraft,
    startAutoSave,
    stopAutoSave,
    hasDraft,
  };
}
