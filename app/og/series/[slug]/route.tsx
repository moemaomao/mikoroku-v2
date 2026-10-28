import {
  getSeriesSeoDataForOg,
  isUsableSeriesCover,
} from "../../../../lib/seo-metadata";
import {
  CacheKeys,
  kvGetArrayBuffer,
  kvSetArrayBuffer,
} from "../../../../lib/kv-cache";
import {
  fetchRemoteOgPng,
  CACHE_HEADERS,
} from "../../../../lib/og-remote";

const CACHE_TTL = 86400;
const SERIES_OG_HEADERS = {
  ...CACHE_HEADERS,
  "Cache-Control": "public, max-age=0, s-maxage=0, must-revalidate",
};

function coverCacheVersion(
  coverUrl: string,
  title: string,
  description: string,
): string {
  const value = `${coverUrl}\u0000${title}\u0000${description}`;
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const url = new URL(request.url);
    const version = url.searchParams.get("v") || "0";
    const series = await getSeriesSeoDataForOg(slug);
    const coverUrl = isUsableSeriesCover(series.image) ? series.image : "";
    const cacheKey =
      `${CacheKeys.ogSeries(slug)}:v${version}:c${coverCacheVersion(
        coverUrl,
        series.title,
        series.description,
      )}`;

    try {
      const cached = await kvGetArrayBuffer(cacheKey);
      if (cached && cached.byteLength > 1000) {
        return new Response(cached, { headers: SERIES_OG_HEADERS });
      }
    } catch (error) {
      console.warn("[OG series] KV read failed", error);
    }

    const buffer = await fetchRemoteOgPng({
      title: series.title,
      description: series.description,
      label: "Manga & Series",
      coverUrl: coverUrl || null,
    });

    if (!buffer) {
      return new Response("OG image service is unavailable.", {
        status: 502,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    try {
      void kvSetArrayBuffer(cacheKey, buffer, CACHE_TTL);
    } catch (error) {
      console.warn("[OG series] KV write failed", error);
    }

    return new Response(buffer, { headers: SERIES_OG_HEADERS });
  } catch (error) {
    console.error("[OG series] fatal", error);
    return new Response("OG image service is unavailable.", {
      status: 502,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}