import { getSeriesSeoData } from "../../../../../lib/seo-metadata";
import { createMikorokuOgImage } from "../../../../../lib/og-image";
import {
  CacheKeys,
  kvGetArrayBuffer,
  kvSetArrayBuffer,
} from "../../../../../lib/kv-cache";

const CACHE_TTL = 86400;
const CACHE_HEADERS = {
  "Content-Type": "image/png",
  "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; chapter: string }> },
) {
  const { slug, chapter } = await params;
  const cacheKey = CacheKeys.ogChapter(slug, chapter);

  const cached = await kvGetArrayBuffer(cacheKey);
  if (cached && cached.byteLength > 1000) {
    return new Response(cached, { headers: CACHE_HEADERS });
  }

  try {
    const series = await getSeriesSeoData(slug);
    const title = `Chapter ${chapter} - ${series.title}`;
    const description =
      series.description ||
      `Baca Chapter ${chapter} ${series.title} di Mikoroku.`;

    const imageRes = createMikorokuOgImage({
      title,
      description,
      label: "Manga Chapter",
      coverUrl: series.image,
    });

    const buffer = await imageRes.arrayBuffer();
    void kvSetArrayBuffer(cacheKey, buffer, CACHE_TTL);

    return new Response(buffer, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error("[OG chapter]", error);

    return createMikorokuOgImage({
      title: "Chapter - Mikoroku",
      description: "Baca manga di Mikoroku.",
      label: "Manga Chapter",
      coverUrl: null,
    });
  }
}