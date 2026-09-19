import type { VocabularyEntry } from "../types";

const DB_NAME = "typingGameRecallVocabulary";
const DB_VERSION = 1;
const STORE = "entries";

const seed: VocabularyEntry[] = [
  { id: "seed-cache", en: "cache", vi: "bộ nhớ đệm", ipa: "/kæʃ/" },
  { id: "seed-parent-block", en: "parent block", vi: "block cha", ipa: "/ˈper.ənt blɑːk/" },
  { id: "seed-dependency", en: "dependency", vi: "sự phụ thuộc", ipa: "/dɪˈpen.dən.si/" },
  { id: "seed-injection", en: "dependency injection", vi: "tiêm phụ thuộc", ipa: "/dɪˈpen.dən.si ɪnˈdʒek.ʃən/" },
  { id: "seed-service", en: "service container", vi: "bộ chứa dịch vụ", ipa: "/ˈsɝː.vɪs kənˈteɪ.nɚ/" },
  { id: "seed-database", en: "database connection", vi: "kết nối cơ sở dữ liệu", ipa: "/ˈdeɪ.tə.beɪs kəˈnek.ʃən/" },
];

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB"));
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

export async function getVocabulary(): Promise<VocabularyEntry[]> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readonly");
    const entries = await requestToPromise(
      tx.objectStore(STORE).getAll() as IDBRequest<VocabularyEntry[]>,
    );
    if (entries.length > 0) return entries;
  } finally {
    db.close();
  }
  await replaceVocabulary(seed);
  return seed;
}

export async function replaceVocabulary(entries: VocabularyEntry[]): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      store.clear();
      for (const entry of entries) store.put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Failed to save vocabulary"));
      tx.onabort = () => reject(tx.error ?? new Error("Vocabulary save aborted"));
    });
  } finally {
    db.close();
  }
}
