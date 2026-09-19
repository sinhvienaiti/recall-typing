import { describe, expect, it, vi } from "vitest";
import type { VocabularyEntry } from "../types";
import {
  buildRecallSession,
  isRecallableCharacter,
  isUsableVocabularyEntry,
  matchesCharacter,
  nextRecallIndex,
} from "./recall";

describe("Recall Typing core", () => {
  it("treats letters and numbers as recallable but keeps structure visible", () => {
    expect(isRecallableCharacter("a")).toBe(true);
    expect(isRecallableCharacter("8")).toBe(true);
    expect(isRecallableCharacter(" ")).toBe(false);
    expect(isRecallableCharacter("'")).toBe(false);
    expect(isRecallableCharacter("-")).toBe(false);
  });

  it("skips spaces and punctuation between hidden letters", () => {
    expect(nextRecallIndex("don't", 3)).toBe(4);
    expect(nextRecallIndex("end-to-end", 3)).toBe(4);
    expect(nextRecallIndex("parent block", 6)).toBe(7);
  });

  it("supports normal case-insensitive recall and optional exact case", () => {
    expect(matchesCharacter("D", "d", false)).toBe(true);
    expect(matchesCharacter("D", "d", true)).toBe(false);
    expect(matchesCharacter("d", "d", true)).toBe(true);
  });

  it("rejects entries that cannot produce a recall target", () => {
    const punctuationOnly: VocabularyEntry = {
      id: "bad",
      en: "---",
      vi: "separator",
      ipa: "",
    };
    expect(isUsableVocabularyEntry(punctuationOnly)).toBe(false);
  });

  it("limits a non-shuffled session without mutating the source", () => {
    const entries: VocabularyEntry[] = [
      { id: "a", en: "cache", vi: "bộ nhớ đệm", ipa: "" },
      { id: "b", en: "service", vi: "dịch vụ", ipa: "" },
      { id: "c", en: "module", vi: "mô-đun", ipa: "" },
    ];
    const copy = [...entries];

    expect(buildRecallSession(entries, 2, false).map((entry) => entry.id)).toEqual(["a", "b"]);
    expect(entries).toEqual(copy);
  });

  it("shuffles only the copied session pool", () => {
    const entries: VocabularyEntry[] = [
      { id: "a", en: "cache", vi: "a", ipa: "" },
      { id: "b", en: "service", vi: "b", ipa: "" },
      { id: "c", en: "module", vi: "c", ipa: "" },
    ];
    const random = vi.spyOn(Math, "random").mockReturnValue(0);

    const result = buildRecallSession(entries, 3, true);

    expect(result).not.toBe(entries);
    expect(entries.map((entry) => entry.id)).toEqual(["a", "b", "c"]);
    expect(result).toHaveLength(3);
    random.mockRestore();
  });
});
