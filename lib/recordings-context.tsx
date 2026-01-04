import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recording, Highlight, Transcript, Summary, QAMessage } from '@/types/recording';

const STORAGE_KEY = 'plaud_recordings';

interface RecordingsState {
  recordings: Recording[];
  isLoading: boolean;
}

type RecordingsAction =
  | { type: 'SET_RECORDINGS'; payload: Recording[] }
  | { type: 'ADD_RECORDING'; payload: Recording }
  | { type: 'UPDATE_RECORDING'; payload: { id: string; updates: Partial<Recording> } }
  | { type: 'DELETE_RECORDING'; payload: string }
  | { type: 'ADD_HIGHLIGHT'; payload: { recordingId: string; highlight: Highlight } }
  | { type: 'SET_TRANSCRIPT'; payload: { recordingId: string; transcript: Transcript } }
  | { type: 'SET_SUMMARY'; payload: { recordingId: string; summary: Summary } }
  | { type: 'ADD_QA_MESSAGE'; payload: { recordingId: string; message: QAMessage } }
  | { type: 'SET_LOADING'; payload: boolean };

function recordingsReducer(state: RecordingsState, action: RecordingsAction): RecordingsState {
  switch (action.type) {
    case 'SET_RECORDINGS':
      return { ...state, recordings: action.payload, isLoading: false };
    case 'ADD_RECORDING':
      return { ...state, recordings: [action.payload, ...state.recordings] };
    case 'UPDATE_RECORDING':
      return {
        ...state,
        recordings: state.recordings.map((r) =>
          r.id === action.payload.id ? { ...r, ...action.payload.updates, updatedAt: new Date() } : r
        ),
      };
    case 'DELETE_RECORDING':
      return {
        ...state,
        recordings: state.recordings.filter((r) => r.id !== action.payload),
      };
    case 'ADD_HIGHLIGHT':
      return {
        ...state,
        recordings: state.recordings.map((r) =>
          r.id === action.payload.recordingId
            ? { ...r, highlights: [...r.highlights, action.payload.highlight], updatedAt: new Date() }
            : r
        ),
      };
    case 'SET_TRANSCRIPT':
      return {
        ...state,
        recordings: state.recordings.map((r) =>
          r.id === action.payload.recordingId
            ? { ...r, transcript: action.payload.transcript, status: 'transcribed', updatedAt: new Date() }
            : r
        ),
      };
    case 'SET_SUMMARY':
      return {
        ...state,
        recordings: state.recordings.map((r) =>
          r.id === action.payload.recordingId
            ? { ...r, summary: action.payload.summary, status: 'summarized', updatedAt: new Date() }
            : r
        ),
      };
    case 'ADD_QA_MESSAGE':
      return {
        ...state,
        recordings: state.recordings.map((r) =>
          r.id === action.payload.recordingId
            ? { ...r, qaHistory: [...r.qaHistory, action.payload.message], updatedAt: new Date() }
            : r
        ),
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

interface RecordingsContextValue {
  state: RecordingsState;
  addRecording: (recording: Recording) => Promise<void>;
  updateRecording: (id: string, updates: Partial<Recording>) => Promise<void>;
  deleteRecording: (id: string) => Promise<void>;
  addHighlight: (recordingId: string, highlight: Highlight) => Promise<void>;
  setTranscript: (recordingId: string, transcript: Transcript) => Promise<void>;
  setSummary: (recordingId: string, summary: Summary) => Promise<void>;
  addQAMessage: (recordingId: string, message: QAMessage) => Promise<void>;
  getRecording: (id: string) => Recording | undefined;
}

const RecordingsContext = createContext<RecordingsContextValue | null>(null);

export function RecordingsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(recordingsReducer, {
    recordings: [],
    isLoading: true,
  });

  // Load recordings from storage on mount
  useEffect(() => {
    loadRecordings();
  }, []);

  // Save recordings to storage whenever they change
  useEffect(() => {
    if (!state.isLoading) {
      saveRecordings(state.recordings);
    }
  }, [state.recordings, state.isLoading]);

  const loadRecordings = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        const recordings = parsed.map((r: Recording) => ({
          ...r,
          createdAt: new Date(r.createdAt),
          updatedAt: new Date(r.updatedAt),
          transcript: r.transcript
            ? { ...r.transcript, processedAt: new Date(r.transcript.processedAt) }
            : undefined,
          summary: r.summary
            ? { ...r.summary, processedAt: new Date(r.summary.processedAt) }
            : undefined,
          qaHistory: r.qaHistory.map((m: QAMessage) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          })),
        }));
        dispatch({ type: 'SET_RECORDINGS', payload: recordings });
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    } catch (error) {
      console.error('Failed to load recordings:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const saveRecordings = async (recordings: Recording[]) => {
    try {
      console.log('Saving recordings to AsyncStorage:', recordings.length, 'items');
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(recordings));
      console.log('Recordings saved successfully');
    } catch (error) {
      console.error('Failed to save recordings:', error);
    }
  };

  const addRecording = useCallback(async (recording: Recording) => {
    dispatch({ type: 'ADD_RECORDING', payload: recording });
  }, []);

  const updateRecording = useCallback(async (id: string, updates: Partial<Recording>) => {
    dispatch({ type: 'UPDATE_RECORDING', payload: { id, updates } });
  }, []);

  const deleteRecording = useCallback(async (id: string) => {
    dispatch({ type: 'DELETE_RECORDING', payload: id });
  }, []);

  const addHighlight = useCallback(async (recordingId: string, highlight: Highlight) => {
    dispatch({ type: 'ADD_HIGHLIGHT', payload: { recordingId, highlight } });
  }, []);

  const setTranscript = useCallback(async (recordingId: string, transcript: Transcript) => {
    dispatch({ type: 'SET_TRANSCRIPT', payload: { recordingId, transcript } });
  }, []);

  const setSummary = useCallback(async (recordingId: string, summary: Summary) => {
    dispatch({ type: 'SET_SUMMARY', payload: { recordingId, summary } });
  }, []);

  const addQAMessage = useCallback(async (recordingId: string, message: QAMessage) => {
    dispatch({ type: 'ADD_QA_MESSAGE', payload: { recordingId, message } });
  }, []);

  const getRecording = useCallback(
    (id: string) => state.recordings.find((r) => r.id === id),
    [state.recordings]
  );

  return (
    <RecordingsContext.Provider
      value={{
        state,
        addRecording,
        updateRecording,
        deleteRecording,
        addHighlight,
        setTranscript,
        setSummary,
        addQAMessage,
        getRecording,
      }}
    >
      {children}
    </RecordingsContext.Provider>
  );
}

export function useRecordings() {
  const context = useContext(RecordingsContext);
  if (!context) {
    throw new Error('useRecordings must be used within a RecordingsProvider');
  }
  return context;
}
