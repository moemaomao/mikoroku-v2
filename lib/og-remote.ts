/**
 * Remote OG image generator (Vercel microservice).
 * Workers hanya fetch + cache; tidak menjalankan Satori/Resvg lokal.
 */

const DEFAULT_OG_SERVICE_URL = "https://mikoroku-og.vercel.app/api/og";

function getOgServiceUrl(): string {
  // Cloudflare Workers: env dari wrangler vars / secrets via process.env (OpenNext)
  // atau globalThis (custom worker). Fallback ke default.
  const fromEnv =
    (typeof process !== "undefined" && process.env?.OG_SERVICE_URL) ||
    (globalThis as { OG_SERVICE_URL?: string }).OG_SERVICE_URL;
  return (fromEnv || DEFAULT_OG_SERVICE_URL).replace(/\/$/, "");
}

function getOgApiKey(): string {
  const fromEnv =
    (typeof process !== "undefined" && process.env?.OG_API_KEY) ||
    (globalThis as { OG_API_KEY?: string }).OG_API_KEY;
  return fromEnv || "";
}

export async function fetchRemoteOgPng(opts: {
  title: string;
  description: string;
  label: string;
  coverUrl?: string | null;
}): Promise<ArrayBuffer> {
  const url = new URL(getOgServiceUrl());
  url.searchParams.set("title", (opts.title || "Mikoroku").slice(0, 120));
  url.searchParams.set(
    "description",
    (opts.description || "Baca manga di Mikoroku.").slice(0, 200),
  );
  url.searchParams.set("label", opts.label || "Manga & Series");

  if (
    opts.coverUrl &&
    typeof opts.coverUrl === "string" &&
    opts.coverUrl.startsWith("http")
  ) {
    // shrink blogger cover agar ringan
    let cover = opts.coverUrl;
    if (cover.includes("blogger.googleusercontent.com")) {
      cover = cover.replace(/\/s\d+(-[cwcwhh\d]+)?\//, "/s300/");
    }
    url.searchParams.set("cover", cover);
  }

  const headers: Record<string, string> = {
    Accept: "image/png",
    "User-Agent": "mikoroku-workers-og/1.0",
  };
  const apiKey = getOgApiKey();
  if (apiKey) {
    headers["x-og-key"] = apiKey;
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers,
    signal: AbortSignal.timeout(12_000),
  });

  if (!res.ok) {
    throw new Error(`OG service HTTP ${res.status}`);
  }

  const contentType = (res.headers.get("content-type") || "").toLowerCase();
  if (!contentType.includes("image/")) {
    throw new Error(`OG service returned non-image: ${contentType}`);
  }

  const buf = await res.arrayBuffer();
  if (buf.byteLength < 1000) {
    throw new Error("OG buffer too small");
  }
  return buf;
}
