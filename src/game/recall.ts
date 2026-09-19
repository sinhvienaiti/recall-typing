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

export function buildRecallSession(
  entries: VocabularyEntry[],
  targetCount: number,
  shuffle: boolean,
): VocabularyEntry[] {
  const pool = entries.filter(isUsableVocabularyEntry);
  if (shuffle) {
    for (let index = pool.length - 1; index > 0; index--) {
      const swap = Math.floor(Math.random() * (index + 1));
      [pool[index], pool[swap]] = [
        pool[swap] as VocabularyEntry,
        pool[index] as VocabularyEntry,
      ];
    }
  }
  return pool.slice(0, Math.min(targetCount, pool.length));
}
