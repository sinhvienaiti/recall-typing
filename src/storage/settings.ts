import type { RecallSettings } from "../types";

const KEY = "recallTypingSettings";

export const defaultSettings: RecallSettings = {
  version: 2,
  hintMode: "full",
  accent: "en-US",
  speechRate: 0.95,
  speechVolume: 1,
  autoSpeak: true,
  quickRestartKey: "Escape",
  shuffle: true,
  targetCount: 30,
  requireExactCase: false,
};

function numberInRange(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && allowed.includes(value as T) ? (value as T) : fallback;
}

export function normalizeSettings(raw: unknown): RecallSettings {
  if (raw === null || typeof raw !== "object") return structuredClone(defaultSettings);
  const data = raw as Record<string, unknown>;
  return {
    version: 2,
    hintMode: enumValue(data["hintMode"], ["full", "audio", "meaning"], defaultSettings.hintMode),
    accent: enumValue(data["accent"], ["en-US", "en-GB"], defaultSettings.accent),
    speechRate: numberInRange(data["speechRate"], defaultSettings.speechRate, 0.65, 1.4),
    speechVolume: numberInRange(data["speechVolume"], defaultSettings.speechVolume, 0, 1),
    autoSpeak: typeof data["autoSpeak"] === "boolean" ? data["autoSpeak"] : defaultSettings.autoSpeak,
    quickRestartKey: enumValue(
      data["quickRestartKey"],
      ["Tab", "Escape"],
      defaultSettings.quickRestartKey,
    ),
    shuffle: typeof data["shuffle"] === "boolean" ? data["shuffle"] : defaultSettings.shuffle,
    targetCount: Math.round(numberInRange(data["targetCount"], defaultSettings.targetCount, 1, 500)),
    requireExactCase:
      typeof data["requireExactCase"] === "boolean"
        ? data["requireExactCase"]
        : defaultSettings.requireExactCase,
  };
}

export function loadSettings(): RecallSettings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw === null ? structuredClone(defaultSettings) : normalizeSettings(JSON.parse(raw));
  } catch {
    return structuredClone(defaultSettings);
  }
}

export function saveSettings(settings: RecallSettings): void {
  localStorage.setItem(KEY, JSON.stringify(settings));
}
