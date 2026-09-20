import { describe, expect, it, vi } from "vitest";
import type { VocabularyEntry } from "../types";
import {
  RecallSessionBag,
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

  it("does not mutate the source and does not repeat before a cycle is exhausted", () => {
    const entries: VocabularyEntry[] = [
      { id: "a", en: "cache", vi: "a", ipa: "" },
      { id: "b", en: "service", vi: "b", ipa: "" },
      { id: "c", en: "module", vi: "c", ipa: "" },
    ];
    const sourceIds = entries.map((entry) => entry.id);
    const random = vi.spyOn(Math, "random").mockReturnValue(0);
    const bag = new RecallSessionBag(entries);

    const firstCycle = bag.take(3);
    const nextEntry = bag.take(1)[0];

    expect(entries.map((entry) => entry.id)).toEqual(sourceIds);
    expect(new Set(firstCycle.map((entry) => entry.id)).size).toBe(3);
    expect(nextEntry?.id).not.toBe(firstCycle[2]?.id);
    random.mockRestore();
  });

  it("continues the same shuffled cycle across recall runs", () => {
    const entries: VocabularyEntry[] = [
      { id: "a", en: "cache", vi: "a", ipa: "" },
      { id: "b", en: "service", vi: "b", ipa: "" },
      { id: "c", en: "module", vi: "c", ipa: "" },
      { id: "d", en: "queue", vi: "d", ipa: "" },
    ];
    const random = vi.spyOn(Math, "random").mockReturnValue(0.5);
    const bag = new RecallSessionBag(entries);

    const firstRun = bag.take(2);
    const secondRun = bag.take(2);

    expect(new Set([...firstRun, ...secondRun].map((entry) => entry.id)).size).toBe(4);
    random.mockRestore();
  });

  it("limits a run to unique entries when targetCount is larger than the vocabulary", () => {
    const entries: VocabularyEntry[] = [
      { id: "a", en: "cache", vi: "a", ipa: "" },
      { id: "b", en: "service", vi: "b", ipa: "" },
      { id: "c", en: "module", vi: "c", ipa: "" },
    ];
    const bag = new RecallSessionBag(entries);

    const run = bag.take(30);

    expect(run).toHaveLength(3);
    expect(new Set(run.map((entry) => entry.id)).size).toBe(3);
  });

  it("resets the bag when vocabulary changes", () => {
    const bag = new RecallSessionBag([
      { id: "a", en: "cache", vi: "a", ipa: "" },
      { id: "b", en: "service", vi: "b", ipa: "" },
    ]);

    bag.take(1);
    bag.setEntries([
      { id: "x", en: "queue", vi: "x", ipa: "" },
      { id: "y", en: "worker", vi: "y", ipa: "" },
    ]);

    expect(bag.take(2).map((entry) => entry.id).sort()).toEqual(["x", "y"]);
  });
});
