import type { HintMode, VocabularyEntry } from "../types";

export const LEARNING_ATTEMPT_MESSAGE = "typing-game:learning:v1:attempt";
export const REVIEW_DATASET_MESSAGE = "typing-game:learning:v1:review-dataset";
export const REVIEW_READY_MESSAGE = "typing-game:learning:v1:review-ready";
export const REVIEW_ERROR_MESSAGE = "typing-game:learning:v1:review-error";
export const ENGLISH_ACTIVITY_DATASET_MESSAGE =
  "typing-game:english-content:v1:activity-dataset";
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

export type RecallEnglishActivity =
  | "vocabulary"
  | "collocation"
  | "phrasal-verb"
  | "chunk"
  | "listening-typing"
  | "contextual-usage";

export type RecallEnglishActivityDataset = {
  version: 1;
  type: typeof ENGLISH_ACTIVITY_DATASET_MESSAGE;
  requestId: string;
  gameId: "recall-typing";
  activity: RecallEnglishActivity;
  items: Array<{
    contentId: string;
    entityType: "vocabulary" | "sentence";
    entityId: string;
    promptText: string;
    answerText: string;
    meaningVi?: string;
    ipa?: string;
    audioText?: string;
  }>;
};

export type RecallLearningEvent = {
  version: 1;
  entityType: "vocabulary" | "sentence";
  entityId: string;
  gameId: "recall-typing";
  activityType: string;
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
const ENGLISH_ACTIVITIES = new Set<RecallEnglishActivity>([
  "vocabulary",
  "collocation",
  "phrasal-verb",
  "chunk",
  "listening-typing",
  "contextual-usage",
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

export function parseRecallEnglishActivityDataset(
  value: unknown,
): RecallEnglishActivityDataset | null {
  if (!plainObject(value) || value["type"] !== ENGLISH_ACTIVITY_DATASET_MESSAGE) {
    return null;
  }
  if (value["version"] !== 1 || value["gameId"] !== "recall-typing") {
    throw new TypeError("Recall English activity dataset identity is invalid");
  }
  const requestId = value["requestId"];
  if (typeof requestId !== "string" || !REQUEST_ID_PATTERN.test(requestId)) {
    throw new TypeError("Recall English activity requestId is invalid");
  }
  const activity = value["activity"];
  if (
    typeof activity !== "string" ||
    !ENGLISH_ACTIVITIES.has(activity as RecallEnglishActivity)
  ) {
    throw new TypeError("Recall English activity is invalid");
  }
  const items = value["items"];
  if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
    throw new TypeError("Recall English activity items must contain 1 to 100 items");
  }
  const parsed: RecallEnglishActivityDataset["items"] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (!plainObject(item)) throw new TypeError("Recall English activity item is invalid");
    const contentId = item["contentId"];
    const entityType = item["entityType"];
    const entityId = item["entityId"];
    const promptText = item["promptText"];
    const answerText = item["answerText"];
    if (
      typeof contentId !== "string" ||
      (entityType !== "vocabulary" && entityType !== "sentence") ||
      typeof entityId !== "string" ||
      typeof promptText !== "string" ||
      typeof answerText !== "string"
    ) {
      throw new TypeError("Recall English activity item fields are invalid");
    }
    const cleanContentId = contentId.normalize("NFC").trim();
    const cleanEntityId = entityId.normalize("NFC").trim();
    const cleanPrompt = promptText.normalize("NFC").trim().replace(/\s+/g, " ");
    const cleanAnswer = answerText.normalize("NFC").trim().replace(/\s+/g, " ");
    if (
      cleanContentId === "" ||
      cleanEntityId === "" ||
      cleanPrompt === "" ||
      cleanAnswer === "" ||
      cleanAnswer.length > 200
    ) {
      throw new TypeError("Recall English activity item text is invalid");
    }
    if (seen.has(cleanContentId)) {
      throw new TypeError("Recall English activity contentId is duplicated");
    }
    seen.add(cleanContentId);
    parsed.push({
      contentId: cleanContentId,
      entityType,
      entityId: cleanEntityId,
      promptText: cleanPrompt,
      answerText: cleanAnswer,
      ...(typeof item["meaningVi"] === "string" && item["meaningVi"].trim() !== ""
        ? { meaningVi: item["meaningVi"].normalize("NFC").trim() }
        : {}),
      ...(typeof item["ipa"] === "string" && item["ipa"].trim() !== ""
        ? { ipa: item["ipa"].normalize("NFC").trim() }
        : {}),
      ...(typeof item["audioText"] === "string" && item["audioText"].trim() !== ""
        ? { audioText: item["audioText"].normalize("NFC").trim() }
        : {}),
    });
  }
  return {
    version: 1,
    type: ENGLISH_ACTIVITY_DATASET_MESSAGE,
    requestId,
    gameId: "recall-typing",
    activity: activity as RecallEnglishActivity,
    items: parsed,
  };
}

export function recallEnglishActivityEntries(
  dataset: RecallEnglishActivityDataset,
): VocabularyEntry[] {
  return dataset.items.map((item) => ({
    id: "english-content:" + item.contentId,
    en: item.answerText,
    vi: item.meaningVi ?? item.promptText,
    ipa: item.ipa ?? "",
    learning: {
      entityType: item.entityType,
      entityId: item.entityId,
      activityType: dataset.activity,
    },
  }));
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

  const learning = options.entry.learning;
  return {
    version: 1,
    entityType: learning?.entityType ?? "vocabulary",
    entityId: learning?.entityId ?? normalizeEntityId(options.entry.en),
    gameId: "recall-typing",
    activityType: learning?.activityType ?? activityType,
    result: wrong ? "wrong" : "correct",
    occurredAt: options.occurredAt ?? new Date().toISOString(),
    responseMs: Math.max(0, Math.round(options.responseMs)),
    hintUsed: false,
    replayUsed: options.replayUsed,
    expectedAnswer: options.entry.en,
    ...(wrong ? { errorType: "spelling" as const } : {}),
  };
}
