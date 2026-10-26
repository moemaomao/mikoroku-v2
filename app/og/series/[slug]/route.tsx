import { getSeriesSeoDataForOg } from "../../../../lib/seo-metadata";
import {
  createMikorokuOgImage,
  toOgCoverDataUrl,
  renderOgPng,
} from "../../../../lib/og-image";
import {
  CacheKeys,
  kvGetArrayBuffer,
  kvSetArrayBuffer,
} from "../../../../lib/kv-cache";

const CACHE_TTL = 86400;
const CACHE_HEADERS: HeadersInit = {
  "Content-Type": "image/png",
  "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
  "Access-Control-Allow-Origin": "*",
};

function isUsableCover(url: string | null | undefined): url is string {
  return Boolean(
    url &&
      typeof url === "string" &&
      url.startsWith("http") &&
      !url.includes("MIKOROKU.png") &&
      !url.includes("apple-touch-icon"),
  );
}

function isRenderableCover(url: string | null | undefined): url is string {
  return Boolean(
    url &&
      typeof url === "string" &&
      (url.startsWith("data:image/") || isUsableCover(url)),
  );
}

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
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

async function fallbackPng(): Promise<ArrayBuffer> {
  const fallback = createMikorokuOgImage({
    title: "Mikoroku",
    description: "Platform baca manga bahasa Indonesia.",
    label: "Manga & Series",
    coverUrl: null,
  });
  return fallback.arrayBuffer();
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const cacheKey = CacheKeys.ogSeries(slug);

    try {
      const cached = await kvGetArrayBuffer(cacheKey);
      if (cached && cached.byteLength > 1000) {
        return new Response(cached, { headers: CACHE_HEADERS });
      }
    } catch (error) {
      console.warn("[OG series] KV read failed", error);
    }

    const series = await withTimeout(
      getSeriesSeoDataForOg(slug),
      4000,
      {
        title: slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        description: "Baca manga di Mikoroku.",
        image: "",
      },
    );

    let coverUrl: string | null = null;
    if (isUsableCover(series.image)) {
      const prepared = await withTimeout(
        toOgCoverDataUrl(series.image),
        2500,
        series.image,
      );
      coverUrl = isRenderableCover(prepared) ? prepared : series.image;
    }

    let buffer: ArrayBuffer;
    try {
      buffer = await renderOgPng({
        title: series.title,
        description: series.description,
        label: "Manga & Series",
        coverUrl,
      });
    } catch (error) {
      console.warn("[OG series] render with cover failed", error);
      buffer = await renderOgPng({
        title: series.title,
        description: series.description,
        label: "Manga & Series",
        coverUrl: null,
      });
    }

    if (!buffer || buffer.byteLength < 1000) {
      buffer = await fallbackPng();
    }

    try {
      void kvSetArrayBuffer(cacheKey, buffer, CACHE_TTL);
    } catch (error) {
      console.warn("[OG series] KV write failed", error);
    }

    return new Response(buffer, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error("[OG series] fatal", error);
    try {
      const buffer = await fallbackPng();
      return new Response(buffer, { status: 200, headers: CACHE_HEADERS });
    } catch {
      return new Response("OG unavailable", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }
  }
}
