import { normalizeChapterNumber } from "../../lib/chapter-number";

const CHAPTER_CACHE_PREFIX = "chapters_";
const CHAPTER_CACHE_TTL = 30 * 60 * 1000;
const MAX_CACHED_CHAPTERS_PER_SERIES = 200;
const MAX_CHAPTER_CACHE_ENTRY_BYTES = 128 * 1024;
const MAX_TOTAL_CHAPTER_CACHE_BYTES = 1024 * 1024;
const LOCAL_STORAGE_HEADROOM_BYTES = 64 * 1024;
const SHARED_CHAPTER_CACHE_DB = "mikoroku-chapter-cache";
const SHARED_CHAPTER_CACHE_STORE = "chapters";
const SHARED_CHAPTER_CACHE_TTL = 30 * 60 * 1000;
const MAX_SHARED_CHAPTERS_PER_SERIES = 1000;

export type SharedChapterSource = "blogger" | "blogger2" | "firestore";

type SharedChapterCacheEntry<T extends object = Record<string, unknown>> = {
  key: string;
  slug: string;
  source: SharedChapterSource;
  time: number;
  data: T[];
};

const cachedChapterFields = [
  "id",
  "num",
  "chapter",
  "title",
  "label",
  "postTitle",
  "thumbnail",
  "url",
  "source",
  "createdAt",
  "updatedAt",
  "date",
  "timestamp",
  "order",
  "isNovel",
] as const;

function openSharedChapterCache(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SHARED_CHAPTER_CACHE_DB, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(SHARED_CHAPTER_CACHE_STORE)) {
        database.createObjectStore(SHARED_CHAPTER_CACHE_STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open the shared chapter cache."));
  });
}

function sharedChapterCacheKey(slug: string, source: SharedChapterSource): string {
  return `${slug}:${source}`;
}

function normalizeSharedRecords<T extends object>(records: unknown): T[] {
  if (!Array.isArray(records)) return [];
  const merged = new Map<string, Record<string, unknown>>();
  for (const value of records) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const record = value as Record<string, unknown>;
    const chapter = normalizeChapterNumber(record.num ?? record.chapter ?? record.id);
    if (!chapter || record.isDraft === true) continue;
    const previousRecord = merged.get(chapter);
    const next: Record<string, unknown> = { ...previousRecord, ...record, num: chapter };
    for (const field of ["images", "thumbnail", "url"] as const) {
      const incoming = record[field];
      const existing = previousRecord?.[field];
      if (
        (incoming === undefined || incoming === null || incoming === "" ||
          (Array.isArray(incoming) && incoming.length === 0)) &&
        existing !== undefined
      ) {
        next[field] = existing;
      }
    }
    merged.set(chapter, next);
  }
  return [...merged.values()].slice(0, MAX_SHARED_CHAPTERS_PER_SERIES) as T[];
}

export async function readSharedChapterCache<T extends object>(
  slug: string,
  source: SharedChapterSource,
): Promise<T[] | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) return null;
  const database = await openSharedChapterCache();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(SHARED_CHAPTER_CACHE_STORE, "readonly");
    const request = transaction.objectStore(SHARED_CHAPTER_CACHE_STORE).get(sharedChapterCacheKey(slug, source));
    let records: T[] | null = null;
    request.onsuccess = () => {
      const entry = request.result as SharedChapterCacheEntry<T> | undefined;
      if (entry && Date.now() - entry.time < SHARED_CHAPTER_CACHE_TTL) {
        records = normalizeSharedRecords<T>(entry.data);
      }
    };
    request.onerror = () => {
      database.close();
      reject(request.error ?? new Error("Could not read the shared chapter cache."));
    };
    transaction.oncomplete = () => {
      database.close();
      resolve(records);
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Could not read the shared chapter cache."));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("Reading the shared chapter cache was aborted."));
    };
  });
}

export async function mergeSharedChapterCache<T extends object>(
  slug: string,
  source: SharedChapterSource,
  chapters: T[],
): Promise<T[]> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return normalizeSharedRecords<T>(chapters);
  }
  const database = await openSharedChapterCache();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(SHARED_CHAPTER_CACHE_STORE, "readwrite");
    const store = transaction.objectStore(SHARED_CHAPTER_CACHE_STORE);
    const key = sharedChapterCacheKey(slug, source);
    const request = store.get(key);
    let merged = normalizeSharedRecords<T>(chapters);
    request.onsuccess = () => {
      const previous = request.result as SharedChapterCacheEntry<T> | undefined;
      merged = normalizeSharedRecords<T>([
        ...(previous && Date.now() - previous.time < SHARED_CHAPTER_CACHE_TTL
          ? previous.data
          : []),
        ...chapters,
      ]);
      store.put({
        key,
        slug,
        source,
        time: Date.now(),
        data: merged,
      } satisfies SharedChapterCacheEntry<T>);
    };
    request.onerror = () => transaction.abort();
    transaction.oncomplete = () => {
      database.close();
      resolve(merged);
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? request.error ?? new Error("Could not write the shared chapter cache."));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? request.error ?? new Error("Writing the shared chapter cache was aborted."));
    };
  });
}

export async function clearSharedChapterCache(): Promise<void> {
  if (typeof window === "undefined" || !("indexedDB" in window)) return;
  const database = await openSharedChapterCache();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(SHARED_CHAPTER_CACHE_STORE, "readwrite");
    transaction.objectStore(SHARED_CHAPTER_CACHE_STORE).clear();
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Could not clear the shared chapter cache."));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("Clearing the shared chapter cache was aborted."));
    };
  });
}

function compactChapterRecords(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((record): record is Record<string, unknown> =>
      !!record && typeof record === "object" && !Array.isArray(record) && record.isDraft !== true,
    )
    .map((record) => Object.fromEntries(
      cachedChapterFields.flatMap((field) =>
        record[field] === undefined ? [] : [[field, record[field]]],
      ),
    ))
    .slice(0, MAX_CACHED_CHAPTERS_PER_SERIES);
}

export function compactChapterCache(records: unknown): Record<string, unknown>[] {
  return compactChapterRecords(records);
}

export function pruneStoredChapterCaches(): void {
  try {
    const keys = Object.keys(localStorage)
      .filter((key) => key.startsWith(CHAPTER_CACHE_PREFIX));
    const now = Date.now();
    const entries = keys.flatMap((key) => {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        const parsed: unknown = JSON.parse(raw);
        const cached = parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? parsed as { time?: unknown; data?: unknown }
          : null;
        const time = typeof cached?.time === "number" ? cached.time : 0;
        if (!cached || !Array.isArray(cached.data) || now - time >= CHAPTER_CACHE_TTL) return [];

        const data = compactChapterRecords(cached.data);
        const compacted = JSON.stringify({ time, data });
        const bytes = compacted.length * 2;
        if (!data.length || bytes > MAX_CHAPTER_CACHE_ENTRY_BYTES) return [];
        return [{ key, time, compacted, bytes }];
      } catch (error) {
        console.warn(`Stored chapter cache ${key} is invalid and will be removed.`, error);
        return [];
      }
    }).sort((left, right) => right.time - left.time);

    keys.forEach((key) => localStorage.removeItem(key));
    let retainedBytes = 0;
    for (const entry of entries) {
      if (retainedBytes + entry.bytes > MAX_TOTAL_CHAPTER_CACHE_BYTES) continue;
      try {
        localStorage.setItem(entry.key, entry.compacted);
        retainedBytes += entry.bytes;
      } catch (error) {
        console.warn("The browser quota prevented restoring a compacted chapter cache.", error);
        break;
      }
    }
  } catch (error) {
    console.warn("Stored chapter caches could not be compacted before Firestore initialization.", error);
  }
}

export function ensureLocalStorageHeadroom(): boolean {
  const probeKey = "mikoroku-storage-headroom-probe";
  const probeValue = "x".repeat(LOCAL_STORAGE_HEADROOM_BYTES);
  const hasHeadroom = () => {
    try {
      localStorage.setItem(probeKey, probeValue);
      localStorage.removeItem(probeKey);
      return true;
    } catch {
      try {
        localStorage.removeItem(probeKey);
      } catch {

      }
      return false;
    }
  };

  try {
    if (hasHeadroom()) return true;

    const cacheKeys = Object.keys(localStorage)
      .filter((key) =>
        key === "currentManga" ||
        key === "currentChapter" ||
        key.startsWith("mangaGithub") ||
        key.startsWith("mangaFsMeta") ||
        key.startsWith("manga_cache_") ||
        key.startsWith("mk_hero_") ||
        key.startsWith("detail_") ||
        key.startsWith(CHAPTER_CACHE_PREFIX),
      )
      .map((key) => {
        const priority =
          key.startsWith("mangaGithub") || key.startsWith("mangaFsMeta") || key.startsWith("manga_cache_")
            ? 0
            : key.startsWith("detail_") || key.startsWith("mk_hero_")
              ? 1
              : key.startsWith(CHAPTER_CACHE_PREFIX)
                ? 2
                : 3;
        return { key, priority, size: (localStorage.getItem(key) || "").length };
      })
      .sort((left, right) => left.priority - right.priority || right.size - left.size);

    for (const { key } of cacheKeys) {
      localStorage.removeItem(key);
      if (hasHeadroom()) {
        console.warn(`Browser storage was nearly full; removed rebuildable cache "${key}".`);
        return true;
      }
    }

    console.warn("Browser storage is full after removable Mikoroku caches were cleared.");
    return false;
  } catch (error) {
    console.warn("Could not check browser storage capacity.", error);
    return false;
  }
}
