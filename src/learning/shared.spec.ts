import { describe, expect, it } from "vitest";

import {
  buildRecallLearningEvent,
  parseRecallReviewDataset,
  reviewHintMode,
} from "./shared";

describe("Recall shared learning contract", () => {
  it("parses and deduplicates parent vocabulary review datasets", () => {
    expect(
      parseRecallReviewDataset({
        version: 1,
        type: "typing-game:learning:v1:review-dataset",
        requestId: "review-1",
        goal: "listening",
        items: [
          { entityType: "vocabulary", entityId: " Airport " },
          { entityType: "vocabulary", entityId: "AIRPORT" },
          { entityType: "vocabulary", entityId: "passport" },
        ],
      }),
    ).toEqual({
      version: 1,
      type: "typing-game:learning:v1:review-dataset",
      requestId: "review-1",
      goal: "listening",
      entityIds: ["airport", "passport"],
    });
  });

  it("rejects grammar/sentence items instead of silently dropping them", () => {
    expect(() =>
      parseRecallReviewDataset({
        version: 1,
        type: "typing-game:learning:v1:review-dataset",
        requestId: "review-2",
        goal: "mixed",
        items: [{ entityType: "grammar", entityId: "time.past" }],
      }),
    ).toThrow("vocabulary only");
  });

  it("uses audio-only prompt for explicit listening review", () => {
    expect(reviewHintMode("listening", "full")).toBe("audio");
    expect(reviewHintMode("remember-words", "meaning")).toBe("meaning");
  });

  it("emits one word-level event with wrong spelling state and replay use", () => {
    expect(
      buildRecallLearningEvent({
        entry: {
          id: "airport",
          en: "Airport",
          vi: "sân bay",
          ipa: "/ˈerˌpɔrt/",
        },
        wrongAttempts: 2,
        responseMs: 812.6,
        replayUsed: true,
        hintMode: "full",
        reviewGoal: "remember-words",
        occurredAt: "2026-09-24T14:00:00.000Z",
      }),
    ).toEqual({
      version: 1,
      entityType: "vocabulary",
      entityId: "airport",
      gameId: "recall-typing",
      activityType: "recall",
      result: "wrong",
      occurredAt: "2026-09-24T14:00:00.000Z",
      responseMs: 813,
      hintUsed: false,
      replayUsed: true,
      expectedAnswer: "Airport",
      errorType: "spelling",
    });
  });

  it("classifies audio-only normal runs as listening without requiring review mode", () => {
    expect(
      buildRecallLearningEvent({
        entry: { id: "word", en: "word", vi: "từ", ipa: "/wɝːd/" },
        wrongAttempts: 0,
        responseMs: 100,
        replayUsed: false,
        hintMode: "audio",
      }),
    ).toMatchObject({
      activityType: "listen",
      result: "correct",
      replayUsed: false,
    });
  });
});
