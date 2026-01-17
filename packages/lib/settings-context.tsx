import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react';
import { Storage } from '@/packages/platform';
import type { WhisperModelSize } from '@/packages/lib/whisper/whisper-types';

const SETTINGS_KEY = 'app-settings';

export type Language = 'ja' | 'en' | 'auto';
export type TranscriptionProvider = 'elevenlabs' | 'gemini' | 'whisper-local';
export type { WhisperModelSize };

export interface SettingsState {
  language: Language;
  colorScheme: 'light' | 'dark';
  summaryTemplate: string;
  autoTranscribe: boolean;
  autoSummarize: boolean;
  autoSentiment: boolean;
  autoKeywords: boolean;
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
  whisperSettings: {
    modelSize: WhisperModelSize;
    useWebGPU: boolean;
  };
  extendedStatistics: boolean;
}

const defaultSettings: SettingsState = {
  language: 'auto',
  colorScheme: 'light',
  summaryTemplate: '',
  autoTranscribe: false,
  autoSummarize: false,
  autoSentiment: false,
  autoKeywords: false,
  transcriptionProvider: 'gemini',
  realtimeTranscription: {
    enabled: false,
    language: 'ja',
    enableSpeakerDiarization: false,
  },
  realtimeTranslation: {
    enabled: false,
    targetLanguage: 'en',
  },
  whisperSettings: {
    modelSize: 'distil-small',
    useWebGPU: true,
  },
  extendedStatistics: false,
};

interface SettingsContextValue {
  settings: SettingsState;
  updateSettings: (updates: Partial<SettingsState>) => void;
  updateNestedSettings: <K extends keyof SettingsState>(
    key: K,
    updates: Partial<SettingsState[K]>
  ) => void;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from storage on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const saved = await Storage.getItem(SETTINGS_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setSettings(prev => ({
            ...prev,
            ...parsed,
            realtimeTranscription: {
              ...prev.realtimeTranscription,
              ...(parsed.realtimeTranscription || {}),
            },
            realtimeTranslation: {
              ...prev.realtimeTranslation,
              ...(parsed.realtimeTranslation || {}),
            },
            whisperSettings: {
              ...prev.whisperSettings,
              ...(parsed.whisperSettings || {}),
            },
          }));
        }
      } catch (error) {
        console.error('[SettingsContext] Failed to load settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  // Save settings to storage when changed
  useEffect(() => {
    if (isLoading) return;

    const saveSettings = async () => {
      try {
        await Storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      } catch (error) {
        console.error('[SettingsContext] Failed to save settings:', error);
      }
    };
    saveSettings();
  }, [settings, isLoading]);

  const updateSettings = useCallback((updates: Partial<SettingsState>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const updateNestedSettings = useCallback(<K extends keyof SettingsState>(
    key: K,
    updates: Partial<SettingsState[K]>
  ) => {
    setSettings(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] as object),
        ...updates,
      },
    }));
  }, []);

  const value = useMemo(() => ({
    settings,
    updateSettings,
    updateNestedSettings,
    isLoading,
  }), [settings, updateSettings, updateNestedSettings, isLoading]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}

// Safe hook that returns default values when used outside provider
export function useSettingsSafe(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    return {
      settings: defaultSettings,
      updateSettings: () => {},
      updateNestedSettings: () => {},
      isLoading: false,
    };
  }
  return context;
}
