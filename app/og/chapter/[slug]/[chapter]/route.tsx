import { getSeriesSeoData } from "../../../../../lib/seo-metadata";
import {
  createMikorokuOgImage,
  toOgCoverDataUrl,
} from "../../../../../lib/og-image";
import {
  CacheKeys,
  kvGetArrayBuffer,
  kvSetArrayBuffer,
} from "../../../../../lib/kv-cache";

const CACHE_TTL = 86400;
const CACHE_HEADERS: HeadersInit = {
  "Content-Type": "image/png",
  "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
  "Access-Control-Allow-Origin": "*",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; chapter: string }> },
) {
  const { slug, chapter } = await params;
  const cacheKey = CacheKeys.ogChapter(slug, chapter);

  try {
    const cached = await kvGetArrayBuffer(cacheKey);
    if (cached && cached.byteLength > 1000) {
      return new Response(cached, { headers: CACHE_HEADERS });
    }
  } catch (error) {
    console.warn("[OG chapter] KV read failed", error);
  }

  try {
    const series = await getSeriesSeoData(slug);
    const title = `Chapter ${chapter} - ${series.title}`;
    const description =
      series.description ||
      `Baca Chapter ${chapter} ${series.title} di Mikoroku.`;

    const coverDataUrl = await toOgCoverDataUrl(series.image);

    const imageRes = createMikorokuOgImage({
      title,
      description,
      label: "Manga Chapter",
      coverUrl: coverDataUrl,
    });

    const buffer = await imageRes.arrayBuffer();
    if (buffer.byteLength < 1000) {
      throw new Error("OG buffer too small");
    }

    try {
      void kvSetArrayBuffer(cacheKey, buffer, CACHE_TTL);
    } catch (error) {
      console.warn("[OG chapter] KV write failed", error);
    }

    return new Response(buffer, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error("[OG chapter]", error);

    const fallback = createMikorokuOgImage({
      title: "Chapter - Mikoroku",
      description: "Baca manga di Mikoroku.",
      label: "Manga Chapter",
      coverUrl: null,
    });
    const buffer = await fallback.arrayBuffer();
    return new Response(buffer, { status: 200, headers: CACHE_HEADERS });
  }
}