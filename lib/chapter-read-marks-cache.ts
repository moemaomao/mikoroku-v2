export type CachedChapterReadMarks = {
  chapters: string[];
  fetchedAt: number;
  checkedAt: number;
};

type ChapterReadMarksRecord = CachedChapterReadMarks & {
  key: string;
  uid: string;
  slug: string;
};

const DATABASE_NAME = "mikoroku-chapter-read-marks";
const DATABASE_VERSION = 1;
const STORE_NAME = "marks";
const LOCAL_STORAGE_PREFIX = "mikoroku:chapter-read-marks:";
const memoryCache = new Map<string, ChapterReadMarksRecord>();

function cacheKey(uid: string, slug: string): string {
  return `${uid}:${slug}`;
}

function localStorageKey(uid: string, slug: string): string {
  return `${LOCAL_STORAGE_PREFIX}${encodeURIComponent(uid)}:${encodeURIComponent(slug)}`;
}

function parseRecord(value: unknown, uid: string, slug: string): ChapterReadMarksRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (
    record.uid !== uid ||
    record.slug !== slug ||
    !Array.isArray(record.chapters) ||
    typeof record.fetchedAt !== "number" ||
    !Number.isFinite(record.fetchedAt) ||
    (record.checkedAt !== undefined && (
      typeof record.checkedAt !== "number" || !Number.isFinite(record.checkedAt)
    ))
  ) return null;

  return {
    key: cacheKey(uid, slug),
    uid,
    slug,
    chapters: [...new Set(record.chapters.filter((chapter): chapter is string => typeof chapter === "string"))],
    fetchedAt: record.fetchedAt,
    checkedAt: typeof record.checkedAt === "number" ? record.checkedAt : 0,
  };
}

function readLocalRecord(uid: string, slug: string): ChapterReadMarksRecord | null {
  try {
    const stored = window.localStorage.getItem(localStorageKey(uid, slug));
    return stored ? parseRecord(JSON.parse(stored), uid, slug) : null;
  } catch (error) {
    console.warn("Cached chapter read marks could not be read from local storage.", error);
    return null;
  }
}

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available."));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open chapter read marks cache."));
    request.onblocked = () => reject(new Error("Chapter read marks cache is blocked by another browser tab."));
  });
}

async function readIndexedDbRecord(uid: string, slug: string): Promise<ChapterReadMarksRecord | null> {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get(cacheKey(uid, slug));
      let record: ChapterReadMarksRecord | null = null;
      request.onsuccess = () => {
        record = parseRecord(request.result, uid, slug);
      };
      transaction.oncomplete = () => resolve(record);
      transaction.onerror = () => reject(transaction.error || request.error || new Error("Could not read chapter read marks."));
      transaction.onabort = () => reject(transaction.error || request.error || new Error("Reading chapter read marks was aborted."));
    });
  } finally {
    database.close();
  }
}

async function writeIndexedDbRecord(record: ChapterReadMarksRecord): Promise<ChapterReadMarksRecord> {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(record.key);
      let merged = record;
      request.onsuccess = () => {
        const existing = parseRecord(request.result, record.uid, record.slug);
        merged = {
          ...record,
          chapters: [...new Set([...(existing?.chapters || []), ...record.chapters])],
          fetchedAt: Math.max(existing?.fetchedAt || 0, record.fetchedAt),
          checkedAt: Math.max(existing?.checkedAt || 0, record.checkedAt),
        };
        store.put(merged);
      };
      transaction.oncomplete = () => resolve(merged);
      transaction.onerror = () => reject(transaction.error || request.error || new Error("Could not save chapter read marks."));
      transaction.onabort = () => reject(transaction.error || request.error || new Error("Saving chapter read marks was aborted."));
    });
  } finally {
    database.close();
  }
}

export async function getCachedChapterReadMarks(
  uid: string,
  slug: string,
): Promise<CachedChapterReadMarks | null> {
  const key = cacheKey(uid, slug);
  const localRecord = readLocalRecord(uid, slug);
  let indexedDbRecord: ChapterReadMarksRecord | null = null;
  try {
    indexedDbRecord = await readIndexedDbRecord(uid, slug);
  } catch (error) {
    console.warn("Cached chapter read marks could not be read from IndexedDB.", error);
  }

  const records = [memoryCache.get(key), localRecord, indexedDbRecord]
    .filter((record): record is ChapterReadMarksRecord => record !== undefined && record !== null);
  if (!records.length) return null;

  const merged: ChapterReadMarksRecord = {
    key,
    uid,
    slug,
    chapters: [...new Set(records.flatMap((record) => record.chapters))],
    fetchedAt: Math.max(...records.map((record) => record.fetchedAt)),
    checkedAt: Math.max(...records.map((record) => record.checkedAt)),
  };
  memoryCache.set(key, merged);
  return { chapters: merged.chapters, fetchedAt: merged.fetchedAt, checkedAt: merged.checkedAt };
}

export async function saveCachedChapterReadMarks(
  uid: string,
  slug: string,
  chapters: string[],
  fetchedAt?: number,
  checkedAt?: number,
): Promise<CachedChapterReadMarks> {
  const previous = await getCachedChapterReadMarks(uid, slug);
  const record: ChapterReadMarksRecord = {
    key: cacheKey(uid, slug),
    uid,
    slug,
    chapters: [...new Set([...(previous?.chapters || []), ...chapters])],
    fetchedAt: fetchedAt ?? previous?.fetchedAt ?? 0,
    checkedAt: checkedAt ?? previous?.checkedAt ?? 0,
  };
  try {
    Object.assign(record, await writeIndexedDbRecord(record));
  } catch (error) {
    console.warn("Cached chapter read marks could not be saved to IndexedDB.", error);
  }

  memoryCache.set(record.key, record);
  try {
    window.localStorage.setItem(localStorageKey(uid, slug), JSON.stringify(record));
  } catch (error) {
    console.warn("Cached chapter read marks could not be saved to local storage.", error);
  }

  return { chapters: record.chapters, fetchedAt: record.fetchedAt, checkedAt: record.checkedAt };
}

export async function addCachedChapterReadMark(
  uid: string,
  slug: string,
  chapter: string,
): Promise<{ added: boolean; cache: CachedChapterReadMarks }> {
  const cached = await getCachedChapterReadMarks(uid, slug);
  if (cached?.chapters.includes(chapter)) {
    return { added: false, cache: cached };
  }

  const base: ChapterReadMarksRecord = {
    key: cacheKey(uid, slug),
    uid,
    slug,
    chapters: [...(cached?.chapters || []), chapter],
    fetchedAt: cached?.fetchedAt || 0,
    checkedAt: cached?.checkedAt || 0,
  };
  let added = true;
  let record = base;
  try {
    const database = await openDatabase();
    try {
      const result = await new Promise<{ added: boolean; record: ChapterReadMarksRecord }>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(base.key);
        let current = base;
        let wasAdded = false;
        request.onsuccess = () => {
          const existing = parseRecord(request.result, uid, slug);
          const existingChapters = existing?.chapters || [];
          wasAdded = !existingChapters.includes(chapter);
          current = {
            ...base,
            chapters: [...new Set([...existingChapters, ...base.chapters])],
            fetchedAt: Math.max(existing?.fetchedAt || 0, base.fetchedAt),
            checkedAt: Math.max(existing?.checkedAt || 0, base.checkedAt),
          };
          if (wasAdded) store.put(current);
        };
        transaction.oncomplete = () => resolve({ added: wasAdded, record: current });
        transaction.onerror = () => reject(transaction.error || request.error || new Error("Could not atomically save a chapter read mark."));
        transaction.onabort = () => reject(transaction.error || request.error || new Error("Saving a chapter read mark was aborted."));
      });
      added = result.added;
      record = result.record;
    } finally {
      database.close();
    }
  } catch (error) {
    console.warn("Chapter read mark could not be atomically checked in IndexedDB.", error);
    const latest = await getCachedChapterReadMarks(uid, slug);
    if (latest?.chapters.includes(chapter)) {
      return { added: false, cache: latest };
    }
    record.chapters = [...new Set([...(latest?.chapters || []), chapter])];
  }

  memoryCache.set(record.key, record);
  try {
    window.localStorage.setItem(localStorageKey(uid, slug), JSON.stringify(record));
  } catch (error) {
    console.warn("Cached chapter read marks could not be saved to local storage.", error);
  }
  return {
    added,
    cache: {
      chapters: record.chapters,
      fetchedAt: record.fetchedAt,
      checkedAt: record.checkedAt,
    },
  };
}
