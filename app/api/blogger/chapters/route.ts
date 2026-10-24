import { NextRequest, NextResponse } from "next/server";
import {
  BLOGGER_CHAPTERS_BROWSER_MAX_AGE,
  BLOGGER_CHAPTERS_TTL,
  bloggerChaptersCacheKey,
  fetchBloggerChapters,
  isBloggerChapterSource,
  type BloggerChapter,
  type BloggerChapterSource,
} from "../../../../lib/blogger-chapters";
import { kvGet, kvSet } from "../../../../lib/kv-cache";

export const runtime = "edge";
export const dynamic = "force-dynamic";

type CachedPayload = {
  chapters: BloggerChapter[];
  cachedAt: string;
  source: BloggerChapterSource;
  title: string;
};

function corsHeaders(origin: string | null): HeadersInit {
  const allow =
    !origin ||
    /mikoroku\.(top|workers\.dev)$/i.test(new URL(origin).hostname) ||
    origin.includes("localhost")
      ? origin || "*"
      : "https://mikoroku.top";

  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

function jsonResponse(
  body: unknown,
  init: {
    status?: number;
    origin: string | null;
    cacheStatus: "HIT" | "MISS" | "BYPASS" | "ERROR";
    maxAge?: number;
  },
) {
  const maxAge = init.maxAge ?? BLOGGER_CHAPTERS_BROWSER_MAX_AGE;
  return NextResponse.json(body, {
    status: init.status ?? 200,
    headers: {
      ...corsHeaders(init.origin),
      "Cache-Control": `public, max-age=${maxAge}, s-maxage=${BLOGGER_CHAPTERS_TTL}, stale-while-revalidate=60`,
      "X-Cache": init.cacheStatus,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request.headers.get("origin")),
  });
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const { searchParams } = request.nextUrl;
  const title = (searchParams.get("title") || "").trim();
  const sourceRaw = (searchParams.get("source") || "blogger").trim();
  const forceRefresh = searchParams.get("refresh") === "1";

  if (!title) {
    return jsonResponse(
      { error: "Parameter title wajib diisi.", chapters: [] },
      { status: 400, origin, cacheStatus: "BYPASS", maxAge: 0 },
    );
  }

  if (!isBloggerChapterSource(sourceRaw)) {
    return jsonResponse(
      {
        error: 'source harus "blogger" atau "blogger2".',
        chapters: [],
      },
      { status: 400, origin, cacheStatus: "BYPASS", maxAge: 0 },
    );
  }

  const source = sourceRaw;
  const cacheKey = bloggerChaptersCacheKey(source, title);

  if (!forceRefresh) {
    try {
      const cached = await kvGet<CachedPayload>(cacheKey);
      if (cached?.chapters && Array.isArray(cached.chapters)) {
        return jsonResponse(
          {
            chapters: cached.chapters,
            source: cached.source ?? source,
            title: cached.title ?? title,
            cachedAt: cached.cachedAt,
            count: cached.chapters.length,
          },
          { origin, cacheStatus: "HIT" },
        );
      }
    } catch (error) {
      console.warn("[api/blogger/chapters] KV get failed", error);
    }
  }

  try {
    const chapters = await fetchBloggerChapters(title, source);
    const payload: CachedPayload = {
      chapters,
      cachedAt: new Date().toISOString(),
      source,
      title,
    };

    if (chapters.length > 0) {
      try {
        await kvSet(cacheKey, payload, BLOGGER_CHAPTERS_TTL);
      } catch (error) {
        console.warn("[api/blogger/chapters] KV put failed", error);
      }
    }

    return jsonResponse(
      {
        chapters,
        source,
        title,
        cachedAt: payload.cachedAt,
        count: chapters.length,
      },
      { origin, cacheStatus: forceRefresh ? "BYPASS" : "MISS" },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal memuat feed Blogger.";
    console.error("[api/blogger/chapters]", message);

    if (forceRefresh) {
      try {
        const stale = await kvGet<CachedPayload>(cacheKey);
        if (stale?.chapters?.length) {
          return jsonResponse(
            {
              chapters: stale.chapters,
              source: stale.source ?? source,
              title: stale.title ?? title,
              cachedAt: stale.cachedAt,
              count: stale.chapters.length,
              stale: true,
              warning: message,
            },
            { origin, cacheStatus: "HIT" },
          );
        }
      } catch {
        /* ignore */
      }
    }

    return jsonResponse(
      { error: message, chapters: [] },
      { status: 502, origin, cacheStatus: "ERROR", maxAge: 0 },
    );
  }
}
