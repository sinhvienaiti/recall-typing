import type { VocabularyEntry } from "../types";

export function isRecallableCharacter(character: string): boolean {
  return /^[\p{L}\p{N}]$/u.test(character);
}

export function nextRecallIndex(text: string, from: number): number {
  let index = from;
  while (index < text.length && !isRecallableCharacter(text[index] ?? "")) {
    index++;
  }
  return index;
}

export function matchesCharacter(
  input: string,
  expected: string,
  requireExactCase: boolean,
): boolean {
  if (requireExactCase) return input === expected;
  return input.toLocaleLowerCase("en-US") === expected.toLocaleLowerCase("en-US");
}

export function isUsableVocabularyEntry(entry: VocabularyEntry): boolean {
  return (
    entry.en.trim() !== "" &&
    entry.vi.trim() !== "" &&
    Array.from(entry.en).some(isRecallableCharacter)
  );
}

export class RecallSessionBag {
  private entries: VocabularyEntry[] = [];
  private remaining: VocabularyEntry[] = [];
  private lastId: string | null = null;

  constructor(entries: VocabularyEntry[] = []) {
    this.setEntries(entries);
  }

  setEntries(entries: VocabularyEntry[]): void {
    this.entries = entries.filter(isUsableVocabularyEntry);
    this.remaining = [];
    this.lastId = null;
  }

  take(targetCount: number): VocabularyEntry[] {
    const result: VocabularyEntry[] = [];
    const count = Math.max(0, Math.floor(targetCount));

    while (result.length < count && this.entries.length > 0) {
      if (this.remaining.length === 0) this.refill();
      const entry = this.remaining.shift();
      if (entry === undefined) break;
      this.lastId = entry.id;
      result.push(entry);
    }

    return result;
  }

  private refill(): void {
    const pool = [...this.entries];

    for (let index = pool.length - 1; index > 0; index--) {
      const swap = Math.floor(Math.random() * (index + 1));
      [pool[index], pool[swap]] = [
        pool[swap] as VocabularyEntry,
        pool[index] as VocabularyEntry,
      ];
    }

    if (pool.length > 1 && pool[0]?.id === this.lastId) {
      const replacementIndex = pool.findIndex((entry) => entry.id !== this.lastId);
      if (replacementIndex > 0) {
        [pool[0], pool[replacementIndex]] = [
          pool[replacementIndex] as VocabularyEntry,
          pool[0] as VocabularyEntry,
        ];
      }
    }

    this.remaining = pool;
  }
}
