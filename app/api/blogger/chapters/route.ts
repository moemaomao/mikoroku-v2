import { NextRequest, NextResponse } from "next/server";
import {
  BLOGGER_CHAPTERS_BROWSER_MAX_AGE,
  BLOGGER_CHAPTERS_KV_TTL,
  BLOGGER_CHAPTERS_TTL,
  bloggerChaptersCacheKey,
  fetchBloggerChapters,
  isBloggerChapterSource,
  toListChapters,
  type BloggerChapter,
  type BloggerChapterSource,
} from "../../../../lib/blogger-chapters";
import { normalizeChapterNumber } from "../../../../lib/chapter-number";
import { kvGet, kvSet } from "../../../../lib/kv-cache";

export const runtime = "edge";
export const dynamic = "force-dynamic";

type CachedPayload = {
  chapters: BloggerChapter[];
  cachedAt: string;
  source: BloggerChapterSource;
  title: string;
  count?: number;
  latestOnly?: boolean;
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

function shapeChapters(chapters: BloggerChapter[], full: boolean, limit: number) {
  const shaped = full ? chapters : toListChapters(chapters);
  return !full && limit > 0 ? shaped.slice(0, limit) : shaped;
}

function findChapter(chapters: BloggerChapter[], chapterNum: string) {
  const wanted = normalizeChapterNumber(chapterNum);
  return chapters.find((chapter) => {
    const candidate = normalizeChapterNumber(chapter.num);
    return wanted && candidate
      ? wanted === candidate
      : chapter.num.trim().toLowerCase() === chapterNum.trim().toLowerCase();
  });
}

function isSameChapter(left: BloggerChapter | undefined, right: BloggerChapter): boolean {
  return !!left &&
    left.num === right.num &&
    left.title === right.title &&
    left.url === right.url &&
    left.createdAt === right.createdAt &&
    JSON.stringify(left.images) === JSON.stringify(right.images);
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
  const full = searchParams.get("full") === "1";
  const requestedChapter = (searchParams.get("chapter") || "").trim();
  const requestedLimit = Number.parseInt(searchParams.get("limit") || "", 10);
  const listLimit = Number.isFinite(requestedLimit)
    ? Math.max(1, Math.min(50, requestedLimit))
    : 0;

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

  const cached = await kvGet<CachedPayload>(cacheKey);
  const cachedChapters = Array.isArray(cached?.chapters) ? cached.chapters : [];
  const cacheIsFresh = !!cached &&
    Date.now() - Date.parse(cached.cachedAt) < BLOGGER_CHAPTERS_KV_TTL * 1000;
  const cachedChapter = requestedChapter
    ? findChapter(cachedChapters, requestedChapter)
    : undefined;

  if (!forceRefresh && cacheIsFresh && full && requestedChapter &&
      cached?.latestOnly === true && cachedChapter) {
    return jsonResponse(
      {
        chapters: [cachedChapter],
        source: cached.source ?? source,
        title: cached.title ?? title,
        cachedAt: cached.cachedAt,
        count: cached.count ?? 1,
        full,
      },
      { origin, cacheStatus: "HIT" },
    );
  }

  const cachedRequestedChapter = requestedChapter
    ? findChapter(cachedChapters, requestedChapter)
    : undefined;
  if (!forceRefresh && cacheIsFresh && cachedChapters.length > 0 &&
      cached?.latestOnly !== true &&
      (!requestedChapter || !full || cachedRequestedChapter)) {
    const responseChapters = requestedChapter && full && cachedRequestedChapter
      ? [cachedRequestedChapter]
      : cachedChapters;
    const latest = cachedChapters[0];
    if (latest) {
      try {
        await kvSet(cacheKey, {
          chapters: [latest],
          cachedAt: cached.cachedAt,
          source,
          title,
          count: cached.count ?? cachedChapters.length,
          latestOnly: true,
        }, BLOGGER_CHAPTERS_KV_TTL);
      } catch (error) {
        console.warn("[api/blogger/chapters] KV compact failed", error);
      }
    }

    return jsonResponse(
      {
        chapters: shapeChapters(responseChapters, full, listLimit),
        source: cached.source ?? source,
        title: cached.title ?? title,
        cachedAt: cached.cachedAt,
        count: cached.count ?? cachedChapters.length,
        full,
      },
      { origin, cacheStatus: "HIT" },
    );
  }

  try {
    const chapters = await fetchBloggerChapters(title, source);
    const latest = chapters[0];
    const payload: CachedPayload = {
      chapters: latest ? [latest] : [],
      cachedAt: new Date().toISOString(),
      source,
      title,
      count: chapters.length,
      latestOnly: true,
    };

    if (latest && (!cached?.latestOnly ||
        !isSameChapter(cachedChapters[0], latest) || !cacheIsFresh)) {
      try {
        await kvSet(cacheKey, payload, BLOGGER_CHAPTERS_KV_TTL);
      } catch (error) {
        console.warn("[api/blogger/chapters] KV put failed", error);
      }
    }
    const responseChapters = requestedChapter && full
      ? [findChapter(chapters, requestedChapter)].filter(
          (chapter): chapter is BloggerChapter => !!chapter,
        )
      : chapters;

    return jsonResponse(
      {
        chapters: shapeChapters(responseChapters, full, listLimit),
        source,
        title,
        cachedAt: payload.cachedAt,
        count: requestedChapter && full ? responseChapters.length : chapters.length,
        full,
      },
      { origin, cacheStatus: forceRefresh ? "BYPASS" : "MISS" },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal memuat feed Blogger.";
    console.error("[api/blogger/chapters]", message);

    const staleResponseChapters = requestedChapter && full
      ? [findChapter(cachedChapters, requestedChapter)].filter(
          (chapter): chapter is BloggerChapter => !!chapter,
        )
      : cached?.latestOnly === true ? [] : cachedChapters;
    if (cached && staleResponseChapters.length) {
      return jsonResponse(
        {
          chapters: shapeChapters(staleResponseChapters, full, listLimit),
          source: cached.source ?? source,
          title: cached.title ?? title,
          cachedAt: cached.cachedAt,
          count: cached.count ?? staleResponseChapters.length,
          stale: true,
          warning: message,
          full,
        },
        { origin, cacheStatus: "HIT" },
      );
    }

    return jsonResponse(
      { error: message, chapters: [] },
      { status: 502, origin, cacheStatus: "ERROR", maxAge: 0 },
    );
  }
}
