/**
 * Helper KV cache untuk data aplikasi (manga list, detail, chapter list, dll).
 * Binding: MIKOROKU_CACHE
 */

// Minimal interface supaya tidak error sebelum wrangler types di-generate
interface KVNamespace {
  get(
    key: string,
    type?: "text" | "json" | "arrayBuffer" | "stream"
  ): Promise<any>;
  put(
    key: string,
    value: string | ArrayBuffer | ArrayBufferView | ReadableStream,
    options?: { expirationTtl?: number; expiration?: number; metadata?: any }
  ): Promise<void>;
  delete(key: string): Promise<void>;
}

function getKv(): KVNamespace | null {
  // Di OpenNext / Cloudflare, binding tersedia via process.env atau global
  // setelah wrangler types di-generate.
  const env = (globalThis as any).env || (process.env as any);
  return (env?.MIKOROKU_CACHE as KVNamespace) || null;
}

export async function kvGet<T = unknown>(
  key: string,
  type: "json" | "text" = "json"
): Promise<T | null> {
  const kv = getKv();
  if (!kv) return null;

  try {
    if (type === "json") {
      return (await kv.get(key, "json")) as T | null;
    }
    return (await kv.get(key, "text")) as T | null;
  } catch {
    return null;
  }
}

export async function kvSet(
  key: string,
  value: unknown,
  ttlSeconds = 3600
): Promise<void> {
  const kv = getKv();
  if (!kv) return;

  const body =
    typeof value === "string" ? value : JSON.stringify(value);

  await kv.put(key, body, {
    expirationTtl: Math.max(60, ttlSeconds),
  });
}

export async function kvDelete(key: string): Promise<void> {
  const kv = getKv();
  if (!kv) return;
  await kv.delete(key);
}

/**
 * Cache-aside helper
 */
export async function withKvCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = await kvGet<T>(key);
  if (cached !== null && cached !== undefined) {
    return cached;
  }

  const fresh = await fetcher();
  // jangan cache null/undefined
  if (fresh !== null && fresh !== undefined) {
    await kvSet(key, fresh, ttlSeconds);
  }
  return fresh;
}

/** Prefixed keys biar rapi */
export const CacheKeys = {
  mangaList: (page = 1) => `manga:list:p${page}`,
  hentaiList: (page = 1) => `hentai:list:p${page}`,
  seriesDetail: (slug: string) => `series:${slug}`,
  chapterList: (slug: string) => `chapters:${slug}`,
  genreList: () => `genres:all`,
  home: () => `home:latest`,
} as const;
