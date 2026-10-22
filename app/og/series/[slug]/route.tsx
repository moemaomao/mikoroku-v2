import { getSeriesSeoData } from "../../../../lib/seo-metadata";
import { createMikorokuOgImage } from "../../../../lib/og-image";
import {
  CacheKeys,
  kvGetArrayBuffer,
  kvSetArrayBuffer,
} from "../../../../lib/kv-cache";

const CACHE_TTL = 86400; // 1 hari
const CACHE_HEADERS = {
  "Content-Type": "image/png",
  "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const cacheKey = CacheKeys.ogSeries(slug);

  // 1) cek KV dulu
  const cached = await kvGetArrayBuffer(cacheKey);
  if (cached && cached.byteLength > 1000) {
    return new Response(cached, { headers: CACHE_HEADERS });
  }

  try {
    const series = await getSeriesSeoData(slug);
    const imageRes = createMikorokuOgImage({
      title: series.title,
      description: series.description,
      label: "Manga & Series",
      coverUrl: series.image,
    });

    const buffer = await imageRes.arrayBuffer();

    // 2) simpan ke KV (jangan block response terlalu lama)
    void kvSetArrayBuffer(cacheKey, buffer, CACHE_TTL);

    return new Response(buffer, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error("[OG series]", error);

    const fallback = createMikorokuOgImage({
      title: "Mikoroku",
      description: "Platform baca manga bahasa Indonesia.",
      label: "Manga & Series",
      coverUrl: null,
    });
    return fallback;
  }
}