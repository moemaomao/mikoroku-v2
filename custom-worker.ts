// @ts-nocheck
import { default as handler } from "./.open-next/worker.js";

interface ScheduledController {
  readonly cron: string;
  readonly type: string;
  readonly scheduledTime: number;
}

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
  /** Prefer this binding (matches wrangler.jsonc). */
  MIKOROKU_V2_CACHE?: KVNamespace;
  /** Legacy alias kept for older deploys. */
  MIKOROKU_CACHE?: KVNamespace;
  NEXT_INC_CACHE_KV?: KVNamespace;
  WARM_BASE_URL?: string;
  [key: string]: unknown;
}

const BLOGGER_DOMAINS = {
  blogger: "https://www.mikodrive.my.id",
  blogger2: "https://www.yomidays.my.id",
} as const;

const BLOGGER_CHAPTERS_TTL = 20 * 60;
const BLOGGER_CHAPTERS_BROWSER_MAX_AGE = 5 * 60;

function getCacheKv(env: CloudflareEnv): KVNamespace | undefined {
  return env.MIKOROKU_V2_CACHE || env.MIKOROKU_CACHE;
}

function bloggerChaptersCacheKey(source: string, title: string): string {
  const normalized = title.trim().toLowerCase().replace(/\s+/g, " ");
  return `blogger:chapters:${source}:${normalized}`;
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

/**
 * Fast path for Blogger chapter lists: serve from KV or fetch upstream
 * before handing the request to OpenNext. Keeps latency low on cache hits.
 */
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

  const respond = (body: unknown, cacheStatus: string, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": `public, max-age=${BLOGGER_CHAPTERS_BROWSER_MAX_AGE}, s-maxage=${BLOGGER_CHAPTERS_TTL}, stale-while-revalidate=60`,
        "x-cache": cacheStatus,
        "x-content-type-options": "nosniff",
        ...corsFor(request),
      },
    });

  if (kv && !forceRefresh) {
    try {
      const cached = await kv.get(cacheKey, "json");
      if (cached?.chapters && Array.isArray(cached.chapters)) {
        return respond(
          {
            chapters: cached.chapters,
            source: cached.source ?? source,
            title: cached.title ?? title,
            cachedAt: cached.cachedAt,
            count: cached.chapters.length,
          },
          "HIT",
        );
      }
    } catch (e) {
      console.warn("[worker blogger-proxy] KV get failed", e);
    }
  }

  try {
    const domain = BLOGGER_DOMAINS[source];
    const feedUrl = `${domain}/feeds/posts/default?alt=json&max-results=500&q=${encodeURIComponent(title)}`;
    const upstream = await fetch(feedUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "mikoroku-blogger-proxy/1.0",
      },
    });

    if (!upstream.ok) {
      throw new Error(`Blogger HTTP ${upstream.status}`);
    }

    const data = await upstream.json();
    const chapters = parseBloggerFeed(data, source);
    const payload = {
      chapters,
      cachedAt: new Date().toISOString(),
      source,
      title,
    };

    if (kv && chapters.length > 0) {
      try {
        await kv.put(cacheKey, JSON.stringify(payload), {
          expirationTtl: BLOGGER_CHAPTERS_TTL,
        });
      } catch (e) {
        console.warn("[worker blogger-proxy] KV put failed", e);
      }
    }

    return respond(
      {
        chapters,
        source,
        title,
        cachedAt: payload.cachedAt,
        count: chapters.length,
      },
      forceRefresh ? "BYPASS" : "MISS",
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal memuat feed Blogger.";
    console.error("[worker blogger-proxy]", message);

    if (kv && forceRefresh) {
      try {
        const stale = await kv.get(cacheKey, "json");
        if (stale?.chapters?.length) {
          return respond(
            {
              chapters: stale.chapters,
              source: stale.source ?? source,
              title: stale.title ?? title,
              cachedAt: stale.cachedAt,
              count: stale.chapters.length,
              stale: true,
              warning: message,
            },
            "HIT",
          );
        }
      } catch {
        /* ignore */
      }
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
    const proxied = await handleBloggerChaptersProxy(request, env);
    if (proxied) return proxied;
    return handler.fetch(request, env, ctx);
  },

  async scheduled(
    controller: ScheduledController,
    env: CloudflareEnv,
    _ctx: ExecutionContext,
  ) {
    const started = Date.now();
    console.log(
      `[cron] triggered ${controller.cron} at ${new Date(controller.scheduledTime).toISOString()}`,
    );

    const base =
      (typeof env.WARM_BASE_URL === "string" && env.WARM_BASE_URL) ||
      "https://mikoroku.top";

    const pagesToWarm = [
      "/",
      "/manga-list",
      "/hentai-list",
      "/genre-list",
      "/bookmark",
      "/catalog",
    ];

    const results = await Promise.allSettled(
      pagesToWarm.map(async (path) => {
        const url = `${base}${path}`;
        const res = await fetch(url, {
          headers: {
            "x-cron-warm": "1",
            "user-agent": "mikoroku-cron-warmer/1.0",
          },
        } as RequestInit);
        return { path, status: res.status };
      }),
    );

    const summary = results.map((r, i) => {
      if (r.status === "fulfilled") return r.value;
      return { path: pagesToWarm[i], error: String(r.reason) };
    });

    console.log("[cron] warm result:", JSON.stringify(summary));
    console.log(`[cron] finished in ${Date.now() - started}ms`);

    try {
      const kv = getCacheKv(env);
      if (kv) {
        await kv.put("cron:last-run", new Date().toISOString(), {
          expirationTtl: 86400 * 7,
        });
      }
    } catch (e) {
      console.error("[cron] failed to write last-run", e);
    }
  },
};
