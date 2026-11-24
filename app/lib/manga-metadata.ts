export type MangaMetadataPayload = Record<string, unknown> & {
  exportedAtMs: number;
  manga: Record<string, unknown>[];
};

export const MANGA_METADATA_UPDATED_EVENT = "mikoroku:manga-metadata-updated";
export const MANGA_METADATA_CACHE_UPDATED_EVENT = "mikoroku:manga-metadata-cache-updated";
export const MANGA_METADATA_UPDATED_STORAGE_KEY = "mikoroku_manga_metadata_updated_at";

type FetchMangaMetadataOptions = {
  signal?: AbortSignal;
  force?: boolean;
};

const MANGA_METADATA_URL = "/catalog/metadata.json";
const SHARED_MANGA_METADATA_URL = "/api/catalog/metadata";
export const MANGA_METADATA_SOURCE_PATH = ["meta", "mangaMetadataCatalog"] as const;
const FIRESTORE_METADATA_MEMORY_TTL = 60 * 1000;
const MANGA_METADATA_CACHE_DB = "mikoroku-manga-metadata-cache";
const MANGA_METADATA_CACHE_STORE = "payloads";
const MANGA_METADATA_CACHE_KEY = "active";
const DEVELOPMENT_MANGA_CATALOG_SOURCE_KEY = "mikoroku_dev_manga_catalog_source";
const MANGA_CATALOG_SOURCE_STORAGE_KEY = "mikoroku_manga_catalog_source_mode";
const MANGA_METADATA_REVALIDATE_AFTER = 10 * 60 * 1000;
const MANGA_CATALOG_SOURCE_CACHE_TTL = 5 * 60 * 1000;
type MangaCatalogSourceMode = "effective" | "baseline";

type CachedMangaMetadataPayload = {
  key: string;
  cachedAt: number;
  payload: MangaMetadataPayload;
};

let firestoreMetadataCache: {
  payload: MangaMetadataPayload;
  loadedAt: number;
} | null = null;
let mangaMetadataCache: CachedMangaMetadataPayload | null = null;
let mangaMetadataDatabase: Promise<IDBDatabase> | null = null;
let mangaMetadataRefresh: Promise<void> | null = null;
let mangaMetadataPayloadRequest: Promise<MangaMetadataPayload> | null = null;
let mangaCatalogSourceRequest: Promise<MangaCatalogSourceMode | null> | null = null;
let mangaMetadataCacheGeneration = 0;
let mangaCatalogSourceCache: {
  mode: MangaCatalogSourceMode;
  checkedAt: number;
} | null = null;

function getDevelopmentMangaCatalogSourceMode(): MangaCatalogSourceMode | null {
  if (process.env.NODE_ENV !== "development" || typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(DEVELOPMENT_MANGA_CATALOG_SOURCE_KEY) === "baseline"
      ? "baseline"
      : "effective";
  } catch (error) {
    console.warn("Local catalog source preference could not be read.", error);
    return "effective";
  }
}

export function setDevelopmentMangaCatalogSourceMode(mode: MangaCatalogSourceMode): void {
  if (process.env.NODE_ENV !== "development" || typeof window === "undefined") {
    throw new Error("Local catalog source selection is only available in development.");
  }
  try {
    window.localStorage.setItem(DEVELOPMENT_MANGA_CATALOG_SOURCE_KEY, mode);
    mangaCatalogSourceCache = { mode, checkedAt: Date.now() };
  } catch (error) {
    console.warn("Local catalog source preference could not be saved.", error);
    throw error;
  }
}

function openMangaMetadataCache(): Promise<IDBDatabase> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.reject(new Error("IndexedDB is unavailable in this browser."));
  }
  if (mangaMetadataDatabase) return mangaMetadataDatabase;

  const databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(MANGA_METADATA_CACHE_DB, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(MANGA_METADATA_CACHE_STORE)) {
        request.result.createObjectStore(MANGA_METADATA_CACHE_STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => {
        request.result.close();
        mangaMetadataDatabase = null;
      };
      resolve(request.result);
    };
    request.onerror = () => reject(request.error ?? new Error("Could not open manga metadata cache."));
    request.onblocked = () => reject(new Error("Manga metadata cache is blocked by another browser tab."));
  }).catch((error: unknown) => {
    mangaMetadataDatabase = null;
    throw error;
  });
  mangaMetadataDatabase = databasePromise;
  return databasePromise;
}

async function readMangaMetadataCache(): Promise<CachedMangaMetadataPayload | null> {
  if (mangaMetadataCache) return mangaMetadataCache;
  if (typeof window === "undefined" || !("indexedDB" in window)) return null;

  const database = await openMangaMetadataCache();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(MANGA_METADATA_CACHE_STORE, "readonly");
    const request = transaction.objectStore(MANGA_METADATA_CACHE_STORE).get(MANGA_METADATA_CACHE_KEY);
    let cached: CachedMangaMetadataPayload | null = null;
    request.onsuccess = () => {
      const entry = request.result as CachedMangaMetadataPayload | undefined;
      if (!entry?.payload || typeof entry.cachedAt !== "number") return;
      try {
        cached = {
          key: MANGA_METADATA_CACHE_KEY,
          cachedAt: entry.cachedAt,
          payload: parseMangaMetadataPayload(entry.payload),
        };
        mangaMetadataCache = cached;
      } catch (error) {
        console.warn("Cached manga metadata is invalid and will be ignored.", error);
      }
    };
    request.onerror = () => transaction.abort();
    transaction.oncomplete = () => resolve(cached);
    transaction.onerror = () => reject(transaction.error ?? request.error ?? new Error("Could not read manga metadata cache."));
    transaction.onabort = () => reject(transaction.error ?? request.error ?? new Error("Reading manga metadata cache was aborted."));
  });
}

async function writeMangaMetadataCache(payload: MangaMetadataPayload): Promise<void> {
  const entry: CachedMangaMetadataPayload = {
    key: MANGA_METADATA_CACHE_KEY,
    cachedAt: Date.now(),
    payload,
  };
  mangaMetadataCache = entry;
  if (typeof window === "undefined" || !("indexedDB" in window)) return;

  const database = await openMangaMetadataCache();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(MANGA_METADATA_CACHE_STORE, "readwrite");
    transaction.objectStore(MANGA_METADATA_CACHE_STORE).put(entry);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not save manga metadata cache."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Saving manga metadata cache was aborted."));
  });
}

export async function readCachedMangaMetadataPayload(): Promise<MangaMetadataPayload | null> {
  return (await readMangaMetadataCache())?.payload || null;
}

export async function clearMangaMetadataCache(): Promise<void> {
  mangaMetadataCache = null;
  mangaCatalogSourceCache = null;
  mangaMetadataCacheGeneration += 1;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(MANGA_CATALOG_SOURCE_STORAGE_KEY);
    } catch (error) {
      console.warn("Catalog source cache could not be cleared from browser storage.", error);
    }
  }
  if (typeof window === "undefined" || !("indexedDB" in window)) return;

  const database = await openMangaMetadataCache();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(MANGA_METADATA_CACHE_STORE, "readwrite");
    transaction.objectStore(MANGA_METADATA_CACHE_STORE).clear();
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not clear manga metadata cache."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Clearing manga metadata cache was aborted."));
  });
}

export function notifyMangaMetadataUpdated(): void {
  firestoreMetadataCache = null;
  mangaMetadataCache = null;
  mangaCatalogSourceCache = null;
  mangaMetadataCacheGeneration += 1;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(MANGA_CATALOG_SOURCE_STORAGE_KEY);
    window.localStorage.setItem(MANGA_METADATA_UPDATED_STORAGE_KEY, String(Date.now()));
  } catch (error) {
    console.warn("Manga metadata cache invalidation could not be shared across tabs.", error);
  }
  window.dispatchEvent(new Event(MANGA_METADATA_UPDATED_EVENT));
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== MANGA_METADATA_UPDATED_STORAGE_KEY) return;
    firestoreMetadataCache = null;
    mangaMetadataCache = null;
    mangaCatalogSourceCache = null;
    try {
      window.localStorage.removeItem(MANGA_CATALOG_SOURCE_STORAGE_KEY);
    } catch (error) {
      console.warn("Catalog source cache could not be invalidated in this tab.", error);
    }
    mangaMetadataCacheGeneration += 1;
    window.dispatchEvent(new Event(MANGA_METADATA_UPDATED_EVENT));
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseMangaMetadataPayload(value: unknown): MangaMetadataPayload {
  if (
    !isRecord(value) ||
    typeof value.exportedAtMs !== "number" ||
    !Number.isFinite(value.exportedAtMs) ||
    !Array.isArray(value.manga)
  ) {
    throw new Error("Manga metadata response has an invalid format.");
  }

  const exportedAtMs = value.exportedAtMs;
  return {
    ...value,
    exportedAtMs,
    manga: value.manga.filter(isRecord),
  };
}

export async function fetchMangaCatalogSourceMode(
  signal?: AbortSignal,
  force = false,
): Promise<MangaCatalogSourceMode | null> {
  const developmentMode = getDevelopmentMangaCatalogSourceMode();
  if (developmentMode) return developmentMode;
  if (
    !force &&
    mangaCatalogSourceCache &&
    Date.now() - mangaCatalogSourceCache.checkedAt < MANGA_CATALOG_SOURCE_CACHE_TTL
  ) {
    return mangaCatalogSourceCache.mode;
  }
  if (!force && typeof window !== "undefined") {
    try {
      const cached = window.localStorage.getItem(MANGA_CATALOG_SOURCE_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as {
          mode?: unknown;
          checkedAt?: unknown;
        };
        if (
          (parsed.mode === "effective" || parsed.mode === "baseline") &&
          typeof parsed.checkedAt === "number" &&
          Date.now() - parsed.checkedAt >= 0 &&
          Date.now() - parsed.checkedAt < MANGA_CATALOG_SOURCE_CACHE_TTL
        ) {
          mangaCatalogSourceCache = { mode: parsed.mode, checkedAt: parsed.checkedAt };
          return parsed.mode;
        }
      }
    } catch (error) {
      console.warn("Cached manga catalog source mode is invalid and will be ignored.", error);
    }
  }
  if (!force && mangaCatalogSourceRequest) {
    return mangaCatalogSourceRequest;
  }

  const request = (async () => {
    if (signal?.aborted) throw new DOMException("The operation was aborted.", "AbortError");
    const response = await fetch("/api/catalog/source", {
      signal: force ? signal : undefined,
      cache: "no-store",
    });
    if (response.status === 404 || response.status === 405) return null;
    if (!response.ok) {
      throw new Error(`Catalog source endpoint returned HTTP ${response.status}.`);
    }
    const result = await response.json() as { sourceMode?: unknown };
    if (result.sourceMode !== "effective" && result.sourceMode !== "baseline") {
      throw new Error("Catalog source endpoint returned an invalid source mode.");
    }
    const checkedAt = Date.now();
    mangaCatalogSourceCache = { mode: result.sourceMode, checkedAt };
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          MANGA_CATALOG_SOURCE_STORAGE_KEY,
          JSON.stringify({ mode: result.sourceMode, checkedAt }),
        );
      } catch (error) {
        console.warn("Manga catalog source mode could not be cached in browser storage.", error);
      }
    }
    return result.sourceMode;
  })();

  if (!force) {
    mangaCatalogSourceRequest = request;
    void request.finally(() => {
      if (mangaCatalogSourceRequest === request) mangaCatalogSourceRequest = null;
    }).catch(() => undefined);
  }
  return request;
}

async function fetchFirestoreMetadataPayload(
  force: boolean,
): Promise<MangaMetadataPayload | null> {
  if (typeof window === "undefined") return null;
  if (
    !force &&
    firestoreMetadataCache &&
    Date.now() - firestoreMetadataCache.loadedAt < FIRESTORE_METADATA_MEMORY_TTL
  ) {
    return firestoreMetadataCache.payload;
  }

  let documentData: Record<string, unknown> | null;
  try {
    const { firestore } = (await import("./firebase-client")).initializeFirebaseClient();
    const { doc, getDoc, getDocFromServer } = await import("firebase/firestore");
    const sourceRef = doc(firestore, ...MANGA_METADATA_SOURCE_PATH);
    const snapshot = force
      ? await getDocFromServer(sourceRef)
      : await getDoc(sourceRef);
    documentData = snapshot.exists() ? snapshot.data() : null;
  } catch (error) {
    console.warn("Admin-managed manga metadata could not be loaded; using the catalog backup.", error);
    return null;
  }

  if (!documentData) return null;
  if (typeof documentData.content !== "string") {
    throw new Error("Admin-managed manga metadata is missing its JSON content.");
  }

  const payload = parseMangaMetadataPayload(JSON.parse(documentData.content));
  firestoreMetadataCache = { payload, loadedAt: Date.now() };
  return payload;
}

export function fetchMangaMetadataPayload(
  options: FetchMangaMetadataOptions = {},
): Promise<MangaMetadataPayload> {
  const canShareRequest = !options.force && !options.signal;
  if (canShareRequest && mangaMetadataPayloadRequest) {
    return mangaMetadataPayloadRequest;
  }

  const request = loadMangaMetadataPayload(options);
  if (!canShareRequest) return request;

  mangaMetadataPayloadRequest = request;
  void request.finally(() => {
    if (mangaMetadataPayloadRequest === request) mangaMetadataPayloadRequest = null;
  }).catch(() => undefined);
  return request;
}

async function loadMangaMetadataPayload({
  signal,
  force = false,
}: FetchMangaMetadataOptions): Promise<MangaMetadataPayload> {
  if (signal?.aborted) {
    throw new DOMException("The operation was aborted.", "AbortError");
  }

  // IDB is the first-paint source. It must not wait for Worker/KV or source
  // configuration requests, especially when the network is unavailable.
  if (!force) {
    try {
      const cached = await readMangaMetadataCache();
      if (signal?.aborted) {
        throw new DOMException("The operation was aborted.", "AbortError");
      }
      if (cached) {
        if (Date.now() - cached.cachedAt >= MANGA_METADATA_REVALIDATE_AFTER) {
          refreshMangaMetadataInBackground(cached);
        }
        return cached.payload;
      }
    } catch (error) {
      if (signal?.aborted || (error instanceof DOMException && error.name === "AbortError")) {
        throw error;
      }
      console.warn("IndexedDB manga metadata cache could not be read; loading shared catalog.", error);
    }
  }

  const payload = await fetchLatestMangaMetadataPayload({ signal, force });
  try {
    await writeMangaMetadataCache(payload);
  } catch (error) {
    console.warn("Manga metadata loaded, but its IndexedDB cache could not be saved.", error);
  }
  return payload;
}

function payloadChanged(
  previous: MangaMetadataPayload,
  next: MangaMetadataPayload,
): boolean {
  return previous.catalogSourceMode !== next.catalogSourceMode ||
    previous.firestoreDeltasIncluded !== next.firestoreDeltasIncluded ||
    previous.exportedAtMs !== next.exportedAtMs ||
    JSON.stringify(previous.manga) !== JSON.stringify(next.manga);
}

function refreshMangaMetadataInBackground(cached: CachedMangaMetadataPayload): void {
  if (mangaMetadataRefresh) return;
  const cacheGeneration = mangaMetadataCacheGeneration;
  const refresh = (async () => {
    const payload = await fetchLatestMangaMetadataPayload();
    if (cacheGeneration !== mangaMetadataCacheGeneration) return;
    const changed = payloadChanged(cached.payload, payload);
    await writeMangaMetadataCache(payload);
    if (changed && typeof window !== "undefined") {
      window.dispatchEvent(new Event(MANGA_METADATA_CACHE_UPDATED_EVENT));
    }
  })();
  mangaMetadataRefresh = refresh;
  void refresh.catch((error: unknown) => {
    console.warn("Background manga metadata refresh failed; continuing with the cached catalog.", error);
  }).finally(() => {
    if (mangaMetadataRefresh === refresh) mangaMetadataRefresh = null;
  });
}

async function fetchLatestMangaMetadataPayload({
  signal,
  force = false,
}: FetchMangaMetadataOptions = {}): Promise<MangaMetadataPayload> {
  if (signal?.aborted) {
    throw new DOMException("The operation was aborted.", "AbortError");
  }

  let useFirestoreFallback = false;
  try {
    const response = await fetch(SHARED_MANGA_METADATA_URL, {
      signal,
      cache: force ? "no-store" : "default",
    });
    if (response.ok) {
      const payload: unknown = await response.json();
      return parseMangaMetadataPayload(payload);
    }
    useFirestoreFallback =
      process.env.NODE_ENV !== "production" &&
      (response.status === 404 || response.status === 405);
    if (!useFirestoreFallback) {
      console.warn(`Shared manga metadata cache returned HTTP ${response.status}; trying metadata.json.`);
    }
  } catch (error) {
    if (signal?.aborted || (error instanceof DOMException && error.name === "AbortError")) {
      throw error;
    }
    console.warn("Shared manga metadata cache is unavailable; trying metadata.json.", error);
  }

  let staticError: unknown;
  try {
    const url = force ? `${MANGA_METADATA_URL}?t=${Date.now()}` : MANGA_METADATA_URL;
    const response = await fetch(url, { signal, cache: force ? "no-store" : "default" });
    if (response.ok) {
      const payload: unknown = await response.json();
      const parsed = parseMangaMetadataPayload(payload);
      return {
        ...parsed,
        catalogSourceMode: (await fetchMangaCatalogSourceMode(signal, force)) || "effective",
        firestoreDeltasIncluded: false,
      };
    }
    throw new Error(`metadata.json returned HTTP ${response.status}.`);
  } catch (error) {
    if (signal?.aborted || (error instanceof DOMException && error.name === "AbortError")) {
      throw error;
    }
    staticError = error;
    console.warn("Primary manga metadata.json could not be loaded; trying the shared catalog.", error);
  }
  if (signal?.aborted) {
    throw new DOMException("The operation was aborted.", "AbortError");
  }

  if (useFirestoreFallback) {
    const firestorePayload = await fetchFirestoreMetadataPayload(force);
    if (signal?.aborted) {
      throw new DOMException("The operation was aborted.", "AbortError");
    }
    if (firestorePayload) return firestorePayload;
  }
  if (staticError instanceof Error) {
    throw new Error(`metadata.json and the shared catalog are unavailable: ${staticError.message}`);
  }
  throw new Error("metadata.json and the shared catalog are unavailable.");
}
