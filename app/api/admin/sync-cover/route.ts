import { NextRequest, NextResponse } from "next/server";
import { kvSet, kvDelete, CacheKeys } from "../../../../lib/kv-cache";
import { coverOverrideKey } from "../../../../lib/seo-metadata";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
    const cover = typeof body?.cover === "string" ? body.cover.trim() : "";
    const updatedAt =
      typeof body?.updatedAt === "number" && Number.isFinite(body.updatedAt)
        ? body.updatedAt
        : Date.now();

    if (!slug) {
      return NextResponse.json({ error: "slug required" }, { status: 400 });
    }

    if (!cover || !/^https?:\/\//i.test(cover)) {
      return NextResponse.json({ error: "valid cover URL required" }, { status: 400 });
    }

    await kvSet(coverOverrideKey(slug), { cover, updatedAt }, 365 * 24 * 3600);

    try {
      await kvDelete(CacheKeys.ogSeries(slug));
      await kvDelete(`${CacheKeys.ogSeries(slug)}:v0`);
      await kvDelete(`${CacheKeys.ogSeries(slug)}:v${updatedAt}`);
    } catch {
      // ignore
    }

    return NextResponse.json({ ok: true, slug, cover, updatedAt });
  } catch (error) {
    console.error("[sync-cover]", error);
    return NextResponse.json({ error: "failed to sync cover" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
    if (!slug) {
      return NextResponse.json({ error: "slug required" }, { status: 400 });
    }
    await kvDelete(coverOverrideKey(slug));
    await kvDelete(CacheKeys.ogSeries(slug));
    return NextResponse.json({ ok: true, slug });
  } catch (error) {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
