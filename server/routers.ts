import { z } from "zod";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM, type Message } from "./_core/llm";
import {
  transcribeAudio,
  transcribeAudioFromUrl,
  formatTranscriptionWithSpeakers,
  type TranscriptionOptions
} from "./elevenlabs";
import { transcribeAudioWithGemini } from "./gemini";
import { generateRealtimeToken } from "./elevenlabs-realtime";

export const appRouter = router({
  system: systemRouter,

  ai: router({
    // Transcription endpoint supporting both ElevenLabs and Gemini
    transcribe: publicProcedure
      .input(z.object({
        audioUrl: z.string().optional(),
        audioBase64: z.string().optional(),
        filename: z.string().default("recording.m4a"),
        languageCode: z.string().optional(),
        diarize: z.boolean().default(true),
        numSpeakers: z.number().min(1).max(32).optional(),
        provider: z.enum(["elevenlabs", "gemini"]).default("elevenlabs"),
      }))
      .mutation(async ({ input }) => {
        console.log("[TRPC] transcribe mutation called");
        console.log("[TRPC] provider:", input.provider);
        console.log("[TRPC] filename:", input.filename);
        console.log("[TRPC] audioBase64 length:", input.audioBase64?.length || 0);
        console.log("[TRPC] audioUrl:", input.audioUrl || "none");

        try {
          // Gemini provider
          if (input.provider === "gemini") {
            if (!input.audioBase64) {
              throw new Error("Gemini文字起こしにはaudioBase64が必要です");
            }

            const mimeType = input.filename.endsWith(".webm")
              ? "audio/webm"
              : input.filename.endsWith(".m4a")
              ? "audio/mp4"
              : "audio/mpeg";

            const result = await transcribeAudioWithGemini(input.audioBase64, {
              languageCode: input.languageCode,
              mimeType,
            });

            return {
              text: result.text,
              rawText: result.text,
              languageCode: result.languageCode,
              provider: "gemini",
            };
          }

          // ElevenLabs provider (default)
          const options: TranscriptionOptions = {
            languageCode: input.languageCode,
            diarize: input.diarize,
            numSpeakers: input.numSpeakers,
            tagAudioEvents: true,
          };

          let result;

          // If base64 audio is provided, use it directly
          if (input.audioBase64) {
            const audioBuffer = Buffer.from(input.audioBase64, "base64");
            result = await transcribeAudio(audioBuffer, input.filename, options);
          }
          // If URL is provided and it's a valid HTTPS URL, use cloud_storage_url
          else if (input.audioUrl && input.audioUrl.startsWith("https://")) {
            result = await transcribeAudioFromUrl(input.audioUrl, options);
          }
          // Local file:// URIs cannot be processed
          else if (input.audioUrl && (input.audioUrl.startsWith("file://") || !input.audioUrl.startsWith("http"))) {
            return {
              text: "【ElevenLabs文字起こし】\n\nローカルファイルを文字起こしするには、音声データをBase64形式で送信してください。\n\n録音ファイル: " + (input.audioUrl?.split("/").pop() || "unknown"),
              isPlaceholder: true,
              words: [],
              languageCode: "",
              provider: "elevenlabs",
            };
          }
          else {
            throw new Error("audioBase64 または有効なHTTPS URLが必要です");
          }

          // Format transcription with speaker labels if diarization was enabled
          const formattedText = input.diarize
            ? formatTranscriptionWithSpeakers(result)
            : result.text;

          return {
            text: formattedText,
            rawText: result.text,
            words: result.words,
            languageCode: result.language_code,
            languageProbability: result.language_probability,
            provider: "elevenlabs",
          };
        } catch (error) {
          console.error("Transcription error:", error);
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          throw new Error(`文字起こしに失敗しました: ${errorMessage}`);
        }
      }),

    // Chat/Summary endpoint
    chat: publicProcedure
      .input(z.object({
        message: z.string(),
        context: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          const messages: Message[] = [
            {
              role: "system",
              content: "あなたは会議や録音の内容を分析する専門家です。ユーザーの質問に対して、提供されたコンテキストに基づいて正確に回答してください。",
            },
          ];

          if (input.context) {
            messages.push({
              role: "user",
              content: `コンテキスト:\n${input.context}`,
            });
          }

          messages.push({
            role: "user",
            content: input.message,
          });

          const result = await invokeLLM({
            messages,
            maxTokens: 2000,
          });

          const content = result.choices[0]?.message?.content;
          const text = typeof content === "string" ? content : "";

          return { message: text };
        } catch (error) {
          console.error("Chat error:", error);
          throw new Error("AIの応答に失敗しました");
        }
      }),

    // Summary endpoint
    summarize: publicProcedure
      .input(z.object({
        text: z.string(),
        template: z.enum(["general", "meeting", "interview", "lecture"]).default("general"),
      }))
      .mutation(async ({ input }) => {
        const templatePrompts = {
          general: "以下のテキストを要約してください。概要、重要なポイント3つ、アクションアイテム（あれば）を含めてください。",
          meeting: "以下の会議の文字起こしを要約してください。議題、決定事項、アクションアイテム、次のステップを含めてください。",
          interview: "以下のインタビューの文字起こしを要約してください。主要なトピック、重要な発言、結論を含めてください。",
          lecture: "以下の講義の文字起こしを要約してください。主要なトピック、重要な概念、学習ポイントを含めてください。",
        };

        try {
          const result = await invokeLLM({
            messages: [
              {
                role: "system",
                content: "あなたは文書要約の専門家です。提供されたテキストを構造化された形式で要約してください。",
              },
              {
                role: "user",
                content: `${templatePrompts[input.template]}\n\nテキスト:\n${input.text}`,
              },
            ],
            maxTokens: 1500,
          });

          const content = result.choices[0]?.message?.content;
          const summaryText = typeof content === "string" ? content : "";

          // Parse the summary into structured format
          const lines = summaryText.split("\n").filter(l => l.trim());
          const overview = lines[0] || "";
          const keyPoints = lines.slice(1, 4).map(l => l.replace(/^[-•*]\s*/, ""));
          const actionItems = lines.slice(4, 7).map(l => l.replace(/^[-•*]\s*/, ""));

          return {
            overview,
            keyPoints,
            actionItems,
            rawText: summaryText,
          };
        } catch (error) {
          console.error("Summary error:", error);
          throw new Error("要約の生成に失敗しました");
        }
      }),

    // Q&A endpoint
    askQuestion: publicProcedure
      .input(z.object({
        question: z.string(),
        transcriptText: z.string(),
        previousQA: z.array(z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string(),
        })).optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          const messages: Message[] = [
            {
              role: "system",
              content: `あなたは録音内容に関する質問に答えるアシスタントです。以下の文字起こしテキストに基づいて、ユーザーの質問に正確に答えてください。回答は文字起こしの内容に基づいている必要があります。

文字起こしテキスト:
${input.transcriptText}`,
            },
          ];

          // Add previous Q&A context
          if (input.previousQA) {
            for (const qa of input.previousQA) {
              messages.push({
                role: qa.role,
                content: qa.content,
              });
            }
          }

          messages.push({
            role: "user",
            content: input.question,
          });

          const result = await invokeLLM({
            messages,
            maxTokens: 1000,
          });

          const content = result.choices[0]?.message?.content;
          const answer = typeof content === "string" ? content : "";

          return { answer };
        } catch (error) {
          console.error("Q&A error:", error);
          throw new Error("質問への回答に失敗しました");
        }
      }),

    // Generate realtime transcription token
    generateRealtimeToken: publicProcedure
      .mutation(async () => {
        try {
          console.log("[TRPC] Generating realtime token");
          const token = await generateRealtimeToken();
          return { token };
        } catch (error) {
          console.error("[TRPC] Failed to generate realtime token:", error);
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          throw new Error(`トークンの生成に失敗しました: ${errorMessage}`);
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
