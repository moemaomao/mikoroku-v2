import {
  CacheKeys,
  kvGetArrayBuffer,
  kvSetArrayBuffer,
} from "../../../../lib/kv-cache";
import {
  fetchRemoteOgPng,
  ogResponse,
  CACHE_HEADERS,
} from "../../../../lib/og-remote";

const CACHE_TTL = 86400;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const url = new URL(request.url);
    const version = url.searchParams.get("v") || "0";
    const cacheKey = `${CacheKeys.ogSeries(slug)}:v${version}`;

    try {
      const cached = await kvGetArrayBuffer(cacheKey);
      if (cached && cached.byteLength > 1000) {
        return new Response(cached, { headers: CACHE_HEADERS });
      }
    } catch (error) {
      console.warn("[OG series] KV read failed", error);
    }

    const buffer = await fetchRemoteOgPng({
      title: slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      description: "Baca manga dan series di Mikoroku.",
      label: "Manga & Series",
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

    return ogResponse(buffer);
  } catch (error) {
    console.error("[OG series] fatal", error);
    return new Response("OG image service is unavailable.", {
      status: 502,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}