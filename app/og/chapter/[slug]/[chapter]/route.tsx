import { getSeriesSeoData } from "../../../../../lib/seo-metadata";
import {
  CacheKeys,
  kvGetArrayBuffer,
  kvSetArrayBuffer,
} from "../../../../../lib/kv-cache";
import {
  fetchRemoteOgPng,
  ogResponse,
  CACHE_HEADERS,
} from "../../../../../lib/og-remote";

const CACHE_TTL = 86400;

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

    const coverUrl =
      series.image &&
      series.image.startsWith("http") &&
      !series.image.includes("MIKOROKU.png") &&
      !series.image.includes("apple-touch-icon")
        ? series.image
        : null;

    const buffer = await fetchRemoteOgPng({
      title,
      description,
      label: "Manga Chapter",
      coverUrl,
    });

    if (!buffer) {
      return new Response("OG unavailable", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    try {
      void kvSetArrayBuffer(cacheKey, buffer, CACHE_TTL);
    } catch (error) {
      console.warn("[OG chapter] KV write failed", error);
    }

    return ogResponse(buffer);
  } catch (error) {
    console.error("[OG chapter]", error);
    return new Response("OG unavailable", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }
}