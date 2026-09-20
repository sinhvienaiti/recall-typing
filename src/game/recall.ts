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
    const selectedIds = new Set<string>();
    const count = Math.min(
      this.entries.length,
      Math.max(0, Math.floor(targetCount)),
    );

    while (result.length < count && this.entries.length > 0) {
      if (this.remaining.length === 0) this.refill(selectedIds);

      const entry = this.remaining.shift();
      if (entry === undefined) break;
      if (selectedIds.has(entry.id)) continue;

      selectedIds.add(entry.id);
      this.lastId = entry.id;
      result.push(entry);
    }

    return result;
  }

  private refill(excludedIds: Set<string> = new Set()): void {
    const pool = [...this.entries];

    for (let index = pool.length - 1; index > 0; index--) {
      const swap = Math.floor(Math.random() * (index + 1));
      [pool[index], pool[swap]] = [
        pool[swap] as VocabularyEntry,
        pool[index] as VocabularyEntry,
      ];
    }

    const fresh = pool.filter((entry) => !excludedIds.has(entry.id));
    const alreadySelected = pool.filter((entry) =>
      excludedIds.has(entry.id),
    );
    const ordered = [...fresh, ...alreadySelected];

    if (ordered.length > 1 && ordered[0]?.id === this.lastId) {
      const replacementIndex = ordered.findIndex(
        (entry) => entry.id !== this.lastId && !excludedIds.has(entry.id),
      );
      const fallbackIndex = ordered.findIndex(
        (entry) => entry.id !== this.lastId,
      );
      const swapIndex =
        replacementIndex > 0 ? replacementIndex : fallbackIndex;

      if (swapIndex > 0) {
        const first = ordered[0];
        const replacement = ordered[swapIndex];
        if (first !== undefined && replacement !== undefined) {
          ordered[0] = replacement;
          ordered[swapIndex] = first;
        }
      }
    }

    this.remaining = ordered;
  }
}
