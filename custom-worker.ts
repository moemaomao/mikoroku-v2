// @ts-nocheck
import { default as handler } from "./.open-next/worker.js";

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
  [key: string]: unknown;
}

const BLOGGER_DOMAINS = {
  blogger: "https://www.mikodrive.my.id",
  blogger2: "https://www.yomidays.my.id",
} as const;

const BLOGGER_CHAPTERS_TTL = 20 * 60;
const BLOGGER_CHAPTERS_STALE_TTL = 24 * 60 * 60;
const BLOGGER_CHAPTERS_BROWSER_MAX_AGE = 5 * 60;
const UPSTREAM_TIMEOUT_MS = 8_000;
const MANGA_CATALOG_CACHE_KEY = "catalog:github:all-manga:v1";
const MANGA_CATALOG_CACHE_TTL = 24 * 60 * 60;
const MANGA_CATALOG_FRESH_TTL = 10 * 60 * 1000;
const MANGA_CATALOG_URL =
  "https://raw.githubusercontent.com/moemaomao/mymangadata/main/all-manga.json";

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

function isSharePage(pathname: string): boolean {
  return /^\/(?:series\/[^/]+|manga\/[^/]+\/[^/]+|novel\/[^/]+\/[^/]+)\/?$/.test(pathname);
}

function shouldServeSeriesShell(request: Request, url: URL): boolean {
  return request.method === "GET" &&
    /^\/series\/[^/]+\/?$/.test(url.pathname) &&
    request.headers.get("rsc") !== "1" &&
    !url.searchParams.has("_rsc") &&
    !isSocialCrawler(request);
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

function catalogResponse(data: unknown[], cacheStatus: string): Response {
  return new Response(JSON.stringify(data), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=60, s-maxage=600, stale-while-revalidate=60",
      "x-cache": cacheStatus,
      "x-content-type-options": "nosniff",
    },
  });
}

async function fetchAndCacheMangaCatalog(
  kv?: KVNamespace,
  forceRefresh = false,
): Promise<unknown[]> {
  const upstreamUrl = new URL(MANGA_CATALOG_URL);
  if (forceRefresh) upstreamUrl.searchParams.set("t", String(Date.now()));
  const upstream = await fetchUpstream(upstreamUrl.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "mikoroku-catalog-proxy/1.0",
    },
  });
  if (!upstream.ok) {
    throw new Error(`Manga catalog upstream returned HTTP ${upstream.status}.`);
  }

  const data: unknown = await upstream.json();
  if (!Array.isArray(data)) {
    throw new Error("Manga catalog upstream response must be an array.");
  }

  if (kv) {
    try {
      await kv.put(
        MANGA_CATALOG_CACHE_KEY,
        JSON.stringify({ cachedAt: Date.now(), data }),
        { expirationTtl: MANGA_CATALOG_CACHE_TTL },
      );
    } catch (error) {
      console.warn("[worker manga-catalog] KV put failed", error);
    }
  }
  return data;
}

async function handleMangaCatalogProxy(
  request: Request,
  env: CloudflareEnv,
  ctx: ExecutionContext,
): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== "/api/catalog/manga") return null;
  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  const kv = getCacheKv(env);
  const forceRefresh = url.searchParams.get("refresh") === "1";
  let cached: { cachedAt?: number; data?: unknown } | null = null;
  if (kv) {
    try {
      cached = await kv.get(MANGA_CATALOG_CACHE_KEY, "json");
      if (!Array.isArray(cached?.data)) cached = null;
    } catch (error) {
      console.warn("[worker manga-catalog] KV get failed", error);
    }
  }

  if (cached && !forceRefresh) {
    const age = Date.now() - Number(cached.cachedAt || 0);
    if (age <= MANGA_CATALOG_FRESH_TTL) {
      return catalogResponse(cached.data as unknown[], "HIT");
    }

    ctx.waitUntil(
      fetchAndCacheMangaCatalog(kv).catch((error: unknown) => {
        console.error("[worker manga-catalog] background refresh failed", error);
      }),
    );
    return catalogResponse(cached.data as unknown[], "STALE");
  }

  try {
    const data = await fetchAndCacheMangaCatalog(kv, forceRefresh);
    return catalogResponse(data, forceRefresh ? "BYPASS" : "MISS");
  } catch (error) {
    console.error("[worker manga-catalog] upstream fetch failed", error);
    if (cached) return catalogResponse(cached.data as unknown[], "STALE");
    return new Response(
      JSON.stringify({ error: "Manga catalog is temporarily unavailable." }),
      {
        status: 502,
        headers: { "content-type": "application/json; charset=utf-8" },
      },
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
  ctx: ExecutionContext,
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
            ? "public, max-age=60, s-maxage=60, stale-while-revalidate=60"
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

    ctx.waitUntil(
      fetchAndCacheBloggerChapters(kv, source, title).catch((error: unknown) => {
        console.error("[worker blogger-proxy] background refresh failed", error);
      }),
    );
    return respond({ ...body, stale: true }, "STALE");
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
    const isSeriesShellDocument =
      url.pathname === "/series-shell" &&
      (request.method === "GET" || request.method === "HEAD") &&
      request.headers.get("rsc") !== "1" &&
      !url.searchParams.has("_rsc");

    if (env.ASSETS && isSeriesShellDocument) {
      const assetUrl = new URL("/series-shell.html", url.origin);
      const assetRequest = new Request(assetUrl, request);
      const response = await env.ASSETS.fetch(assetRequest);
      if (response.status === 404) {
        await response.body?.cancel();
        return new Response("Static series shell is missing. Rebuild and deploy the Worker assets.", {
          status: 503,
          headers: { "content-type": "text/plain; charset=utf-8" },
        });
      }

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

    if (env.ASSETS && shouldServeSeriesShell(request, url)) {
      const encodedSlug = url.pathname.match(/^\/series\/([^/]+)\/?$/)?.[1];
      if (!encodedSlug) return new Response("Invalid series URL.", { status: 400 });
      let slug: string;
      try {
        slug = decodeURIComponent(encodedSlug);
      } catch {
        return new Response("Invalid series slug.", { status: 400 });
      }
      const shellUrl = new URL("/series-shell", url.origin);
      shellUrl.searchParams.set("slug", slug);
      return Response.redirect(shellUrl, 307);
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

    const catalog = await handleMangaCatalogProxy(request, env, ctx);
    if (catalog) return catalog;
    const proxied = await handleBloggerChaptersProxy(request, env, ctx);
    if (proxied) return proxied;
    const response = await handler.fetch(request, env, ctx);
    return serveSocialMetadataFallback(request, response);
  },

};
