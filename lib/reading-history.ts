export type ReadingHistoryEntry = {
  series?: string;
  title?: string;
  chapter?: string;
  cover?: string;
  slug?: string;
  url: string;
  time: number;
  progress?: number;
};

const HISTORY_KEY = "readingHistory";
const HISTORY_LIMIT = 50;
const HISTORY_DATABASE = "mikoroku-reading-history";
const HISTORY_STORE = "entries";

function isHistoryEntry(value: unknown): value is ReadingHistoryEntry {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const entry = value as Partial<ReadingHistoryEntry>;
  return typeof entry.url === "string" &&
    entry.url.startsWith("/") &&
    !entry.url.startsWith("//");
}

function normalizeHistory(value: unknown): ReadingHistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isHistoryEntry)
    .map((entry) => ({
      ...entry,
      time: Number(entry.time) || 0,
      progress: Number.isFinite(entry.progress)
        ? Math.max(0, Math.min(100, Number(entry.progress)))
        : 0,
    }))
    .sort((left, right) => right.time - left.time)
    .slice(0, HISTORY_LIMIT);
}

function readLegacyHistory(): ReadingHistoryEntry[] {
  try {
    return normalizeHistory(JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"));
  } catch (error) {
    console.warn("Reading history in localStorage is invalid and will be ignored.", error);
    return [];
  }
}

function openHistoryDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(HISTORY_DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(HISTORY_STORE)) {
        request.result.createObjectStore(HISTORY_STORE, { keyPath: "url" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open reading history storage."));
    request.onblocked = () => reject(new Error("Reading history storage is blocked by another browser tab."));
  });
}

async function readIndexedDbHistory(): Promise<ReadingHistoryEntry[]> {
  if (!("indexedDB" in window)) return [];
  const database = await openHistoryDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(HISTORY_STORE, "readonly");
    const request = transaction.objectStore(HISTORY_STORE).getAll();
    let entries: ReadingHistoryEntry[] = [];
    request.onsuccess = () => {
      entries = normalizeHistory(request.result);
    };
    transaction.oncomplete = () => {
      database.close();
      resolve(entries);
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? request.error ?? new Error("Could not read reading history."));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? request.error ?? new Error("Reading history read was aborted."));
    };
  });
}

async function writeIndexedDbHistory(entries: ReadingHistoryEntry[]): Promise<void> {
  if (!("indexedDB" in window)) return;
  const database = await openHistoryDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(HISTORY_STORE, "readwrite");
    const store = transaction.objectStore(HISTORY_STORE);
    store.clear();
    normalizeHistory(entries).forEach((entry) => store.put(entry));
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Could not write reading history."));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("Reading history write was aborted."));
    };
  });
}

export async function readReadingHistory(): Promise<ReadingHistoryEntry[]> {
  try {
    const indexedDbEntries = await readIndexedDbHistory();
    if (indexedDbEntries.length) {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(indexedDbEntries));
      return indexedDbEntries;
    }

    const legacyEntries = readLegacyHistory();
    if (legacyEntries.length) {
      await writeIndexedDbHistory(legacyEntries);
      return legacyEntries;
    }
    return [];
  } catch (error) {
    console.error("Could not read reading history from IndexedDB; using localStorage.", error);
    return readLegacyHistory();
  }
}

export async function writeReadingHistory(entries: ReadingHistoryEntry[]): Promise<void> {
  const normalized = normalizeHistory(entries);
  await writeIndexedDbHistory(normalized);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(normalized));
}

export async function upsertReadingHistoryEntry(entry: ReadingHistoryEntry): Promise<void> {
  const existing = await readReadingHistory();
  const previous = existing.find((item) => item.url === entry.url);
  const updated = [
    { ...entry, progress: entry.progress ?? previous?.progress ?? 0 },
    ...existing.filter((item) => item.url !== entry.url),
  ].slice(0, HISTORY_LIMIT);
  await writeReadingHistory(updated);
}

export async function updateReadingHistoryProgress(url: string, progress: number): Promise<void> {
  const existing = await readReadingHistory();
  if (!existing.some((entry) => entry.url === url)) return;
  await writeReadingHistory(existing.map((entry) =>
    entry.url === url
      ? { ...entry, progress: Math.max(0, Math.min(100, progress)) }
      : entry,
  ));
}

export async function deleteReadingHistoryEntry(url: string): Promise<void> {
  const existing = await readReadingHistory();
  await writeReadingHistory(existing.filter((entry) => entry.url !== url));
}

export async function clearReadingHistory(): Promise<void> {
  if ("indexedDB" in window) {
    const database = await openHistoryDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(HISTORY_STORE, "readwrite");
      transaction.objectStore(HISTORY_STORE).clear();
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => {
        database.close();
        reject(transaction.error ?? new Error("Could not clear reading history."));
      };
      transaction.onabort = () => {
        database.close();
        reject(transaction.error ?? new Error("Clearing reading history was aborted."));
      };
    });
  }
  localStorage.removeItem(HISTORY_KEY);
}
