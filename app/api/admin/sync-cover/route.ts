import { NextRequest, NextResponse } from "next/server";
import { kvSet, kvDelete, CacheKeys } from "../../../../lib/kv-cache";
import { seoCacheKey } from "../../../../lib/seo-metadata";

const SEO_TTL = 365 * 24 * 3600;

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const descriptionRaw =
      typeof body?.description === "string"
        ? body.description
        : typeof body?.desc === "string"
          ? body.desc
          : "";
    const cover = typeof body?.cover === "string" ? body.cover.trim() : "";
    const updatedAt =
      typeof body?.updatedAt === "number" && Number.isFinite(body.updatedAt)
        ? body.updatedAt
        : Date.now();

    if (!slug) {
      return NextResponse.json({ error: "slug required" }, { status: 400 });
    }

    if (!cover || !/^https?:\/\//i.test(cover)) {
      return NextResponse.json(
        { error: "valid cover URL required" },
        { status: 400 },
      );
    }

    const description =
      stripHtml(descriptionRaw).slice(0, 300) ||
      `Baca manga ${title || slug} di Mikoroku.`;

    const payload = {
      title: title || slug,
      description,
      image: cover,
      cover,
      updatedAt,
    };

    await kvSet(seoCacheKey(slug), payload, SEO_TTL);

    try {
      await kvDelete(CacheKeys.ogSeries(slug));
      await kvDelete(`${CacheKeys.ogSeries(slug)}:v0`);
      await kvDelete(`${CacheKeys.ogSeries(slug)}:v${updatedAt}`);
    } catch {
      // ignore
    }

    return NextResponse.json({ ok: true, slug, ...payload });
  } catch (error) {
    console.error("[sync-seo]", error);
    return NextResponse.json({ error: "failed to sync seo" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
    if (!slug) {
      return NextResponse.json({ error: "slug required" }, { status: 400 });
    }
    await kvDelete(seoCacheKey(slug));
    await kvDelete(CacheKeys.ogSeries(slug));
    return NextResponse.json({ ok: true, slug });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
