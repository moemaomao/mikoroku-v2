"use client";

import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";

const COVER_CACHE_DB = "mikoroku-cover-cache";
const COVER_CACHE_STORE = "covers";
const MAX_CACHED_COVERS = 500;
const WESERV_ENDPOINT = "https://images.weserv.nl/";
const pendingCoverRequests = new Map<string, Promise<Blob>>();

type CachedCover = {
  url: string;
  blob: Blob;
  lastUsedAt: number;
};

function getOptimizedCoverUrl(source: string, width: number): string {
  if (!source || source.startsWith("/") || /^(data|blob):/i.test(source)) return source;

  try {
    let originalUrl = new URL(source);
    let requestedWidth = width;
    let quality = 72;

    if (originalUrl.hostname === "images.weserv.nl") {
      const proxyParameters = originalUrl.searchParams;
      const original = proxyParameters.get("url");
      if (!original) return source;
      originalUrl = new URL(original);
      const existingWidth = Number(proxyParameters.get("w"));
      const existingQuality = Number(proxyParameters.get("q"));
      if (existingWidth > 0) requestedWidth = Math.min(width, existingWidth);
      if (existingQuality > 0) quality = Math.min(quality, existingQuality);
    }

    if (!["http:", "https:"].includes(originalUrl.protocol)) return source;

    const optimized = new URL(WESERV_ENDPOINT);
    optimized.searchParams.set("url", originalUrl.toString());
    optimized.searchParams.set("w", String(requestedWidth));
    optimized.searchParams.set("q", String(quality));
    optimized.searchParams.set("output", "webp");
    return optimized.toString();
  } catch {
    return source;
  }
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

async function getCachedCover(url: string): Promise<Blob | null> {
  const database = await openCoverCache();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(COVER_CACHE_STORE, "readwrite");
    const store = transaction.objectStore(COVER_CACHE_STORE);
    const request = store.get(url);
    request.onsuccess = () => {
      const record = request.result as CachedCover | undefined;
      if (!record) {
        resolve(null);
        return;
      }
      record.lastUsedAt = Date.now();
      store.put(record);
      resolve(record.blob);
    };
    request.onerror = () => reject(request.error ?? new Error("Could not read the cover image cache."));
    transaction.onabort = () => reject(transaction.error ?? new Error("The cover image cache read was aborted."));
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
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(COVER_CACHE_STORE, "readwrite");
    transaction.objectStore(COVER_CACHE_STORE).put({ url, blob, lastUsedAt: Date.now() } satisfies CachedCover);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not save the cover image cache."));
    transaction.onabort = () => reject(transaction.error ?? new Error("The cover image cache write was aborted."));
  });
  await trimCoverCache(database);
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

export function useCoverImageSource(source: string, width = 400, enabled = true): string {
  const [resolvedSource, setResolvedSource] = useState("");

  useEffect(() => {
    if (!source) {
      setResolvedSource("");
      return;
    }

    const optimizedUrl = getOptimizedCoverUrl(source, width);
    if (optimizedUrl === source || !/^https?:\/\//i.test(optimizedUrl) || !enabled) {
      setResolvedSource(enabled ? optimizedUrl : "");
      return;
    }

    let active = true;
    let objectUrl = "";
    setResolvedSource("");

    if (!("indexedDB" in window)) {
      setResolvedSource(source);
      return;
    }

    void loadCover(optimizedUrl).then((blob) => {
      if (!active) return;
      objectUrl = URL.createObjectURL(blob);
      setResolvedSource(objectUrl);
    }).catch((error: unknown) => {
      console.warn("Could not load the optimized cover image; using the original cover URL.", error);
      if (active) setResolvedSource(source);
    });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [enabled, source, width]);

  return resolvedSource || (enabled ? source : "");
}

type CoverImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string;
  optimizeWidth?: number;
};

export function CoverImage({ src, optimizeWidth = 400, loading = "lazy", ...props }: CoverImageProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [visible, setVisible] = useState(loading !== "lazy");
  const resolvedSource = useCoverImageSource(src, optimizeWidth, visible);

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

  return <img {...props} ref={imageRef} loading={loading} src={resolvedSource || undefined} />;
}
