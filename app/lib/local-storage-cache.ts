const CACHE_KEYS = new Set([
  "adminMangaCatalogCache_v4",
  "currentChapter",
  "currentManga",
  "mangaMetadataCache_v2",
  "mangaMetadataLightCache_v2",
  "manga_cache_v1",
  "manga_cache_v5",
  "manga_metadata_cache_v2",
  "mangaFsMetaCache",
  "mangaGithubCache",
  "mangaGithubLightCache",
  "mikoroku_firestore_metadata_v1",
  "mk_hero_v2",
]);

const CACHE_PREFIXES = [
  "chapters_",
  "detail_",
  "manga_cache_",
  "mangaGithub",
  "mangaFsMeta",
  "mk_hero_",
  "mk_rec_sidebar_metadata_",
];

type CacheEntry = {
  key: string;
  time: number;
  size: number;
};

function isRebuildableCache(key: string): boolean {
  return CACHE_KEYS.has(key) || CACHE_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function cacheTimestamp(value: string): number {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return 0;
    const record = parsed as Record<string, unknown>;
    for (const candidate of [record.time, record.updatedAt, record.savedAt]) {
      if (typeof candidate === "number" && Number.isFinite(candidate)) return candidate;
    }
  } catch {
    return 0;
  }
  return 0;
}

function isQuotaError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const record = error as { name?: unknown; code?: unknown };
  return record.name === "QuotaExceededError" ||
    record.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    record.code === 22 ||
    record.code === 1014;
}

function oldestRebuildableCaches(): CacheEntry[] {
  const entries: CacheEntry[] = [];
  for (const key of Object.keys(localStorage)) {
    if (!isRebuildableCache(key)) continue;
    const value = localStorage.getItem(key) || "";
    entries.push({ key, time: cacheTimestamp(value), size: value.length * 2 });
  }
  return entries.sort((left, right) =>
    left.time - right.time || right.size - left.size,
  );
}

function trySetItem(key: string, value: string): "ok" | "quota" | "error" {
  try {
    window.localStorage.setItem(key, value);
    return "ok";
  } catch (error) {
    if (isQuotaError(error)) return "quota";
    console.warn(`Browser cache "${key}" could not be saved.`, error);
    return "error";
  }
}

function reclaimQuotaAndSet(key: string, value: string): boolean {
  let removed = 0;
  try {
    for (const entry of oldestRebuildableCaches()) {
      try {
        window.localStorage.removeItem(entry.key);
        removed += 1;
      } catch (error) {
        console.warn(`Old browser cache "${entry.key}" could not be removed.`, error);
        continue;
      }

      const result = trySetItem(key, value);
      if (result === "ok") {
        console.warn(`Browser storage was full; removed ${removed} old rebuildable cache(s).`);
        return true;
      }
      if (result === "error") return false;
    }
  } catch (error) {
    console.warn("Old browser caches could not be inspected for cleanup.", error);
    return false;
  }

  console.warn(
    `Browser cache "${key}" could not be saved; storage is still full after removing ${removed} rebuildable cache(s).`,
  );
  return false;
}

/**
 * Fast localStorage write. Quota cleanup runs deferred so click/navigation
 * is not blocked on main-thread scans of every cache key.
 */
export function setLocalStorageCacheItem(key: string, value: string): boolean {
  if (typeof window === "undefined") return false;

  const result = trySetItem(key, value);
  if (result === "ok") return true;
  if (result === "error") return false;

  // Quota exceeded: defer heavy cleanup so UI click stays snappy.
  const run = () => {
    reclaimQuotaAndSet(key, value);
  };
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(run, { timeout: 800 });
  } else {
    window.setTimeout(run, 0);
  }
  return false;
}

/** Synchronous write used when the value must be available before navigation. */
export function setLocalStorageCacheItemSync(key: string, value: string): boolean {
  if (typeof window === "undefined") return false;
  const result = trySetItem(key, value);
  if (result === "ok") return true;
  if (result === "error") return false;
  return reclaimQuotaAndSet(key, value);
}
