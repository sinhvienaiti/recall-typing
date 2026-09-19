import "./styles.css";
import { speakEnglish, stopSpeech } from "./audio/speech";
import {
  buildRecallSession,
  isRecallableCharacter,
  isUsableVocabularyEntry,
  matchesCharacter,
  nextRecallIndex,
} from "./game/recall";
import { getVocabulary, replaceVocabulary } from "./storage/db";
import {
  defaultSettings,
  loadSettings,
  normalizeSettings,
  saveSettings,
} from "./storage/settings";
import type {
  RecallResult,
  RecallSettings,
  VocabularyEntry,
} from "./types";
import {
  parseBulkVocabulary,
  vocabularyToBulk,
} from "./ui/vocabulary-editor";

const app = document.querySelector<HTMLDivElement>("#app");
if (app === null) throw new Error("#app not found");

app.innerHTML = `
  <div class="recall-shell">
    <header class="topbar">
      <div class="brand">
        <strong>Recall Typing</strong>
        <span>Recall the hidden English spelling from meaning and sound.</span>
      </div>

      <div class="top-stats">
        <div><span>PROGRESS</span><strong id="progress">0 / 0</strong></div>
        <div><span>ACCURACY</span><strong id="accuracy">100%</strong></div>
        <div><span>STREAK</span><strong id="streak">0</strong></div>
      </div>

      <div class="actions">
        <button id="startButton" class="primary">Start / Restart</button>
        <button id="vocabularyButton">Vocabulary</button>
        <button id="settingsButton">Settings</button>
      </div>
    </header>

    <main class="study-stage">
      <section id="hintPanel" class="hint-panel">
        <div class="hint-kicker">RECALL THE ENGLISH WORD</div>
        <div id="hintMeaning" class="hint-meaning">Press Start to begin</div>
        <div id="hintIpa" class="hint-ipa"></div>
        <button id="speakButton" class="speaker" type="button" aria-label="Replay pronunciation" title="Replay pronunciation (F2)">
          <span aria-hidden="true">🔊</span>
          <span>F2 replay</span>
        </button>
      </section>

      <section class="typing-card">
        <div id="slots" class="slots" aria-live="polite"></div>
        <div id="feedback" class="feedback">Correct letters reveal one by one.</div>
      </section>

      <div class="shortcut-bar">
        <span id="restartHelp"></span>
        <span>F2 replay pronunciation</span>
      </div>
    </main>
  </div>

  <dialog id="vocabularyDialog" class="panel-dialog">
    <form method="dialog" class="dialog-card vocab-card">
      <div class="dialog-header">
        <div>
          <h2>Vocabulary</h2>
          <p>English is the hidden answer. Vietnamese, IPA and pronunciation are learning hints.</p>
        </div>
        <button class="icon-button" value="cancel" aria-label="Close">×</button>
      </div>

      <div class="vocab-toolbar">
        <button type="button" id="addRow">+ Add word</button>
        <button type="button" id="toggleBulk">Bulk import</button>
        <button type="button" id="exportBackup">Export backup</button>
        <label class="file-button">Import backup<input id="importBackup" type="file" accept="application/json" /></label>
      </div>

      <div id="bulkArea" class="bulk-area hidden">
        <div class="field-label">One entry per line: English | Vietnamese | IPA</div>
        <textarea id="bulkInput" spellcheck="false"></textarea>
        <button type="button" id="applyBulk">Replace table from bulk text</button>
      </div>

      <div class="vocab-table-wrap">
        <table class="vocab-table">
          <thead>
            <tr><th>English</th><th>Vietnamese</th><th>IPA</th><th></th></tr>
          </thead>
          <tbody id="vocabRows"></tbody>
        </table>
      </div>

      <div class="dialog-footer">
        <span id="vocabCount"></span>
        <button type="button" id="saveVocabulary" class="primary">Save vocabulary</button>
      </div>
    </form>
  </dialog>

  <dialog id="settingsDialog" class="panel-dialog">
    <form method="dialog" class="dialog-card settings-card">
      <div class="dialog-header">
        <div>
          <h2>Recall settings</h2>
          <p>Settings are stored locally in this browser.</p>
        </div>
        <button class="icon-button" value="cancel" aria-label="Close">×</button>
      </div>

      <div class="settings-grid">
        <label>
          <span>Hint style</span>
          <select id="hintMode">
            <option value="full">Vietnamese + IPA + audio</option>
            <option value="audio">Audio only</option>
            <option value="meaning">Vietnamese + IPA</option>
          </select>
        </label>

        <label>
          <span>Accent</span>
          <select id="accent">
            <option value="en-US">US</option>
            <option value="en-GB">UK</option>
          </select>
        </label>

        <label>
          <span>Speech speed</span>
          <input id="speechRate" type="range" min="0.65" max="1.4" step="0.05" />
          <output id="speechRateValue"></output>
        </label>

        <label>
          <span>Speech volume</span>
          <input id="speechVolume" type="range" min="0" max="1" step="0.05" />
          <output id="speechVolumeValue"></output>
        </label>

        <label>
          <span>Auto pronunciation</span>
          <select id="autoSpeak">
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </label>

        <label>
          <span>Quick restart</span>
          <select id="quickRestartKey">
            <option value="Tab">Tab</option>
            <option value="Escape">Escape</option>
          </select>
        </label>

        <label>
          <span>Shuffle</span>
          <select id="shuffle">
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </label>

        <label>
          <span>Words per run</span>
          <input id="targetCount" type="number" min="1" max="500" step="1" />
        </label>

        <label>
          <span>Case sensitive</span>
          <select id="requireExactCase">
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
        </label>
      </div>

      <div class="dialog-footer">
        <button type="button" id="resetSettings">Defaults</button>
        <button type="button" id="saveSettings" class="primary">Save settings</button>
      </div>
    </form>
  </dialog>

  <dialog id="resultDialog" class="panel-dialog result-dialog">
    <div class="dialog-card result-card">
      <div class="dialog-header">
        <div>
          <h2>Recall complete</h2>
          <p>Review your recall performance.</p>
        </div>
        <button id="closeResult" class="icon-button" type="button" aria-label="Close">×</button>
      </div>
      <div id="resultGrid" class="result-grid"></div>
      <div class="dialog-footer">
        <span id="resultShortcut"></span>
        <button id="resultRestart" type="button" class="primary">Play again</button>
      </div>
    </div>
  </dialog>
`;

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (element === null) throw new Error(`#${id} not found`);
  return element as T;
}

const vocabularyDialog = byId<HTMLDialogElement>("vocabularyDialog");
const settingsDialog = byId<HTMLDialogElement>("settingsDialog");
const resultDialog = byId<HTMLDialogElement>("resultDialog");
const slots = byId<HTMLDivElement>("slots");
const feedback = byId<HTMLDivElement>("feedback");

let vocabulary = await getVocabulary();
let settings = loadSettings();
let session: VocabularyEntry[] = [];
let currentIndex = 0;
let cursor = 0;
let running = false;
let transitioning = false;
let wrongAttempts = 0;
let totalAttempts = 0;
let completedWords = 0;
let streak = 0;
let maxStreak = 0;
let startedAt = 0;
let wordStartedAt = 0;
let wordTimeTotal = 0;
let feedbackTimer: number | null = null;
let transitionTimer: number | null = null;

function clearTransitionTimer(): void {
  if (transitionTimer === null) return;
  window.clearTimeout(transitionTimer);
  transitionTimer = null;
}

function currentEntry(): VocabularyEntry | null {
  return session[currentIndex] ?? null;
}



function setFeedback(message: string, kind: "normal" | "error" | "success" = "normal"): void {
  if (feedbackTimer !== null) window.clearTimeout(feedbackTimer);
  feedback.textContent = message;
  feedback.classList.toggle("error", kind === "error");
  feedback.classList.toggle("success", kind === "success");

  if (kind !== "normal") {
    feedbackTimer = window.setTimeout(() => {
      feedback.classList.remove("error", "success");
      feedback.textContent = "Type the hidden English spelling.";
    }, 650);
  }
}

function renderHint(): void {
  const entry = currentEntry();
  const meaning = byId("hintMeaning");
  const ipa = byId("hintIpa");
  const speaker = byId<HTMLButtonElement>("speakButton");

  if (entry === null) {
    meaning.textContent = running ? "No target" : "Press Start to begin";
    ipa.textContent = "";
    speaker.disabled = true;
    return;
  }

  speaker.disabled = false;
  const showText = settings.hintMode !== "audio";
  meaning.textContent = showText ? entry.vi : "Listen and recall the English spelling";
  ipa.textContent = showText ? entry.ipa : "";
}

function renderSlots(): void {
  slots.replaceChildren();
  const entry = currentEntry();

  if (entry === null) {
    slots.classList.add("empty");
    slots.textContent = running ? "No target" : "_ _ _ _ _";
    return;
  }

  slots.classList.remove("empty");
  const text = entry.en;

  for (let index = 0; index < text.length; index++) {
    const character = text[index] ?? "";
    const span = document.createElement("span");

    if (!isRecallableCharacter(character)) {
      span.className = character.trim() === "" ? "slot structural space" : "slot structural";
      span.textContent = character.trim() === "" ? " " : character;
    } else if (index < cursor) {
      span.className = "slot revealed";
      span.textContent = character;
    } else {
      span.className = index === cursor ? "slot hidden active" : "slot hidden";
      span.textContent = "\u00A0";
      span.setAttribute("aria-label", "hidden character");
    }

    slots.append(span);
  }
}

function updateStats(): void {
  byId("progress").textContent = `${completedWords} / ${session.length}`;
  const accuracy = totalAttempts === 0 ? 100 : ((totalAttempts - wrongAttempts) / totalAttempts) * 100;
  byId("accuracy").textContent = `${Math.max(0, accuracy).toFixed(0)}%`;
  byId("streak").textContent = String(streak);
  byId("restartHelp").textContent = `${settings.quickRestartKey} quick restart`;
}

function shouldAutoSpeak(): boolean {
  return settings.autoSpeak && settings.hintMode !== "meaning";
}

function speakCurrent(): void {
  const entry = currentEntry();
  if (entry !== null) speakEnglish(entry.en, settings);
}

function activateCurrent(): void {
  const entry = currentEntry();
  if (entry === null) {
    finishRun();
    return;
  }

  cursor = nextRecallIndex(entry.en, 0);
  wordStartedAt = performance.now();
  transitioning = false;
  renderHint();
  renderSlots();
  updateStats();

  if (shouldAutoSpeak()) speakCurrent();
}

function startRun(): void {
  if (vocabulary.length === 0) {
    setFeedback("Add at least one vocabulary entry first.", "error");
    return;
  }

  if (resultDialog.open) resultDialog.close();
  stopSpeech();
  clearTransitionTimer();
  slots.classList.remove("word-complete", "wrong-pulse");
  session = buildRecallSession(vocabulary, settings.targetCount, settings.shuffle);
  if (session.length === 0) {
    currentIndex = 0;
    running = false;
    transitioning = false;
    renderHint();
    renderSlots();
    updateStats();
    setFeedback("Add at least one valid English/Vietnamese vocabulary entry first.", "error");
    return;
  }

  currentIndex = 0;
  cursor = 0;
  running = true;
  transitioning = false;
  wrongAttempts = 0;
  totalAttempts = 0;
  completedWords = 0;
  streak = 0;
  maxStreak = 0;
  startedAt = performance.now();
  wordStartedAt = startedAt;
  wordTimeTotal = 0;
  setFeedback("Type the hidden English spelling.");
  activateCurrent();
}

function correctCurrentCharacter(input: string): boolean {
  const entry = currentEntry();
  if (entry === null) return false;
  const expected = entry.en[cursor] ?? "";
  return matchesCharacter(input, expected, settings.requireExactCase);
}

function handleCharacter(input: string): void {
  if (!running || transitioning || !isRecallableCharacter(input)) return;
  const entry = currentEntry();
  if (entry === null) return;

  totalAttempts++;

  if (!correctCurrentCharacter(input)) {
    wrongAttempts++;
    streak = 0;
    slots.classList.remove("wrong-pulse");
    void slots.offsetWidth;
    slots.classList.add("wrong-pulse");
    setFeedback("Not that letter. Try again.", "error");
    updateStats();
    return;
  }

  cursor++;
  cursor = nextRecallIndex(entry.en, cursor);
  renderSlots();

  if (cursor >= entry.en.length) {
    completeWord();
  }

  updateStats();
}

function completeWord(): void {
  if (transitioning) return;
  transitioning = true;
  const now = performance.now();
  wordTimeTotal += Math.max(0, (now - wordStartedAt) / 1000);
  completedWords++;
  streak++;
  maxStreak = Math.max(maxStreak, streak);
  slots.classList.add("word-complete");
  setFeedback("Correct!", "success");

  transitionTimer = window.setTimeout(() => {
    transitionTimer = null;
    slots.classList.remove("word-complete");
    currentIndex++;
    if (currentIndex >= session.length) {
      finishRun();
      return;
    }
    activateCurrent();
  }, 340);
}

function finishRun(): void {
  if (!running) return;
  running = false;
  transitioning = false;
  clearTransitionTimer();
  stopSpeech();

  const elapsedSec = Math.max(0, (performance.now() - startedAt) / 1000);
  const accuracy = totalAttempts === 0 ? 100 : ((totalAttempts - wrongAttempts) / totalAttempts) * 100;
  const result: RecallResult = {
    completedWords,
    wrongAttempts,
    totalAttempts,
    accuracy: Math.max(0, accuracy),
    maxStreak,
    elapsedSec,
    averageWordSec: completedWords === 0 ? 0 : wordTimeTotal / completedWords,
  };

  renderResult(result);
  renderHint();
  renderSlots();
  updateStats();
}

function renderResult(result: RecallResult): void {
  const items: Array<[string, string]> = [
    ["Completed", String(result.completedWords)],
    ["Wrong attempts", String(result.wrongAttempts)],
    ["Accuracy", `${result.accuracy.toFixed(1)}%`],
    ["Max streak", String(result.maxStreak)],
    ["Elapsed", `${result.elapsedSec.toFixed(1)}s`],
    ["Average word", `${result.averageWordSec.toFixed(2)}s`],
  ];

  const grid = byId("resultGrid");
  grid.replaceChildren();

  for (const [label, value] of items) {
    const item = document.createElement("div");
    const key = document.createElement("span");
    const strong = document.createElement("strong");
    key.textContent = label;
    strong.textContent = value;
    item.append(key, strong);
    grid.append(item);
  }

  byId("resultShortcut").textContent = `${settings.quickRestartKey} restarts instantly`;
  resultDialog.showModal();
}

function isFormTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLButtonElement
  );
}

window.addEventListener("keydown", (event) => {
  if (resultDialog.open && event.key === settings.quickRestartKey) {
    event.preventDefault();
    startRun();
    return;
  }

  if (vocabularyDialog.open || settingsDialog.open || isFormTarget(event.target)) return;

  if (event.key === settings.quickRestartKey) {
    event.preventDefault();
    startRun();
    return;
  }

  if (event.key === "F2") {
    event.preventDefault();
    speakCurrent();
    return;
  }

  if (event.metaKey || event.ctrlKey || event.altKey || event.key.length !== 1) return;
  handleCharacter(event.key);
});

byId<HTMLButtonElement>("startButton").addEventListener("click", startRun);
byId<HTMLButtonElement>("resultRestart").addEventListener("click", startRun);
byId<HTMLButtonElement>("closeResult").addEventListener("click", () => resultDialog.close());
byId<HTMLButtonElement>("speakButton").addEventListener("click", speakCurrent);

function createVocabularyRow(entry: VocabularyEntry): HTMLTableRowElement {
  const row = document.createElement("tr");
  row.dataset["id"] = entry.id;

  for (const [field, value, placeholder] of [
    ["en", entry.en, "dependency"],
    ["vi", entry.vi, "sự phụ thuộc"],
    ["ipa", entry.ipa, "/dɪˈpen.dən.si/"],
  ] as const) {
    const cell = document.createElement("td");
    const input = document.createElement("input");
    input.dataset["field"] = field;
    input.value = value;
    input.placeholder = placeholder;
    cell.append(input);
    row.append(cell);
  }

  const action = document.createElement("td");
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "remove-row";
  remove.textContent = "×";
  remove.addEventListener("click", () => {
    row.remove();
    updateVocabularyCount();
  });
  action.append(remove);
  row.append(action);
  return row;
}

function renderVocabularyRows(): void {
  const body = byId<HTMLTableSectionElement>("vocabRows");
  body.replaceChildren();
  for (const entry of vocabulary) body.append(createVocabularyRow(entry));
  updateVocabularyCount();
}

function updateVocabularyCount(): void {
  byId("vocabCount").textContent = `${document.querySelectorAll("#vocabRows tr").length} entries`;
}

byId<HTMLButtonElement>("vocabularyButton").addEventListener("click", () => {
  renderVocabularyRows();
  byId<HTMLTextAreaElement>("bulkInput").value = vocabularyToBulk(vocabulary);
  vocabularyDialog.showModal();
});

byId<HTMLButtonElement>("addRow").addEventListener("click", () => {
  byId<HTMLTableSectionElement>("vocabRows").append(
    createVocabularyRow({ id: crypto.randomUUID(), en: "", vi: "", ipa: "" }),
  );
  updateVocabularyCount();
});

byId<HTMLButtonElement>("toggleBulk").addEventListener("click", () => {
  byId("bulkArea").classList.toggle("hidden");
});

byId<HTMLButtonElement>("applyBulk").addEventListener("click", () => {
  vocabulary = parseBulkVocabulary(byId<HTMLTextAreaElement>("bulkInput").value);
  renderVocabularyRows();
});

byId<HTMLButtonElement>("saveVocabulary").addEventListener("click", async () => {
  const entries: VocabularyEntry[] = [];

  for (const row of document.querySelectorAll<HTMLTableRowElement>("#vocabRows tr")) {
    const en = row.querySelector<HTMLInputElement>('input[data-field="en"]')?.value.trim() ?? "";
    const vi = row.querySelector<HTMLInputElement>('input[data-field="vi"]')?.value.trim() ?? "";
    const ipa = row.querySelector<HTMLInputElement>('input[data-field="ipa"]')?.value.trim() ?? "";
    if (en === "" || vi === "") continue;
    const entry = {
      id: row.dataset["id"] ?? crypto.randomUUID(),
      en,
      vi,
      ipa,
    };
    if (isUsableVocabularyEntry(entry)) entries.push(entry);
  }

  if (entries.length === 0) {
    alert("Add at least one valid English/Vietnamese vocabulary entry.");
    return;
  }

  vocabulary = entries;
  await replaceVocabulary(vocabulary);
  vocabularyDialog.close();

  if (running) startRun();
});

function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

byId<HTMLButtonElement>("exportBackup").addEventListener("click", () => {
  downloadJson("recall-typing-backup.json", {
    version: 1,
    vocabulary,
    settings,
  });
});

byId<HTMLInputElement>("importBackup").addEventListener("change", async (event) => {
  const input = event.currentTarget as HTMLInputElement;
  const file = input.files?.[0];
  if (file === undefined) return;

  try {
    const data = JSON.parse(await file.text()) as {
      vocabulary?: unknown[];
      settings?: unknown;
    };

    if (Array.isArray(data.vocabulary)) {
      const usedIds = new Set<string>();
      const imported = data.vocabulary
        .filter(
          (entry): entry is Record<string, unknown> =>
            entry !== null &&
            typeof entry === "object" &&
            typeof (entry as Record<string, unknown>)["en"] === "string" &&
            typeof (entry as Record<string, unknown>)["vi"] === "string",
        )
        .map((entry) => {
          const candidateId =
            typeof entry["id"] === "string" && entry["id"] !== ""
              ? entry["id"]
              : crypto.randomUUID();
          const id = usedIds.has(candidateId) ? crypto.randomUUID() : candidateId;
          usedIds.add(id);

          return {
            id,
            en: String(entry["en"]).trim(),
            vi: String(entry["vi"]).trim(),
            ipa: typeof entry["ipa"] === "string" ? entry["ipa"].trim() : "",
          };
        })
        .filter(isUsableVocabularyEntry);

      if (imported.length === 0) {
        throw new Error("Backup has no valid vocabulary entries");
      }

      vocabulary = imported;
      await replaceVocabulary(vocabulary);
    }

    if (data.settings !== undefined) {
      settings = normalizeSettings(data.settings);
      saveSettings(settings);
      fillSettingsForm(settings);
      updateStats();
    }

    renderVocabularyRows();
    byId<HTMLTextAreaElement>("bulkInput").value = vocabularyToBulk(vocabulary);
    renderHint();
    renderSlots();
    updateStats();
    if (running) startRun();
  } catch {
    alert("Invalid backup file.");
  } finally {
    input.value = "";
  }
});

function fillSettingsForm(value: RecallSettings): void {
  byId<HTMLSelectElement>("hintMode").value = value.hintMode;
  byId<HTMLSelectElement>("accent").value = value.accent;
  byId<HTMLInputElement>("speechRate").value = String(value.speechRate);
  byId<HTMLInputElement>("speechVolume").value = String(value.speechVolume);
  byId<HTMLSelectElement>("autoSpeak").value = String(value.autoSpeak);
  byId<HTMLSelectElement>("quickRestartKey").value = value.quickRestartKey;
  byId<HTMLSelectElement>("shuffle").value = String(value.shuffle);
  byId<HTMLInputElement>("targetCount").value = String(value.targetCount);
  byId<HTMLSelectElement>("requireExactCase").value = String(value.requireExactCase);
  updateSettingOutputs();
}

function updateSettingOutputs(): void {
  byId<HTMLOutputElement>("speechRateValue").value =
    `${Number(byId<HTMLInputElement>("speechRate").value).toFixed(2)}×`;
  byId<HTMLOutputElement>("speechVolumeValue").value =
    `${Math.round(Number(byId<HTMLInputElement>("speechVolume").value) * 100)}%`;
}

byId<HTMLInputElement>("speechRate").addEventListener("input", updateSettingOutputs);
byId<HTMLInputElement>("speechVolume").addEventListener("input", updateSettingOutputs);

byId<HTMLButtonElement>("settingsButton").addEventListener("click", () => {
  fillSettingsForm(settings);
  settingsDialog.showModal();
});

byId<HTMLButtonElement>("resetSettings").addEventListener("click", () => {
  fillSettingsForm(structuredClone(defaultSettings));
});

byId<HTMLButtonElement>("saveSettings").addEventListener("click", () => {
  settings = normalizeSettings({
    hintMode: byId<HTMLSelectElement>("hintMode").value,
    accent: byId<HTMLSelectElement>("accent").value,
    speechRate: Number(byId<HTMLInputElement>("speechRate").value),
    speechVolume: Number(byId<HTMLInputElement>("speechVolume").value),
    autoSpeak: byId<HTMLSelectElement>("autoSpeak").value === "true",
    quickRestartKey: byId<HTMLSelectElement>("quickRestartKey").value,
    shuffle: byId<HTMLSelectElement>("shuffle").value === "true",
    targetCount: Number(byId<HTMLInputElement>("targetCount").value),
    requireExactCase: byId<HTMLSelectElement>("requireExactCase").value === "true",
  });

  saveSettings(settings);
  settingsDialog.close();
  updateStats();
  renderHint();
  renderSlots();

  if (running && shouldAutoSpeak()) speakCurrent();
});

fillSettingsForm(settings);
updateStats();
renderHint();
renderSlots();

window.addEventListener("beforeunload", stopSpeech);
