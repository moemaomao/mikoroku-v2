import { NextRequest, NextResponse } from "next/server";
import { CacheKeys, kvDelete } from "../../../../lib/kv-cache";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
    const chapter = typeof body?.chapter === "string" ? body.chapter.trim() : "";

    if (!slug) {
      return NextResponse.json({ error: "slug required" }, { status: 400 });
    }

    await kvDelete(CacheKeys.ogSeries(slug));
    await kvDelete(`${CacheKeys.ogSeries(slug)}:v0`);

    if (chapter) {
      await kvDelete(CacheKeys.ogChapter(slug, chapter));
    }

    return NextResponse.json({ ok: true, slug, chapter: chapter || null });
  } catch (error) {
    console.error("[purge-og]", error);
    return NextResponse.json({ error: "failed to purge" }, { status: 500 });
  }
}
