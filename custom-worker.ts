// @ts-nocheck
import { default as handler } from "./.open-next/worker.js";
import { firebaseConfig } from "./lib/firebase-config";

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

interface KVNamespace {
  get(
    key: string,
    options?:
      | { type?: "text" | "json" | "arrayBuffer" | "stream" }
      | "text"
      | "json"
      | "arrayBuffer"
      | "stream",
  ): Promise<any>;
  put(
    key: string,
    value: string | ArrayBuffer | ArrayBufferView | ReadableStream,
    options?: { expirationTtl?: number; expiration?: number; metadata?: any },
  ): Promise<void>;
  delete(key: string): Promise<void>;
}

interface CloudflareEnv {
  ASSETS?: {
    fetch(request: Request): Promise<Response>;
  };

  MIKOROKU_V2_CACHE?: KVNamespace;
  MIKOROKU_CACHE?: KVNamespace;
  NEXT_INC_CACHE_KV?: KVNamespace;
  FIREBASE_CLIENT_EMAIL?: string;
  FIREBASE_PRIVATE_KEY?: string;
  [key: string]: unknown;
}

const BLOGGER_DOMAINS = {
  blogger: "https://www.mikodrive.my.id",
  blogger2: "https://www.yomidays.my.id",
} as const;

const BLOGGER_CHAPTERS_TTL = 5 * 60;
const BLOGGER_CHAPTERS_STALE_TTL = 24 * 60 * 60;
const BLOGGER_CHAPTERS_BROWSER_MAX_AGE = 5 * 60;
const UPSTREAM_TIMEOUT_MS = 8_000;
const MANGA_CATALOG_CACHE_KEY = "catalog:metadata:manga:v5";
const MANGA_CATALOG_FEED_CACHE_KEY = "catalog:metadata:manga:feed:v1";
const MANGA_CATALOG_SOURCE_KEY = "catalog:metadata:manga:source:v1";
const MANGA_CATALOG_CACHE_TTL = 24 * 60 * 60;
const MANGA_CATALOG_FRESH_TTL = 10 * 60 * 1000;
const MANGA_CATALOG_FEED_FRESH_TTL = 5 * 60 * 1000;
const MANGA_CATALOG_URL = "/catalog/metadata.json";
const MANGA_DETAIL_CACHE_TTL = 7 * 24 * 60 * 60;
const MANGA_DETAIL_FRESH_TTL = 10 * 60 * 1000;
const MANGA_DETAIL_CACHE_CONTROL =
  "public, max-age=60, s-maxage=600, stale-while-revalidate=3600";
const FIREBASE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const FIRESTORE_DOCUMENTS_URL =
  "https://firestore.googleapis.com/v1/projects/mikoroku/databases/(default)/documents";

type FirebaseAccessToken = {
  clientEmail: string;
  token: string;
  expiresAt: number;
};
type MangaCatalogSourceMode = "effective" | "baseline";

let firebaseAccessToken: FirebaseAccessToken | null = null;
let firebaseAccessTokenPromise: Promise<string> | null = null;

function getCacheKv(env: CloudflareEnv): KVNamespace | undefined {
  return env.MIKOROKU_V2_CACHE || env.MIKOROKU_CACHE;
}

async function fetchUpstream(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function isSocialCrawler(request: Request): boolean {
  return /discordbot|facebookexternalhit|twitterbot|slackbot|telegrambot|whatsapp|opengraph/i
    .test(request.headers.get("user-agent") || "");
}

function isAutomatedCrawler(request: Request): boolean {
  return isSocialCrawler(request) ||
    /bot|crawler|spider|slurp|preview/i
      .test(request.headers.get("user-agent") || "");
}

function isSharePage(pathname: string): boolean {
  return /^\/(?:series\/[^/]+|manga\/[^/]+\/[^/]+|novel\/[^/]+\/[^/]+)\/?$/.test(pathname);
}

function shouldServeSeriesShell(request: Request, url: URL): boolean {
  return /^\/series\/[^/]+\/?$/.test(url.pathname) &&
    isStaticDocumentRequest(request, url) &&
    !isAutomatedCrawler(request);
}

function shouldServeReaderShell(request: Request, url: URL): boolean {
  return /^\/(?:manga|novel)\/[^/]+\/[^/]+\/?$/.test(url.pathname) &&
    isStaticDocumentRequest(request, url) &&
    !isAutomatedCrawler(request);
}

let staticPageManifestPromise: Promise<Record<string, string>> | null = null;

async function getStaticPageAssetPath(
  env: CloudflareEnv,
  pathname: string,
  origin: string,
): Promise<string | null> {
  if (!env.ASSETS) return null;

  if (!staticPageManifestPromise) {
    const manifestUrl = new URL("/__static_pages/manifest.json", origin);
    staticPageManifestPromise = env.ASSETS
      .fetch(new Request(manifestUrl))
      .then(async (response) => {
        if (!response.ok) {
          await response.body?.cancel();
          throw new Error(`Static page manifest returned HTTP ${response.status}.`);
        }
        return response.json() as Promise<Record<string, string>>;
      })
      .catch((error: unknown) => {
        staticPageManifestPromise = null;
        throw error;
      });
  }

  let decodedPathname = pathname;
  try {
    decodedPathname = decodeURIComponent(pathname);
  } catch {
    // Keep the encoded path; it may still be a valid manifest key.
  }

  try {
    const manifest = await staticPageManifestPromise;
    return manifest[pathname] || manifest[decodedPathname] || null;
  } catch (error) {
    console.error("[worker static-pages] Unable to load static page manifest.", error);
    return null;
  }
}

function isStaticDocumentRequest(request: Request, url: URL): boolean {
  return (request.method === "GET" || request.method === "HEAD") &&
    request.headers.get("rsc") !== "1" &&
    !url.searchParams.has("_rsc") &&
    !request.headers.has("next-action") &&
    (request.headers.get("accept") || "").toLowerCase().includes("text/html");
}

async function fetchStaticDocument(
  request: Request,
  url: URL,
  env: CloudflareEnv,
  assetPath: string,
  sourceRoute: string,
): Promise<Response> {
  const response = await env.ASSETS!.fetch(
    new Request(new URL(assetPath, url.origin), request),
  );
  if (response.status === 404) {
    await response.body?.cancel();
    console.error(`[worker static-pages] Built asset is missing for ${sourceRoute}: ${assetPath}`);
    return new Response("Static page asset is missing. Rebuild and deploy the Worker assets.", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const headers = new Headers(response.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set(
    "cache-control",
    "public, max-age=0, s-maxage=300, stale-while-revalidate=3600",
  );
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function serveStaticPage(
  request: Request,
  url: URL,
  env: CloudflareEnv,
): Promise<Response | null> {
  if (!env.ASSETS || !isStaticDocumentRequest(request, url)) return null;

  const hasTrailingSlash = url.pathname.length > 1 && url.pathname.endsWith("/");
  const canonicalPath = hasTrailingSlash ? url.pathname.slice(0, -1) : url.pathname;
  const assetPath = await getStaticPageAssetPath(env, canonicalPath, url.origin);
  if (!assetPath) return null;

  if (hasTrailingSlash) {
    const canonicalUrl = new URL(url);
    canonicalUrl.pathname = canonicalPath;
    return Response.redirect(canonicalUrl, 308);
  }

  return fetchStaticDocument(request, url, env, assetPath, url.pathname);
}

async function serveSocialMetadataFallback(
  request: Request,
  response: Response,
): Promise<Response> {
  if (
    response.status < 500 ||
    !isSocialCrawler(request) ||
    !isSharePage(new URL(request.url).pathname) ||
    !response.headers.get("content-type")?.toLowerCase().includes("text/html")
  ) {
    return response;
  }

  const html = await response.text();
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("content-encoding");
  headers.delete("content-md5");
  headers.delete("etag");
  if (
    !html.includes('property="og:title"') ||
    !html.includes('property="og:image"') ||
    !html.includes('property="og:description"')
  ) {
    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  headers.set("cache-control", "public, max-age=60, s-maxage=60");
  console.warn(`[social preview] Serving OG metadata despite upstream HTTP ${response.status}.`);
  return new Response(html.replace(' id="__next_error__"', ""), {
    status: 200,
    headers,
  });
}

function bloggerChaptersCacheKey(source: string, title: string): string {
  const normalized = title.trim().toLowerCase().replace(/\s+/g, " ");
  return `blogger:chapters:${source}:${normalized}`;
}

function catalogResponse(data: unknown, cacheStatus: string): Response {
  return new Response(JSON.stringify(data), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
      "x-cache": cacheStatus,
      "x-content-type-options": "nosniff",
    },
  });
}

async function getMangaCatalogSourceMode(kv: KVNamespace): Promise<MangaCatalogSourceMode> {
  const value = await kv.get(MANGA_CATALOG_SOURCE_KEY, "text");
  return value === "baseline" ? "baseline" : "effective";
}

async function verifyMangaCatalogAdmin(request: Request): Promise<Response | null> {
  const authorization = request.headers.get("authorization") || "";
  const idToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!idToken) {
    return new Response(JSON.stringify({ error: "Admin authentication is required." }), {
      status: 401,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    });
  }

  const identityResponse = await fetchUpstream(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken }),
    },
  );
  if (!identityResponse.ok) {
    return new Response(JSON.stringify({ error: "Admin authentication could not be verified." }), {
      status: 401,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    });
  }

  const identity = await identityResponse.json() as { users?: Array<{ email?: unknown }> };
  const email = identity.users?.[0]?.email;
  if (
    typeof email !== "string" ||
    !["mikorokuscan@gmail.com", "moemaomao@gmail.com"].includes(email.toLowerCase())
  ) {
    return new Response(JSON.stringify({ error: "This account cannot change the manga catalog source." }), {
      status: 403,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    });
  }
  return null;
}

async function fetchAndCacheMangaCatalog(
  env: CloudflareEnv,
  requestUrl: string,
  kv: KVNamespace,
  sourceMode: MangaCatalogSourceMode,
  cacheKey = MANGA_CATALOG_CACHE_KEY,
): Promise<Record<string, unknown>> {
  let payload: unknown;
  let token: string | null = null;
  try {
    const baselineUrl = new URL(MANGA_CATALOG_URL, requestUrl);
    const baselineRequest = new Request(baselineUrl, {
      headers: { Accept: "application/json" },
    });
    const baseline = env.ASSETS
      ? await env.ASSETS.fetch(baselineRequest)
      : await fetchUpstream(baselineUrl.toString(), {
          headers: { Accept: "application/json" },
        });
    if (!baseline.ok) {
      throw new Error(`metadata.json returned HTTP ${baseline.status}.`);
    }
    const baselinePayload: unknown = await baseline.json();
    if (
      !baselinePayload ||
      typeof baselinePayload !== "object" ||
      Array.isArray(baselinePayload) ||
      !Array.isArray((baselinePayload as { manga?: unknown }).manga) ||
      typeof (baselinePayload as { exportedAtMs?: unknown }).exportedAtMs !== "number"
    ) {
      throw new Error("metadata.json has an invalid format.");
    }
    payload = baselinePayload;
  } catch (error) {
    console.warn("[worker manga-catalog] metadata.json unavailable; trying Firestore.", error);
    token = await createFirebaseAccessToken(env);
    const upstream = await fetchUpstream(
      `${FIRESTORE_DOCUMENTS_URL}/meta/mangaMetadataCatalog`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
    );
    if (!upstream.ok) {
      throw new Error(`Firestore manga metadata catalog returned HTTP ${upstream.status}.`);
    }
    const document = await upstream.json() as {
      fields?: Record<string, FirestoreRestValue>;
    };
    const content = document.fields?.content;
    if (!content || typeof content.stringValue !== "string") {
      throw new Error("Firestore manga metadata catalog has no JSON content.");
    }
    payload = JSON.parse(content.stringValue);
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload) ||
    !Array.isArray((payload as { manga?: unknown }).manga) ||
    typeof (payload as { exportedAtMs?: unknown }).exportedAtMs !== "number"
  ) {
    throw new Error("Firestore manga metadata catalog has an invalid format.");
  }
  const source = payload as Record<string, unknown> & {
    exportedAtMs: number;
    manga: unknown[];
  };
  const records = new Map<string, Record<string, unknown>>();
  for (const item of source.manga) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = normalizeMangaCatalogRecord(item as Record<string, unknown>);
    if (record) {
      records.set(record.slug, record);
    }
  }

  const changes = sourceMode === "effective"
    ? await fetchFirestoreMangaChanges(
        token || (token = await createFirebaseAccessToken(env)),
        source.exportedAtMs,
      )
    : [];
  const tombstones = new Map<string, number>();
  for (const change of changes) {
    const record = change.record;
    if (record.isCatalogTombstone === true && typeof record.deletedSlug === "string") {
      const deletedAt = mangaMetadataChangeTime(record);
      tombstones.set(record.deletedSlug, Math.max(tombstones.get(record.deletedSlug) || 0, deletedAt));
      const existing = records.get(record.deletedSlug);
      if (!existing || mangaMetadataChangeTime(existing) <= deletedAt) {
        records.delete(record.deletedSlug);
      }
      continue;
    }

    const normalizedRecord = normalizeMangaCatalogRecord(record, change.id);
    if (!normalizedRecord) continue;
    const slug = normalizedRecord.slug;
    const deletedAt = tombstones.get(slug) || 0;
    if (mangaMetadataChangeTime(normalizedRecord) <= deletedAt) continue;

    const previous = records.get(slug);
    const sources = new Set(
      Array.isArray(previous?.__catalogDebugSources)
        ? previous.__catalogDebugSources as string[]
        : ["Catalog baseline"],
    );
    sources.add("Firestore delta");
    records.set(slug, {
      ...previous,
      ...normalizedRecord,
      firestore: true,
      __catalogDebugSources: [...sources],
    });
  }

  const cachedAt = Date.now();
  const data: Record<string, unknown> = {
    ...source,
    sourceExportedAtMs: source.exportedAtMs,
    exportedAtMs: sourceMode === "baseline" ? source.exportedAtMs : cachedAt,
    catalogSourceMode: sourceMode,
    firestoreDeltasIncluded: sourceMode === "effective",
    manga: [...records.values()],
  };

  try {
    await kv.put(
      cacheKey,
      JSON.stringify({ cachedAt, data }),
      { expirationTtl: MANGA_CATALOG_CACHE_TTL },
    );
  } catch (error) {
    console.error("[worker manga-catalog] KV put failed", error);
    throw new Error("Shared manga catalog cache could not be written.");
  }
  return data;
}

function normalizeMangaCatalogRecord(
  value: Record<string, unknown>,
  fallbackSlug?: string,
): Record<string, unknown> | null {
  const nestedMetadata = value.metadata &&
    typeof value.metadata === "object" &&
    !Array.isArray(value.metadata)
    ? value.metadata as Record<string, unknown>
    : {};
  const record = { ...nestedMetadata, ...value };
  const slug = typeof record.slug === "string" && record.slug
    ? record.slug
    : fallbackSlug || (typeof record.id === "string" ? record.id : "");
  return slug ? { ...record, slug } : null;
}

function mangaMetadataChangeTime(record: Record<string, unknown>): number {
  const values = [record.metadataUpdatedAt, record.updatedAt, record.deletedAt];
  return values.reduce((latest, value) => {
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.max(latest, value);
    }
    if (typeof value === "string") {
      const parsed = Number(value) || Date.parse(value);
      return Number.isFinite(parsed) ? Math.max(latest, parsed) : latest;
    }
    if (value && typeof value === "object" && "seconds" in value) {
      const seconds = Number((value as { seconds?: unknown }).seconds);
      return Number.isFinite(seconds) ? Math.max(latest, seconds * 1000) : latest;
    }
    return latest;
  }, 0);
}

async function handleMangaCatalogSource(
  request: Request,
  env: CloudflareEnv,
): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== "/api/catalog/source") return null;
  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "content-type": "application/json; charset=utf-8", Allow: "GET" },
    });
  }
  const kv = getCacheKv(env);
  if (!kv) {
    return new Response(JSON.stringify({ error: "Shared catalog cache is not configured." }), {
      status: 503,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    });
  }
  try {
    return new Response(JSON.stringify({ sourceMode: await getMangaCatalogSourceMode(kv) }), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[worker manga-catalog] source mode could not be read", error);
    return new Response(JSON.stringify({ error: "Catalog source configuration is unavailable." }), {
      status: 503,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    });
  }
}

async function handleMangaCatalogProxy(
  request: Request,
  env: CloudflareEnv,
  ctx: ExecutionContext,
): Promise<Response | null> {
  const url = new URL(request.url);
  const isFeedCatalogRequest = url.pathname === "/api/catalog/feed";
  if (
    !isFeedCatalogRequest &&
    url.pathname !== "/api/catalog/manga" &&
    url.pathname !== "/api/catalog/metadata"
  ) {
    return null;
  }
  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  const kv = getCacheKv(env);
  if (!kv) {
    return new Response(JSON.stringify({ error: "Shared catalog cache is not configured." }), {
      status: 503,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }
  let sourceMode: MangaCatalogSourceMode = "effective";
  if (!isFeedCatalogRequest) {
    try {
      sourceMode = await getMangaCatalogSourceMode(kv);
    } catch (error) {
      console.error("[worker manga-catalog] source mode could not be read", error);
      return new Response(JSON.stringify({ error: "Catalog source configuration is unavailable." }), {
        status: 503,
        headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
      });
    }
  }
  const cacheKey = isFeedCatalogRequest ? MANGA_CATALOG_FEED_CACHE_KEY : MANGA_CATALOG_CACHE_KEY;
  const freshnessTtl = isFeedCatalogRequest
    ? MANGA_CATALOG_FEED_FRESH_TTL
    : MANGA_CATALOG_FRESH_TTL;
  let cached: { cachedAt?: number; data?: Record<string, unknown> } | null = null;
  try {
    cached = await kv.get(cacheKey, "json");
    if (!Array.isArray(cached?.data?.manga)) cached = null;
  } catch (error) {
    console.warn("[worker manga-catalog] KV get failed", error);
    return new Response(JSON.stringify({ error: "Shared catalog cache is temporarily unavailable." }), {
      status: 503,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }

  if (cached) {
    const age = Date.now() - Number(cached.cachedAt || 0);
    if (cached.data.catalogSourceMode === sourceMode && age <= freshnessTtl) {
      const responseBody = url.pathname === "/api/catalog/manga"
        ? cached.data.manga
        : cached.data;
      return catalogResponse(responseBody, "HIT");
    }

    if (cached.data.catalogSourceMode !== sourceMode) {
      try {
        const data = await fetchAndCacheMangaCatalog(env, request.url, kv, sourceMode, cacheKey);
        const responseBody = url.pathname === "/api/catalog/manga" ? data.manga : data;
        return catalogResponse(responseBody, "MISS");
      } catch (error) {
        console.error("[worker manga-catalog] source change refresh failed", error);
        return new Response(
          JSON.stringify({ error: "Manga catalog could not be refreshed for the selected source." }),
          { status: 502, headers: { "content-type": "application/json; charset=utf-8" } },
        );
      }
    }

    ctx.waitUntil(
      fetchAndCacheMangaCatalog(env, request.url, kv, sourceMode, cacheKey).catch((error: unknown) => {
        console.error("[worker manga-catalog] background refresh failed", error);
      }),
    );
    const responseBody = url.pathname === "/api/catalog/manga"
      ? cached.data.manga
      : cached.data;
    return catalogResponse(responseBody, "STALE");
  }

  try {
    const data = await fetchAndCacheMangaCatalog(env, request.url, kv, sourceMode, cacheKey);
    const responseBody = url.pathname === "/api/catalog/manga" ? data.manga : data;
    return catalogResponse(responseBody, "MISS");
  } catch (error) {
    console.error("[worker manga-catalog] upstream fetch failed", error);
    if (cached) {
      const responseBody = url.pathname === "/api/catalog/manga"
        ? cached.data.manga
        : cached.data;
      return catalogResponse(responseBody, "STALE");
    }
    return new Response(
      JSON.stringify({ error: "Manga catalog is temporarily unavailable." }),
      {
        status: 502,
        headers: { "content-type": "application/json; charset=utf-8" },
      },
    );
  }
}

async function handleMangaCatalogCacheRefresh(
  request: Request,
  env: CloudflareEnv,
): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== "/api/admin/refresh-manga-catalog-cache") return null;
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "content-type": "application/json; charset=utf-8", Allow: "POST" },
    });
  }

  try {
    const authError = await verifyMangaCatalogAdmin(request);
    if (authError) return authError;

    const kv = getCacheKv(env);
    if (!kv) {
      return new Response(JSON.stringify({ error: "Shared catalog cache is not configured." }), {
        status: 503,
        headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
      });
    }

    const sourceMode = await getMangaCatalogSourceMode(kv);
    const cachedAt = Date.now();
    const payload = await fetchAndCacheMangaCatalog(
      env,
      request.url,
      kv,
      sourceMode,
      MANGA_CATALOG_CACHE_KEY,
    );

    let feedMangaCount: number | null = null;
    let feedError: string | null = null;
    try {
      const feedPayload = await fetchAndCacheMangaCatalog(
        env,
        request.url,
        kv,
        "effective",
        MANGA_CATALOG_FEED_CACHE_KEY,
      );
      feedMangaCount = Array.isArray(feedPayload.manga) ? feedPayload.manga.length : 0;
    } catch (error) {
      console.error("[worker manga-catalog] feed cache refresh failed", error);
      feedError = error instanceof Error ? error.message : "Feed cache refresh failed.";
    }

    return new Response(
      JSON.stringify({
        ok: true,
        sourceMode,
        cachedAt,
        mangaCount: Array.isArray(payload.manga) ? payload.manga.length : 0,
        feedMangaCount,
        feedRefreshed: feedError == null,
        ...(feedError ? { feedError } : {}),
      }),
      {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store",
          "x-content-type-options": "nosniff",
        },
      },
    );
  } catch (error) {
    console.error("[worker manga-catalog] authenticated cache refresh failed", error);
    return new Response(
      JSON.stringify({
        error: "Shared catalog cache could not be refreshed.",
        detail: error instanceof Error ? error.message : "Unexpected Worker error.",
      }),
      {
        status: 502,
        headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
      },
    );
  }
}

function base64UrlEncode(value: string | Uint8Array): string {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function createFirebaseAccessToken(env: CloudflareEnv): Promise<string> {
  const clientEmail = env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  if (!clientEmail || !privateKey) {
    throw new Error("Firebase service account secrets are not configured.");
  }

  if (
    firebaseAccessToken?.clientEmail === clientEmail &&
    firebaseAccessToken.expiresAt > Date.now() + 60_000
  ) {
    return firebaseAccessToken.token;
  }

  if (firebaseAccessTokenPromise) return firebaseAccessTokenPromise;

  firebaseAccessTokenPromise = (async () => {
    const pem = privateKey
      .replace(/-----BEGIN PRIVATE KEY-----/g, "")
      .replace(/-----END PRIVATE KEY-----/g, "")
      .replace(/\s/g, "");
    const der = Uint8Array.from(atob(pem), (character) => character.charCodeAt(0));
    const signingKey = await crypto.subtle.importKey(
      "pkcs8",
      der,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const issuedAt = Math.floor(Date.now() / 1000);
    const assertionHeader = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const assertionClaims = base64UrlEncode(
      JSON.stringify({
        iss: clientEmail,
        scope: "https://www.googleapis.com/auth/datastore",
        aud: FIREBASE_TOKEN_URL,
        iat: issuedAt,
        exp: issuedAt + 3600,
      }),
    );
    const unsignedAssertion = `${assertionHeader}.${assertionClaims}`;
    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      signingKey,
      new TextEncoder().encode(unsignedAssertion),
    );
    const assertion = `${unsignedAssertion}.${base64UrlEncode(new Uint8Array(signature))}`;
    const response = await fetchUpstream(FIREBASE_TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    });
    if (!response.ok) {
      throw new Error(`Firebase OAuth token request returned HTTP ${response.status}.`);
    }

    const result = await response.json() as {
      access_token?: unknown;
      expires_in?: unknown;
    };
    if (typeof result.access_token !== "string" || !result.access_token) {
      throw new Error("Firebase OAuth token response did not contain an access token.");
    }

    const expiresIn = Number(result.expires_in);
    firebaseAccessToken = {
      clientEmail,
      token: result.access_token,
      expiresAt: Date.now() + (Number.isFinite(expiresIn) ? expiresIn : 3600) * 1000,
    };
    return result.access_token;
  })();

  try {
    return await firebaseAccessTokenPromise;
  } finally {
    firebaseAccessTokenPromise = null;
  }
}

type FirestoreRestValue = {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  timestampValue?: string;
  nullValue?: null | string;
  arrayValue?: { values?: FirestoreRestValue[] };
  mapValue?: { fields?: Record<string, FirestoreRestValue> };
  referenceValue?: string;
  bytesValue?: string;
  geoPointValue?: { latitude?: number; longitude?: number };
};

function decodeFirestoreRestValue(value: FirestoreRestValue): unknown {
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("nullValue" in value) return null;
  if ("arrayValue" in value) {
    return (value.arrayValue?.values ?? []).map(decodeFirestoreRestValue);
  }
  if ("mapValue" in value) {
    return Object.fromEntries(
      Object.entries(value.mapValue?.fields ?? {}).map(([key, field]) => [
        key,
        decodeFirestoreRestValue(field),
      ]),
    );
  }
  if ("referenceValue" in value) return value.referenceValue;
  if ("bytesValue" in value) return value.bytesValue;
  if ("geoPointValue" in value) return value.geoPointValue;
  return undefined;
}

async function fetchFirestoreMangaChanges(
  token: string,
  cursor: number,
): Promise<Array<{ id: string; record: Record<string, unknown> }>> {
  const queryField = async (fieldPath: string) => {
    const response = await fetchUpstream(`${FIRESTORE_DOCUMENTS_URL}:runQuery`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "manga" }],
          where: {
            fieldFilter: {
              field: { fieldPath },
              op: "GREATER_THAN",
              value: { doubleValue: cursor },
            },
          },
        },
      }),
    });
    if (!response.ok) {
      throw new Error(`Firestore manga ${fieldPath} delta query returned HTTP ${response.status}.`);
    }

    const rows = await response.json() as Array<{
      document?: {
        name?: string;
        fields?: Record<string, FirestoreRestValue>;
      };
    }>;
    return rows.flatMap(({ document }) => {
      if (!document?.name) return [];
      const encodedId = document.name.split("/").pop() || "";
      let id = encodedId;
      try {
        id = decodeURIComponent(encodedId);
      } catch {
        // Keep the original document ID if it is not URI-encoded.
      }
      const record = Object.fromEntries(
        Object.entries(document.fields || {}).map(([key, value]) => [
          key,
          decodeFirestoreRestValue(value),
        ]),
      );
      return id ? [{ id, record }] : [];
    });
  };

  const results = await Promise.all([
    queryField("updatedAt"),
    queryField("metadataUpdatedAt"),
  ]);
  return results.flat();
}

async function fetchMangaDetailFromFirestore(
  env: CloudflareEnv,
  slug: string,
): Promise<Record<string, unknown> | null> {
  const token = await createFirebaseAccessToken(env);
  const response = await fetchUpstream(
    `${FIRESTORE_DOCUMENTS_URL}/manga/${encodeURIComponent(slug)}`,
    { headers: { Accept: "application/json", Authorization: `Bearer ${token}` } },
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Firestore manga detail returned HTTP ${response.status}.`);
  }

  const document = await response.json() as {
    fields?: Record<string, FirestoreRestValue>;
  };
  const fields = document.fields || {};
  return {
    ...Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [
        key,
        decodeFirestoreRestValue(value),
      ]),
    ),
    slug,
  };
}

function mangaDetailResponse(
  body: unknown,
  cacheStatus: "HIT" | "STALE" | "MISS" | "BYPASS",
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": status === 200
        ? cacheStatus === "STALE"
          ? "public, max-age=30, s-maxage=60, stale-while-revalidate=300"
          : MANGA_DETAIL_CACHE_CONTROL
        : "no-store",
      "x-cache": cacheStatus,
      "x-content-type-options": "nosniff",
    },
  });
}

async function fetchAndCacheMangaDetail(
  env: CloudflareEnv,
  kv: KVNamespace | undefined,
  slug: string,
): Promise<Record<string, unknown> | null> {
  const data = await fetchMangaDetailFromFirestore(env, slug);
  if (data && kv) {
    try {
      await kv.put(
        `manga:detail:${slug}`,
        JSON.stringify({ cachedAt: Date.now(), data }),
        { expirationTtl: MANGA_DETAIL_CACHE_TTL },
      );
    } catch (error) {
      console.warn("[worker manga-detail] KV put failed", error);
    }
  }
  return data;
}

async function handleMangaDetailProxy(
  request: Request,
  env: CloudflareEnv,
  ctx: ExecutionContext,
): Promise<Response | null> {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/api\/manga\/([^/]+)\/?$/);
  if (!match) return null;
  if (request.method !== "GET") {
    return mangaDetailResponse({ error: "Method not allowed" }, "BYPASS", 405);
  }

  let slug: string;
  try {
    slug = decodeURIComponent(match[1]);
  } catch {
    return mangaDetailResponse({ error: "Slug tidak valid." }, "BYPASS", 400);
  }
  if (!slug || slug.length > 200 || /[\/\u0000-\u001f]/.test(slug)) {
    return mangaDetailResponse({ error: "Slug tidak valid." }, "BYPASS", 400);
  }

  const kv = getCacheKv(env);
  const cacheKey = `manga:detail:${slug}`;
  const forceRefresh = url.searchParams.get("refresh") === "1";
  let cached: { cachedAt?: number; data?: Record<string, unknown> } | null = null;
  if (kv) {
    try {
      const value = await kv.get(cacheKey, "json");
      if (
        value &&
        typeof value === "object" &&
        typeof value.data === "object" &&
        value.data !== null &&
        !Array.isArray(value.data)
      ) {
        cached = value as typeof cached;
      }
    } catch (error) {
      console.warn("[worker manga-detail] KV get failed", error);
    }
  }

  if (cached && !forceRefresh) {
    const cachedAt = Number(cached.cachedAt);
    if (Number.isFinite(cachedAt) && Date.now() - cachedAt <= MANGA_DETAIL_FRESH_TTL) {
      return mangaDetailResponse(cached.data, "HIT");
    }

    ctx.waitUntil(
      fetchAndCacheMangaDetail(env, kv, slug).catch((error: unknown) => {
        console.error("[worker manga-detail] background refresh failed", error);
      }),
    );
    return mangaDetailResponse(cached.data, "STALE");
  }

  try {
    const data = await fetchAndCacheMangaDetail(env, kv, slug);
    if (!data) {
      return mangaDetailResponse({ error: "Manga tidak ditemukan." }, forceRefresh ? "BYPASS" : "MISS", 404);
    }
    return mangaDetailResponse(data, forceRefresh || !kv ? "BYPASS" : "MISS");
  } catch (error) {
    console.error("[worker manga-detail] Firestore fetch failed", error);
    if (cached) return mangaDetailResponse(cached.data, "STALE");
    return mangaDetailResponse(
      { error: "Manga detail is temporarily unavailable." },
      forceRefresh || !kv ? "BYPASS" : "MISS",
      502,
    );
  }
}

function getBloggerChapterNumber(title: string, url: string): string {
  const match =
    title.match(
      /(?:chapter|chapters|ch\.?|chap\.?|ep\.?|episode)\s*[:\-]?\s*(\d+(?:[.,．]\d+)?)/i,
    ) ||
    title.match(/第\s*(\d+(?:[.,．]\d+)?)\s*[話话回]?/) ||
    title.match(/#\s*(\d+(?:[.,．]\d+)?)/) ||
    [...title.matchAll(/(\d+(?:[.,．]\d+)?)/g)].at(-1) ||
    url.match(/(?:chapter|ch)[_-]?(\d+(?:[.-]\d+)?)/i);
  return match?.[1]?.replace(/[,_．]/g, ".").replace(/-/g, ".") || "?";
}

function parseBloggerFeed(data: any, source: string) {
  return (data?.feed?.entry || []).map((entry: any) => {
    const title = entry.title?.$t || "";
    const url =
      entry.link?.find((link: any) => link.rel === "alternate")?.href || "";
    const html = entry.content?.$t || "";
    const images = [
      ...String(html).matchAll(/<img[^>]+src=["']([^"']+)["']/gi),
    ].map((m) => m[1]);
    return {
      num: getBloggerChapterNumber(title, url),
      title,
      url,
      images,
      thumbnail: (images[2] || images[0] || "").replace(/\/s\d+/, "/s100"),
      createdAt: entry.updated?.$t || entry.published?.$t || "",
      source,
    };
  });
}

async function fetchAndCacheBloggerChapters(
  kv: KVNamespace | undefined,
  source: keyof typeof BLOGGER_DOMAINS,
  title: string,
) {
  const domain = BLOGGER_DOMAINS[source];
  const feedUrl = `${domain}/feeds/posts/default?alt=json&max-results=500&q=${encodeURIComponent(title)}`;
  const upstream = await fetchUpstream(feedUrl, {
    headers: {
      Accept: "application/json",
      "User-Agent": "mikoroku-blogger-proxy/1.0",
    },
  });

  if (!upstream.ok) {
    throw new Error(`Blogger HTTP ${upstream.status}`);
  }

  const chapters = parseBloggerFeed(await upstream.json(), source);
  const payload = {
    chapters,
    cachedAt: new Date().toISOString(),
    source,
    title,
  };

  if (kv && chapters.length > 0) {
    try {
      await kv.put(bloggerChaptersCacheKey(source, title), JSON.stringify(payload), {
        expirationTtl: BLOGGER_CHAPTERS_STALE_TTL,
      });
    } catch (error) {
      console.warn("[worker blogger-proxy] KV put failed", error);
    }
  }

  return payload;
}

function bloggerCacheAge(cachedAt: unknown): number {
  const timestamp =
    typeof cachedAt === "number"
      ? cachedAt
      : typeof cachedAt === "string"
        ? Date.parse(cachedAt)
        : Number.NaN;
  return Number.isFinite(timestamp) ? Date.now() - timestamp : Number.POSITIVE_INFINITY;
}

function corsFor(request: Request): HeadersInit {
  const origin = request.headers.get("origin");
  let allow = "https://mikoroku.top";
  if (origin) {
    try {
      const host = new URL(origin).hostname;
      if (
        /mikoroku\.(top|workers\.dev)$/i.test(host) ||
        host === "localhost" ||
        host.endsWith(".localhost")
      ) {
        allow = origin;
      }
    } catch {
      /* ignore */
    }
  }
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

async function handleBloggerChaptersProxy(
  request: Request,
  env: CloudflareEnv,
): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== "/api/blogger/chapters") return null;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsFor(request) });
  }
  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "content-type": "application/json", ...corsFor(request) },
    });
  }

  const title = (url.searchParams.get("title") || "").trim();
  const sourceRaw = (url.searchParams.get("source") || "blogger").trim();
  const forceRefresh = url.searchParams.get("refresh") === "1";

  if (!title) {
    return new Response(
      JSON.stringify({ error: "Parameter title wajib diisi.", chapters: [] }),
      {
        status: 400,
        headers: {
          "content-type": "application/json",
          ...corsFor(request),
        },
      },
    );
  }

  if (sourceRaw !== "blogger" && sourceRaw !== "blogger2") {
    return new Response(
      JSON.stringify({
        error: 'source harus "blogger" atau "blogger2".',
        chapters: [],
      }),
      {
        status: 400,
        headers: {
          "content-type": "application/json",
          ...corsFor(request),
        },
      },
    );
  }

  const source = sourceRaw as keyof typeof BLOGGER_DOMAINS;
  const kv = getCacheKv(env);
  const cacheKey = bloggerChaptersCacheKey(source, title);
  let cached: {
    chapters: unknown[];
    cachedAt?: unknown;
    source?: string;
    title?: string;
  } | null = null;

  const respond = (body: unknown, cacheStatus: string, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control":
          cacheStatus === "STALE"
            ? "public, max-age=0, s-maxage=0, stale-while-revalidate=60"
            : `public, max-age=${BLOGGER_CHAPTERS_BROWSER_MAX_AGE}, s-maxage=${BLOGGER_CHAPTERS_TTL}, stale-while-revalidate=60`,
        "x-cache": cacheStatus,
        "x-content-type-options": "nosniff",
        ...corsFor(request),
      },
    });

  if (kv) {
    try {
      const value = await kv.get(cacheKey, "json");
      if (Array.isArray(value?.chapters)) {
        cached = value as typeof cached;
      }
    } catch (e) {
      console.warn("[worker blogger-proxy] KV get failed", e);
    }
  }

  if (cached && !forceRefresh) {
    const body = {
      chapters: cached.chapters,
      source: cached.source ?? source,
      title: cached.title ?? title,
      cachedAt: cached.cachedAt,
      count: cached.chapters.length,
    };

    if (bloggerCacheAge(cached.cachedAt) <= BLOGGER_CHAPTERS_TTL * 1000) {
      return respond(body, "HIT");
    }

    try {
      const payload = await fetchAndCacheBloggerChapters(kv, source, title);
      return respond(
        {
          chapters: payload.chapters,
          source,
          title,
          cachedAt: payload.cachedAt,
          count: payload.chapters.length,
        },
        "MISS",
      );
    } catch (error) {
      console.error("[worker blogger-proxy] refresh failed; serving stale chapters", error);
      return respond({ ...body, stale: true }, "STALE");
    }
  }

  try {
    const payload = await fetchAndCacheBloggerChapters(kv, source, title);

    return respond(
      {
        chapters: payload.chapters,
        source,
        title,
        cachedAt: payload.cachedAt,
        count: payload.chapters.length,
      },
      forceRefresh ? "BYPASS" : "MISS",
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal memuat feed Blogger.";
    console.error("[worker blogger-proxy] upstream fetch failed", error);

    if (cached) {
      return respond(
        {
          chapters: cached.chapters,
          source: cached.source ?? source,
          title: cached.title ?? title,
          cachedAt: cached.cachedAt,
          count: cached.chapters.length,
          stale: true,
        },
        "STALE",
      );
    }

    return respond({ error: message, chapters: [] }, "ERROR", 502);
  }
}

export default {
  async fetch(
    request: Request,
    env: CloudflareEnv,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);
    if (
      url.pathname.startsWith("/__static_pages/") &&
      (request.method === "GET" || request.method === "HEAD")
    ) {
      return Response.redirect(new URL("/", url.origin), 302);
    }

    const staticPage = await serveStaticPage(request, url, env);
    if (staticPage) return staticPage;

    if (env.ASSETS && shouldServeSeriesShell(request, url)) {
      const shellAssetPath = await getStaticPageAssetPath(
        env,
        "/series-shell",
        url.origin,
      );
      if (shellAssetPath) {
        return fetchStaticDocument(
          request,
          url,
          env,
          shellAssetPath,
          "/series-shell",
        );
      }
    }

    if (env.ASSETS && shouldServeReaderShell(request, url)) {
      const shellAssetPath = await getStaticPageAssetPath(
        env,
        "/reader-shell",
        url.origin,
      );
      if (shellAssetPath) {
        return fetchStaticDocument(
          request,
          url,
          env,
          shellAssetPath,
          "/reader-shell",
        );
      }
    }

    const isHomepageDocument =
      url.pathname === "/" &&
      (request.method === "GET" || request.method === "HEAD") &&
      request.headers.get("rsc") !== "1" &&
      !url.searchParams.has("_rsc");

    if (isHomepageDocument && env.ASSETS) {
      const assetRequest = new Request(url, request);
      const response = await env.ASSETS.fetch(assetRequest);
      if (response.status !== 404) {
        const headers = new Headers(response.headers);
        headers.set(
          "cache-control",
          "public, max-age=0, s-maxage=300, stale-while-revalidate=3600",
        );
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      }
    }

    const catalogRefresh = await handleMangaCatalogCacheRefresh(request, env);
    if (catalogRefresh) return catalogRefresh;
    const catalogSourceUpdate = await handleMangaCatalogSourceUpdate(request, env);
    if (catalogSourceUpdate) return catalogSourceUpdate;
    const catalogSource = await handleMangaCatalogSource(request, env);
    if (catalogSource) return catalogSource;
    const catalog = await handleMangaCatalogProxy(request, env, ctx);
    if (catalog) return catalog;
    const mangaDetail = await handleMangaDetailProxy(request, env, ctx);
    if (mangaDetail) return mangaDetail;
    const proxied = await handleBloggerChaptersProxy(request, env);
    if (proxied) return proxied;
    const response = await handler.fetch(request, env, ctx);
    return serveSocialMetadataFallback(request, response);
  },

};
