import type { HintMode, VocabularyEntry } from "../types";

export const LEARNING_ATTEMPT_MESSAGE = "typing-game:learning:v1:attempt";
export const REVIEW_DATASET_MESSAGE = "typing-game:learning:v1:review-dataset";
export const REVIEW_READY_MESSAGE = "typing-game:learning:v1:review-ready";
export const REVIEW_ERROR_MESSAGE = "typing-game:learning:v1:review-error";
export const PARENT_ORIGIN = "https://typing-game.local";

export type RecallReviewGoal =
  | "remember-words"
  | "spelling"
  | "listening"
  | "mixed";

export type RecallReviewDataset = {
  version: 1;
  type: typeof REVIEW_DATASET_MESSAGE;
  requestId: string;
  goal: RecallReviewGoal;
  entityIds: string[];
};

export type RecallLearningEvent = {
  version: 1;
  entityType: "vocabulary";
  entityId: string;
  gameId: "recall-typing";
  activityType: "typing" | "recall" | "listen";
  result: "correct" | "wrong";
  occurredAt: string;
  responseMs: number;
  hintUsed: false;
  replayUsed: boolean;
  expectedAnswer: string;
  errorType?: "spelling";
};

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,100}$/;
const GOALS = new Set<RecallReviewGoal>([
  "remember-words",
  "spelling",
  "listening",
  "mixed",
]);

function plainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeEntityId(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

export function parseRecallReviewDataset(
  value: unknown,
): RecallReviewDataset | null {
  if (!plainObject(value) || value["type"] !== REVIEW_DATASET_MESSAGE) {
    return null;
  }
  if (value["version"] !== 1) {
    throw new TypeError("review dataset version is invalid");
  }

  const requestId = value["requestId"];
  if (
    typeof requestId !== "string" ||
    !REQUEST_ID_PATTERN.test(requestId)
  ) {
    throw new TypeError("review requestId is invalid");
  }

  const goal = value["goal"];
  if (typeof goal !== "string" || !GOALS.has(goal as RecallReviewGoal)) {
    throw new TypeError("Recall Typing review goal is invalid");
  }

  const items = value["items"];
  if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
    throw new TypeError("review items must contain 1 to 100 items");
  }

  const entityIds: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (!plainObject(item) || item["entityType"] !== "vocabulary") {
      throw new TypeError("Recall Typing review accepts vocabulary only");
    }
    const entityId = item["entityId"];
    if (typeof entityId !== "string") {
      throw new TypeError("review entityId is invalid");
    }
    const normalized = normalizeEntityId(entityId);
    if (normalized === "" || normalized.length > 200) {
      throw new TypeError("review entityId is invalid");
    }
    if (!seen.has(normalized)) {
      seen.add(normalized);
      entityIds.push(normalized);
    }
  }

  if (entityIds.length === 0) {
    throw new TypeError("review dataset is empty");
  }

  return {
    version: 1,
    type: REVIEW_DATASET_MESSAGE,
    requestId,
    goal: goal as RecallReviewGoal,
    entityIds,
  };
}

export function reviewHintMode(
  goal: RecallReviewGoal,
  current: HintMode,
): HintMode {
  return goal === "listening" ? "audio" : current;
}

export function buildRecallLearningEvent(options: {
  entry: VocabularyEntry;
  wrongAttempts: number;
  responseMs: number;
  replayUsed: boolean;
  hintMode: HintMode;
  reviewGoal?: RecallReviewGoal;
  occurredAt?: string;
}): RecallLearningEvent {
  const wrong = options.wrongAttempts > 0;
  const listening =
    options.reviewGoal === "listening" || options.hintMode === "audio";
  const activityType =
    options.reviewGoal === "spelling"
      ? "typing"
      : listening
        ? "listen"
        : "recall";

  return {
    version: 1,
    entityType: "vocabulary",
    entityId: normalizeEntityId(options.entry.en),
    gameId: "recall-typing",
    activityType,
    result: wrong ? "wrong" : "correct",
    occurredAt: options.occurredAt ?? new Date().toISOString(),
    responseMs: Math.max(0, Math.round(options.responseMs)),
    hintUsed: false,
    replayUsed: options.replayUsed,
    expectedAnswer: options.entry.en,
    ...(wrong ? { errorType: "spelling" as const } : {}),
  };
}
