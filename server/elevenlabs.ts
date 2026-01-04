/**
 * ElevenLabs API Client
 * Speech to Text (Scribe) API integration
 */

const ELEVENLABS_API_BASE = "https://api.elevenlabs.io/v1";

interface TranscriptionWord {
  text: string;
  start: number;
  end: number;
  type: "word" | "spacing" | "audio_event";
  speaker_id?: string;
}

interface TranscriptionResponse {
  language_code: string;
  language_probability: number;
  text: string;
  words: TranscriptionWord[];
}

interface TranscriptionOptions {
  languageCode?: string;
  diarize?: boolean;
  numSpeakers?: number;
  tagAudioEvents?: boolean;
}

/**
 * Get the ElevenLabs API key from environment
 */
function getApiKey(): string {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is not set");
  }
  return apiKey;
}

/**
 * Transcribe audio using ElevenLabs Speech to Text API
 * @param audioBuffer - The audio file as a Buffer
 * @param filename - The original filename
 * @param options - Transcription options
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResponse> {
  console.log("[ElevenLabs] transcribeAudio called with filename:", filename, "buffer size:", audioBuffer.length);
  const apiKey = getApiKey();
  console.log("[ElevenLabs] API key:", apiKey ? `${apiKey.substring(0, 10)}...` : "NOT SET");

  const formData = new FormData();

  // Create a Blob from the buffer
  const uint8Array = new Uint8Array(audioBuffer);
  const blob = new Blob([uint8Array], { type: getMimeType(filename) });
  formData.append("file", blob, filename);
  formData.append("model_id", "scribe_v1");
  
  if (options.languageCode) {
    formData.append("language_code", options.languageCode);
  }
  
  if (options.diarize !== undefined) {
    formData.append("diarize", String(options.diarize));
  }
  
  if (options.numSpeakers !== undefined) {
    formData.append("num_speakers", String(options.numSpeakers));
  }
  
  if (options.tagAudioEvents !== undefined) {
    formData.append("tag_audio_events", String(options.tagAudioEvents));
  }
  
  formData.append("timestamps_granularity", "word");

  const response = await fetch(`${ELEVENLABS_API_BASE}/speech-to-text`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`ElevenLabs API Error: ${response.status}`, errorText);
    throw new Error(`ElevenLabs transcription failed: ${response.status} ${response.statusText}`);
  }

  const result = await response.json() as TranscriptionResponse;
  return result;
}

/**
 * Transcribe audio from a URL using ElevenLabs Speech to Text API
 * @param audioUrl - The URL of the audio file
 * @param options - Transcription options
 */
export async function transcribeAudioFromUrl(
  audioUrl: string,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResponse> {
  const apiKey = getApiKey();

  const formData = new FormData();
  formData.append("model_id", "scribe_v1");
  formData.append("cloud_storage_url", audioUrl);
  
  if (options.languageCode) {
    formData.append("language_code", options.languageCode);
  }
  
  if (options.diarize !== undefined) {
    formData.append("diarize", String(options.diarize));
  }
  
  if (options.numSpeakers !== undefined) {
    formData.append("num_speakers", String(options.numSpeakers));
  }
  
  if (options.tagAudioEvents !== undefined) {
    formData.append("tag_audio_events", String(options.tagAudioEvents));
  }
  
  formData.append("timestamps_granularity", "word");

  const response = await fetch(`${ELEVENLABS_API_BASE}/speech-to-text`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`ElevenLabs API Error: ${response.status}`, errorText);
    throw new Error(`ElevenLabs transcription failed: ${response.status} ${response.statusText}`);
  }

  const result = await response.json() as TranscriptionResponse;
  return result;
}

/**
 * Get MIME type from filename
 */
function getMimeType(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop();
  const mimeTypes: Record<string, string> = {
    mp3: "audio/mpeg",
    wav: "audio/wav",
    m4a: "audio/mp4",
    aac: "audio/aac",
    ogg: "audio/ogg",
    webm: "audio/webm",
    flac: "audio/flac",
    mp4: "video/mp4",
    mov: "video/quicktime",
  };
  return mimeTypes[ext || ""] || "audio/mpeg";
}

/**
 * Format transcription with speaker labels
 */
export function formatTranscriptionWithSpeakers(response: TranscriptionResponse): string {
  if (!response.words || response.words.length === 0) {
    return response.text;
  }

  const segments: { speaker: string; text: string }[] = [];
  let currentSpeaker = "";
  let currentText = "";

  for (const word of response.words) {
    if (word.type === "word" || word.type === "spacing") {
      const speaker = word.speaker_id || "Unknown";
      
      if (speaker !== currentSpeaker && currentText.trim()) {
        segments.push({ speaker: currentSpeaker, text: currentText.trim() });
        currentText = "";
      }
      
      currentSpeaker = speaker;
      currentText += word.text;
    } else if (word.type === "audio_event") {
      currentText += ` [${word.text}] `;
    }
  }

  if (currentText.trim()) {
    segments.push({ speaker: currentSpeaker, text: currentText.trim() });
  }

  // Format output
  return segments
    .map((seg) => `[${seg.speaker}]: ${seg.text}`)
    .join("\n\n");
}

export type { TranscriptionResponse, TranscriptionWord, TranscriptionOptions };
