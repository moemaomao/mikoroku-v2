import type { PublicReadingStats } from "../../lib/reading-stats";

const DB_NAME = "mikoroku-v2";
const DB_VERSION = 1;
const STORE_STATS = "readingStats";
const STORE_MEDALS = "medalUnlocks";

const STATS_MAX_AGE_MS = 1000 * 60 * 30;
type StatsCacheRecord = {
  uid: string;
  savedAt: number;
  data: PublicReadingStats;
};

type MedalCacheRecord = {
  key: "unlocked";
  chapters: number[];
  updatedAt: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error || new Error("Failed to open IndexedDB."));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_STATS)) {
        db.createObjectStore(STORE_STATS, { keyPath: "uid" });
      }
      if (!db.objectStoreNames.contains(STORE_MEDALS)) {
        db.createObjectStore(STORE_MEDALS, { keyPath: "key" });
      }
    };
  });
}

function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB request failed."));
  });
}

/* ───────────────────────────── Reading stats cache ───────────────────────────── */

export async function getCachedReadingStats(
  uid: string,
): Promise<{ data: PublicReadingStats; savedAt: number; stale: boolean } | null> {
  try {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE_STATS, "readonly");
      const store = tx.objectStore(STORE_STATS);
      const record = (await idbRequest(store.get(uid))) as StatsCacheRecord | undefined;
      if (!record?.data) return null;
      const age = Date.now() - (record.savedAt || 0);
      return {
        data: record.data,
        savedAt: record.savedAt,
        stale: age > STATS_MAX_AGE_MS,
      };
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}

export async function setCachedReadingStats(
  uid: string,
  data: PublicReadingStats,
): Promise<void> {
  try {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE_STATS, "readwrite");
      const store = tx.objectStore(STORE_STATS);
      const record: StatsCacheRecord = {
        uid,
        savedAt: Date.now(),
        data,
      };
      await idbRequest(store.put(record));
    } finally {
      db.close();
    }
  } catch {
    // non-fatal
  }
}

export async function clearCachedReadingStats(uid?: string): Promise<void> {
  try {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE_STATS, "readwrite");
      const store = tx.objectStore(STORE_STATS);
      if (uid) await idbRequest(store.delete(uid));
      else await idbRequest(store.clear());
    } finally {
      db.close();
    }
  } catch {
    // non-fatal
  }
}

/* ───────────────────────────── Medal unlock cache ───────────────────────────── */

const LOCAL_STORAGE_MEDAL_KEY = "mikoroku:unlocked-medals";

export async function getUnlockedMedals(): Promise<number[]> {
  try {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE_MEDALS, "readonly");
      const store = tx.objectStore(STORE_MEDALS);
      const record = (await idbRequest(store.get("unlocked"))) as MedalCacheRecord | undefined;
      if (record && Array.isArray(record.chapters)) {
        return record.chapters.filter((n) => typeof n === "number");
      }
    } finally {
      db.close();
    }
  } catch {
  }
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_MEDAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const chapters = Array.isArray(parsed)
      ? parsed.filter((n): n is number => typeof n === "number")
      : [];
    if (chapters.length) {
      await setUnlockedMedals(chapters);
      localStorage.removeItem(LOCAL_STORAGE_MEDAL_KEY);
    }
    return chapters;
  } catch {
    return [];
  }
}

export async function setUnlockedMedals(chapters: number[]): Promise<void> {
  const unique = [...new Set(chapters)].sort((a, b) => a - b);
  try {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE_MEDALS, "readwrite");
      const store = tx.objectStore(STORE_MEDALS);
      const record: MedalCacheRecord = {
        key: "unlocked",
        chapters: unique,
        updatedAt: Date.now(),
      };
      await idbRequest(store.put(record));
    } finally {
      db.close();
    }
  } catch {
    try {
      localStorage.setItem(LOCAL_STORAGE_MEDAL_KEY, JSON.stringify(unique));
    } catch {
      // ignore
    }
  }
}

export async function clearUnlockedMedals(): Promise<void> {
  try {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE_MEDALS, "readwrite");
      await idbRequest(tx.objectStore(STORE_MEDALS).delete("unlocked"));
    } finally {
      db.close();
    }
  } catch {
    // ignore
  }
  try {
    localStorage.removeItem(LOCAL_STORAGE_MEDAL_KEY);
  } catch {
    // ignore
  }
}
