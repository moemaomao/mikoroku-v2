import { NextRequest, NextResponse } from "next/server";
import { hasKvBinding, kvGet, kvSet } from "../../../lib/kv-cache";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const CACHE_KEY_PREFIX = "series:statistics:v1:";
const CACHE_FRESH_TTL_MS = 12 * 60 * 60 * 1000;
const CACHE_EXPIRATION_SECONDS = 48 * 60 * 60;

type SeriesStatisticsSnapshot = {
  slug: string;
  views: number;
  bookmarks: number;
  notifications: number;
  syncedAt: number;
};

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function validSlug(value: string): boolean {
  return /^[\p{L}\p{N}-]{1,200}$/u.test(value);
}

function parseSnapshot(value: unknown, slug: string): SeriesStatisticsSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Partial<SeriesStatisticsSnapshot>;
  if (
    record.slug !== slug ||
    !isCount(record.views) ||
    !isCount(record.bookmarks) ||
    !isCount(record.notifications) ||
    !isCount(record.syncedAt)
  ) return null;
  if (record.syncedAt > Date.now() + 60_000) return null;
  return {
    slug,
    views: record.views,
    bookmarks: record.bookmarks,
    notifications: record.notifications,
    syncedAt: record.syncedAt,
  };
}

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug") || "";
  if (!validSlug(slug)) {
    return NextResponse.json({ error: "Invalid series slug." }, { status: 400 });
  }
  if (!hasKvBinding()) {
    return NextResponse.json({ error: "Shared statistics cache is not configured." }, { status: 503 });
  }

  try {
    const snapshot = parseSnapshot(
      await kvGet<unknown>(`${CACHE_KEY_PREFIX}${encodeURIComponent(slug)}`),
      slug,
    );
    if (!snapshot) return NextResponse.json({ error: "Statistics cache miss." }, { status: 404 });
    return NextResponse.json({
      data: snapshot,
      stale: Date.now() - snapshot.syncedAt >= CACHE_FRESH_TTL_MS,
    }, {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[api/series-statistics] KV read failed.", error);
    return NextResponse.json({ error: "Could not read shared series statistics." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Same-origin request required." }, { status: 403 });
  }
  if (!hasKvBinding()) {
    return NextResponse.json({ error: "Shared statistics cache is not configured." }, { status: 503 });
  }

  try {
    const body: unknown = await request.json();
    const record = body && typeof body === "object" && !Array.isArray(body)
      ? body as Record<string, unknown>
      : null;
    const slug = typeof record?.slug === "string" ? record.slug : "";
    const snapshot = parseSnapshot(record, slug);
    if (!snapshot) {
      return NextResponse.json({ error: "Invalid series statistics." }, { status: 400 });
    }

    const key = `${CACHE_KEY_PREFIX}${encodeURIComponent(slug)}`;
    const existing = parseSnapshot(await kvGet<unknown>(key), slug);
    if (existing && existing.syncedAt > snapshot.syncedAt) {
      return NextResponse.json({ ok: true, stored: false }, { status: 200 });
    }

    await kvSet(
      key,
      snapshot,
      CACHE_EXPIRATION_SECONDS,
    );
    return NextResponse.json({ ok: true, stored: true }, { status: 200 });
  } catch (error) {
    console.error("[api/series-statistics] KV write failed.", error);
    return NextResponse.json({ error: "Could not write shared series statistics." }, { status: 500 });
  }
}
