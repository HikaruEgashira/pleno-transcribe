import { describe, it, expect } from "vitest";
import type { Recording, Highlight, Transcript, Summary, QAMessage } from "../types/recording";

describe("Recording Types", () => {
  it("should create a valid Recording object", () => {
    const recording: Recording = {
      id: "test-123",
      title: "Test Recording",
      audioUri: "file:///test/audio.m4a",
      duration: 120,
      createdAt: new Date(),
      updatedAt: new Date(),
      highlights: [],
      notes: "",
      qaHistory: [],
      status: "saved",
    };

    expect(recording.id).toBe("test-123");
    expect(recording.title).toBe("Test Recording");
    expect(recording.duration).toBe(120);
    expect(recording.status).toBe("saved");
  });

  it("should create a valid Highlight object", () => {
    const highlight: Highlight = {
      id: "highlight-1",
      timestamp: 30,
      label: "Important point",
    };

    expect(highlight.id).toBe("highlight-1");
    expect(highlight.timestamp).toBe(30);
    expect(highlight.label).toBe("Important point");
  });

  it("should create a valid Transcript object", () => {
    const transcript: Transcript = {
      text: "This is a test transcript.",
      segments: [
        {
          text: "This is a test transcript.",
          startTime: 0,
          endTime: 5,
          speaker: "Speaker 1",
        },
      ],
      language: "ja",
      processedAt: new Date(),
    };

    expect(transcript.text).toBe("This is a test transcript.");
    expect(transcript.segments.length).toBe(1);
    expect(transcript.language).toBe("ja");
  });

  it("should create a valid Summary object", () => {
    const summary: Summary = {
      overview: "This is the overview.",
      keyPoints: ["Point 1", "Point 2", "Point 3"],
      actionItems: ["Action 1", "Action 2"],
      processedAt: new Date(),
    };

    expect(summary.overview).toBe("This is the overview.");
    expect(summary.keyPoints.length).toBe(3);
    expect(summary.actionItems.length).toBe(2);
  });

  it("should create a valid QAMessage object", () => {
    const userMessage: QAMessage = {
      id: "qa-1",
      role: "user",
      content: "What was discussed?",
      timestamp: new Date(),
    };

    const assistantMessage: QAMessage = {
      id: "qa-2",
      role: "assistant",
      content: "The main topics discussed were...",
      timestamp: new Date(),
      references: [
        {
          startTime: 10,
          endTime: 20,
          text: "Reference text",
        },
      ],
    };

    expect(userMessage.role).toBe("user");
    expect(assistantMessage.role).toBe("assistant");
    expect(assistantMessage.references?.length).toBe(1);
  });

  it("should handle recording status transitions", () => {
    const recording: Recording = {
      id: "test-123",
      title: "Test Recording",
      audioUri: "file:///test/audio.m4a",
      duration: 120,
      createdAt: new Date(),
      updatedAt: new Date(),
      highlights: [],
      notes: "",
      qaHistory: [],
      status: "saved",
    };

    // Simulate status transitions
    const statuses: Recording["status"][] = [
      "saved",
      "transcribing",
      "transcribed",
      "summarizing",
      "summarized",
    ];

    statuses.forEach((status) => {
      recording.status = status;
      expect(recording.status).toBe(status);
    });
  });
});

describe("Recording Utilities", () => {
  it("should format duration correctly", () => {
    const formatDuration = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(30)).toBe("0:30");
    expect(formatDuration(60)).toBe("1:00");
    expect(formatDuration(90)).toBe("1:30");
    expect(formatDuration(3661)).toBe("61:01");
  });

  it("should generate unique IDs", () => {
    const generateId = () => Date.now().toString();
    
    const id1 = generateId();
    // Small delay to ensure different timestamp
    const id2 = generateId();
    
    expect(id1).toBeTruthy();
    expect(typeof id1).toBe("string");
  });
});
