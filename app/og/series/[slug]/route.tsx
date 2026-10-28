import { getSeriesSeoDataForOg } from "../../../../lib/seo-metadata";
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

function isUsableCover(url: string | null | undefined): url is string {
  return Boolean(
    url &&
      typeof url === "string" &&
      url.startsWith("http") &&
      !url.includes("MIKOROKU.png") &&
      !url.includes("apple-touch-icon"),
  );
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

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

    const series = await withTimeout(getSeriesSeoDataForOg(slug), 4000, {
      title: slug
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      description: "Baca manga di Mikoroku.",
      image: "",
    });

    const coverUrl = isUsableCover(series.image) ? series.image : null;

    const buffer = await fetchRemoteOgPng({
      title: series.title,
      description: series.description,
      label: "Manga & Series",
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
      console.warn("[OG series] KV write failed", error);
    }

    return ogResponse(buffer);
  } catch (error) {
    console.error("[OG series] fatal", error);
    return new Response("OG unavailable", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }
}