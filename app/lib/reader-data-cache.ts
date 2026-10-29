export type CachedReaderData = {
  kind: "manga";
  id?: string;
  title: string;
  cover: string;
  chapterTitle: string;
  images: string[];
  text: string;
  chapters: string[];
  chapter: string;
  source?: string;
};

const READER_DATA_DATABASE = "mikoroku-reader-data";
const READER_DATA_STORE = "chapters";
const READER_DATA_TTL = 7 * 24 * 60 * 60 * 1000;
const MAX_CACHED_READER_CHAPTERS = 200;

type ReaderDataCacheEntry = {
  key: string;
  time: number;
  data: CachedReaderData;
};

function cacheKey(slug: string, chapter: string): string {
  return `${slug}:${chapter}`;
}

function openReaderDataDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(READER_DATA_DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(READER_DATA_STORE)) {
        request.result.createObjectStore(READER_DATA_STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open the reader data cache."));
    request.onblocked = () => reject(new Error("The reader data cache is blocked by another browser tab."));
  });
}

export async function readCachedReaderData(
  slug: string,
  chapter: string,
): Promise<CachedReaderData | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) return null;
  const database = await openReaderDataDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(READER_DATA_STORE, "readonly");
    const request = transaction.objectStore(READER_DATA_STORE).get(cacheKey(slug, chapter));
    let data: CachedReaderData | null = null;
    request.onsuccess = () => {
      const entry = request.result as ReaderDataCacheEntry | undefined;
      if (!entry || Date.now() - entry.time >= READER_DATA_TTL) return;
      const value = entry.data;
      if (
        value?.kind === "manga" &&
        value.chapter === chapter &&
        Array.isArray(value.images) &&
        value.images.length > 0 &&
        value.images.every((image) => typeof image === "string")
      ) {
        data = value;
      }
    };
    transaction.oncomplete = () => {
      database.close();
      resolve(data);
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? request.error ?? new Error("Could not read the reader data cache."));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? request.error ?? new Error("Reading the reader data cache was aborted."));
    };
  });
}

export async function writeCachedReaderData(
  slug: string,
  data: CachedReaderData,
): Promise<void> {
  if (typeof window === "undefined" || !("indexedDB" in window)) return;
  const database = await openReaderDataDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(READER_DATA_STORE, "readwrite");
    transaction.objectStore(READER_DATA_STORE).put({
      key: cacheKey(slug, data.chapter),
      time: Date.now(),
      data,
    } satisfies ReaderDataCacheEntry);
    const request = transaction.objectStore(READER_DATA_STORE).getAll();
    request.onsuccess = () => {
      const entries = (request.result as ReaderDataCacheEntry[])
        .sort((left, right) => right.time - left.time);
      entries.slice(MAX_CACHED_READER_CHAPTERS).forEach((entry) => {
        transaction.objectStore(READER_DATA_STORE).delete(entry.key);
      });
    };
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Could not save the reader data cache."));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("Saving the reader data cache was aborted."));
    };
  });
}
