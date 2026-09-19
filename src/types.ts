export type VocabularyEntry = {
  id: string;
  en: string;
  vi: string;
  ipa: string;
};

export type HintMode = "full" | "audio" | "meaning";
export type QuickRestartKey = "Tab" | "Escape";
export type Accent = "en-US" | "en-GB";

export type RecallSettings = {
  version: 1;
  hintMode: HintMode;
  accent: Accent;
  speechRate: number;
  speechVolume: number;
  autoSpeak: boolean;
  quickRestartKey: QuickRestartKey;
  shuffle: boolean;
  targetCount: number;
  requireExactCase: boolean;
};

export type RecallResult = {
  completedWords: number;
  wrongAttempts: number;
  totalAttempts: number;
  accuracy: number;
  maxStreak: number;
  elapsedSec: number;
  averageWordSec: number;
};
