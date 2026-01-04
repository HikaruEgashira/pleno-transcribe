import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM, type Message } from "./_core/llm";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  ai: router({
    // Transcription endpoint (uses LLM with audio file)
    transcribe: publicProcedure
      .input(z.object({
        audioUrl: z.string(),
      }))
      .mutation(async ({ input }) => {
        try {
          const result = await invokeLLM({
            messages: [
              {
                role: "system",
                content: "あなたは音声文字起こしの専門家です。提供された音声を正確に文字起こししてください。話者が複数いる場合は、話者を区別してください。",
              },
              {
                role: "user",
                content: [
                  {
                    type: "file_url",
                    file_url: {
                      url: input.audioUrl,
                      mime_type: "audio/mpeg",
                    },
                  },
                  {
                    type: "text",
                    text: "この音声を文字起こししてください。",
                  },
                ],
              },
            ],
            maxTokens: 4000,
          });

          const content = result.choices[0]?.message?.content;
          const text = typeof content === "string" ? content : "";

          return { text };
        } catch (error) {
          console.error("Transcription error:", error);
          throw new Error("文字起こしに失敗しました");
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
  }),
});

export type AppRouter = typeof appRouter;
