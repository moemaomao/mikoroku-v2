import { NextRequest, NextResponse } from "next/server";
import { CacheKeys, kvDelete } from "../../../../lib/kv-cache";
import { seoCacheKey } from "../../../../lib/seo-metadata";

/**
 * Aggressive OG + SEO cache purge.
 * Body: { slug: string, chapter?: string, versions?: number[] }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
    const chapter = typeof body?.chapter === "string" ? body.chapter.trim() : "";
    const versions = Array.isArray(body?.versions)
      ? body.versions.filter((v: unknown) => typeof v === "number" && Number.isFinite(v))
      : [];

    if (!slug) {
      return NextResponse.json({ error: "slug required" }, { status: 400 });
    }

    const deleted: string[] = [];
    const keys = new Set<string>([
      seoCacheKey(slug),
      CacheKeys.ogSeries(slug),
      `${CacheKeys.ogSeries(slug)}:v0`,
      // common stale keys when updatedAt missing
      `${CacheKeys.ogSeries(slug)}:vundefined`,
      `${CacheKeys.ogSeries(slug)}:vnull`,
    ]);

    for (const v of versions) {
      keys.add(`${CacheKeys.ogSeries(slug)}:v${v}`);
    }

    // also purge a few recent timestamp windows in case client used old v=
    const now = Date.now();
    for (const offset of [0, 60_000, 300_000, 3_600_000, 86_400_000]) {
      keys.add(`${CacheKeys.ogSeries(slug)}:v${now - offset}`);
    }

    if (chapter) {
      keys.add(CacheKeys.ogChapter(slug, chapter));
      keys.add(`${CacheKeys.ogChapter(slug, chapter)}:v0`);
    }

    for (const key of keys) {
      try {
        await kvDelete(key);
        deleted.push(key);
      } catch {
        // ignore individual failures
      }
    }

    return NextResponse.json({
      ok: true,
      slug,
      chapter: chapter || null,
      deletedCount: deleted.length,
      deleted,
    });
  } catch (error) {
    console.error("[purge-og]", error);
    return NextResponse.json({ error: "failed to purge" }, { status: 500 });
  }
}
