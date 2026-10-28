"use client";

import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";
import { imageProxyUrl, type ImageProxyPreset } from "../../lib/image-proxy";

const COVER_CACHE_DB = "mikoroku-cover-cache";
const COVER_CACHE_STORE = "covers";
const MAX_CACHED_COVERS = 500;
const GITHUB_RAW = "https://raw.githubusercontent.com/moemaomao/mymangadata/main/";
const pendingCoverRequests = new Map<string, Promise<Blob>>();

type CachedCover = {
  url: string;
  blob: Blob;
  lastUsedAt: number;
};

function resolveCoverSource(source: string): string {
  const trimmedSource = source.trim();
  if (!trimmedSource || trimmedSource === "-") return "";
  return trimmedSource.startsWith("//")
    ? `https:${trimmedSource}`
    : /^https?:\/\//i.test(trimmedSource) ||
      trimmedSource.startsWith("/") ||
      /^(data|blob):/i.test(trimmedSource)
      ? trimmedSource
      : GITHUB_RAW + trimmedSource.replace(/^\//, "");
}

function getOptimizedCoverUrl(source: string, preset: ImageProxyPreset): string {
  const resolvedSource = resolveCoverSource(source);
  if (!resolvedSource) return "";
  if (resolvedSource.startsWith("/") || /^(data|blob):/i.test(resolvedSource)) {
    return resolvedSource;
  }

  return imageProxyUrl(resolvedSource, preset);
}

function openCoverCache(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(COVER_CACHE_DB, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(COVER_CACHE_STORE)) {
        const store = database.createObjectStore(COVER_CACHE_STORE, { keyPath: "url" });
        store.createIndex("lastUsedAt", "lastUsedAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open the cover image cache."));
  });
}

export async function getCoverImageCacheBytes(): Promise<number> {
  if (!("indexedDB" in window)) return 0;
  const database = await openCoverCache();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(COVER_CACHE_STORE, "readonly");
    const request = transaction.objectStore(COVER_CACHE_STORE).openCursor();
    let bytes = 0;
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      const record = cursor.value as CachedCover;
      bytes += record.blob?.size || 0;
      cursor.continue();
    };
    transaction.oncomplete = () => {
      database.close();
      resolve(bytes);
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Could not estimate the cover image cache."));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("Estimating the cover image cache was aborted."));
    };
  });
}

export async function clearCoverImageCache(): Promise<void> {
  if (!("indexedDB" in window)) return;
  const database = await openCoverCache();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(COVER_CACHE_STORE, "readwrite");
    transaction.objectStore(COVER_CACHE_STORE).clear();
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Could not clear the cover image cache."));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("Clearing the cover image cache was aborted."));
    };
  });
}

async function getCachedCover(url: string): Promise<Blob | null> {
  const database = await openCoverCache();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(COVER_CACHE_STORE, "readwrite");
    const store = transaction.objectStore(COVER_CACHE_STORE);
    const request = store.get(url);
    let blob: Blob | null = null;
    request.onsuccess = () => {
      const record = request.result as CachedCover | undefined;
      if (!record) {
        return;
      }
      record.lastUsedAt = Date.now();
      store.put(record);
      blob = record.blob;
    };
    request.onerror = () => {
      database.close();
      reject(request.error ?? new Error("Could not read the cover image cache."));
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Could not read the cover image cache."));
    };
    transaction.oncomplete = () => {
      database.close();
      resolve(blob);
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("The cover image cache read was aborted."));
    };
  });
}

async function trimCoverCache(database: IDBDatabase): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(COVER_CACHE_STORE, "readwrite");
    const store = transaction.objectStore(COVER_CACHE_STORE);
    const countRequest = store.count();
    countRequest.onsuccess = () => {
      let excess = countRequest.result - MAX_CACHED_COVERS;
      if (excess <= 0) return;
      const cursorRequest = store.index("lastUsedAt").openCursor();
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor || excess <= 0) return;
        cursor.delete();
        excess -= 1;
        cursor.continue();
      };
    };
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not trim the cover image cache."));
    transaction.onabort = () => reject(transaction.error ?? new Error("The cover image cache trim was aborted."));
  });
}

async function cacheCover(url: string, blob: Blob): Promise<void> {
  const database = await openCoverCache();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(COVER_CACHE_STORE, "readwrite");
      transaction.objectStore(COVER_CACHE_STORE).put({ url, blob, lastUsedAt: Date.now() } satisfies CachedCover);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Could not save the cover image cache."));
      transaction.onabort = () => reject(transaction.error ?? new Error("The cover image cache write was aborted."));
    });
    await trimCoverCache(database);
  } finally {
    database.close();
  }
}

async function fetchCover(url: string): Promise<Blob> {
  const cached = await getCachedCover(url).catch((error: unknown) => {
    console.warn("Could not read the cover image from IndexedDB; fetching it from the image service.", error);
    return null;
  });
  if (cached) return cached;

  const response = await fetch(url, { mode: "cors", credentials: "omit" });
  if (!response.ok) throw new Error(`Cover image request failed with HTTP ${response.status}.`);
  const blob = await response.blob();
  if (!blob.type.startsWith("image/")) throw new Error("The image service returned a non-image response.");

  await cacheCover(url, blob).catch((error: unknown) => {
    console.warn("Could not save the cover image to IndexedDB.", error);
  });
  return blob;
}

function loadCover(url: string): Promise<Blob> {
  const pending = pendingCoverRequests.get(url);
  if (pending) return pending;

  const request = fetchCover(url).finally(() => pendingCoverRequests.delete(url));
  pendingCoverRequests.set(url, request);
  return request;
}

export function useCoverImageSource(source: string, preset: ImageProxyPreset = "cover", enabled = true): string {
  const sourceKey = `${source}\u0000${preset}\u0000${enabled}`;
  const [resolved, setResolved] = useState<{ key: string; source: string }>({ key: "", source: "" });

  useEffect(() => {
    if (!source) {
      setResolved({ key: sourceKey, source: "" });
      return;
    }

    const optimizedUrl = getOptimizedCoverUrl(source, preset);
    if (optimizedUrl === source || !/^https?:\/\//i.test(optimizedUrl) || !enabled) {
      setResolved({ key: sourceKey, source: enabled ? optimizedUrl : "" });
      return;
    }

    let active = true;
    let objectUrl = "";
    setResolved({ key: sourceKey, source: "" });

    if (!("indexedDB" in window)) {
      setResolved({ key: sourceKey, source: optimizedUrl });
      return;
    }

    void loadCover(optimizedUrl).then((blob) => {
      if (!active) return;
      objectUrl = URL.createObjectURL(blob);
      setResolved({ key: sourceKey, source: objectUrl });
    }).catch((error: unknown) => {
      console.warn("Could not cache the optimized cover image; loading its proxy URL directly.", error);
      if (active) setResolved({ key: sourceKey, source: optimizedUrl });
    });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [enabled, source, sourceKey, preset]);

  return resolved.key === sourceKey ? resolved.source : "";
}

type CoverImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string;
  optimizePreset?: ImageProxyPreset;
};

export function CoverImage({
  src,
  optimizePreset = "cover",
  loading = "lazy",
  onError,
  ...props
}: CoverImageProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [visible, setVisible] = useState(loading !== "lazy");
  const resolvedSource = useCoverImageSource(src, optimizePreset, visible);
  const fallbackKey = `${src}\u0000${optimizePreset}`;
  const [fallback, setFallback] = useState<{ key: string; enabled: boolean }>({
    key: "",
    enabled: false,
  });
  const originalSource = resolveCoverSource(src);
  const fallbackEnabled = fallback.key === fallbackKey && fallback.enabled;
  const displaySource = fallbackEnabled ? originalSource : resolvedSource;

  useEffect(() => {
    if (loading !== "lazy" || visible || !imageRef.current) return;
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "300px" });

    observer.observe(imageRef.current);
    return () => observer.disconnect();
  }, [loading, visible]);

  return (
    <img
      {...props}
      ref={imageRef}
      loading={loading}
      src={displaySource || undefined}
      onError={(event) => {
        if (displaySource && displaySource !== originalSource && !fallbackEnabled) {
          setFallback({ key: fallbackKey, enabled: true });
          return;
        }
        onError?.(event);
      }}
    />
  );
}
