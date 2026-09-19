import { describe, expect, it } from "vitest";
import { parseBulkVocabulary, vocabularyToBulk } from "./vocabulary-editor";

describe("vocabulary editor", () => {
  it("parses normal word and phrase entries", () => {
    const entries = parseBulkVocabulary(
      "cache | bộ nhớ đệm | /kæʃ/\ndependency injection | tiêm phụ thuộc | /test/",
    );

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      en: "cache",
      vi: "bộ nhớ đệm",
      ipa: "/kæʃ/",
    });
    expect(entries[1]?.en).toBe("dependency injection");
  });

  it("rejects entries that contain no recallable English characters", () => {
    expect(parseBulkVocabulary("--- | dấu gạch |")).toHaveLength(0);
  });

  it("keeps a blank IPA field round-trippable", () => {
    const text = vocabularyToBulk([
      { id: "a", en: "cache", vi: "bộ nhớ đệm", ipa: "" },
    ]);
    const [entry] = parseBulkVocabulary(text);

    expect(entry).toMatchObject({
      en: "cache",
      vi: "bộ nhớ đệm",
      ipa: "",
    });
  });
});
