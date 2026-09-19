import type { VocabularyEntry } from "../types";

export function parseBulkVocabulary(source: string): VocabularyEntry[] {
  return source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [en = "", vi = "", ipa = ""] = line.split("|").map((part) => part.trim());
      return { id: crypto.randomUUID(), en, vi, ipa };
    })
    .filter(
      (entry) =>
        entry.en !== "" &&
        entry.vi !== "" &&
        Array.from(entry.en).some((character) => /^[\\p{L}\\p{N}]$/u.test(character)),
    );
}

export function vocabularyToBulk(entries: VocabularyEntry[]): string {
  return entries.map((entry) => `${entry.en} | ${entry.vi} | ${entry.ipa}`.trim()).join("\n");
}
