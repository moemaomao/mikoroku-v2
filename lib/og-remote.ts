/**
 * Remote OG image client — panggil Vercel microservice.
 * Env (Cloudflare Workers / wrangler):
 *   OG_SERVICE_URL  e.g. https://mikoroku-og.vercel.app
 *   OG_API_KEY      same secret as Vercel
 */

const CACHE_HEADERS: HeadersInit = {
  "Content-Type": "image/png",
  "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
  "Access-Control-Allow-Origin": "*",
};

function readEnv(name: string): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = globalThis as any;
    const fromProcess =
      typeof process !== "undefined" && process.env
        ? process.env[name]
        : undefined;
    const fromGlobal = g?.[name] ?? g?.process?.env?.[name];
    return String(fromProcess ?? fromGlobal ?? "").trim();
  } catch {
    return "";
  }
}

function getOgServiceUrl(): string {
  const v = readEnv("OG_SERVICE_URL");
  return (v || "https://mikoroku-og.vercel.app").replace(/\/$/, "");
}

function getOgApiKey(): string {
  return readEnv("OG_API_KEY");
}

export async function fetchRemoteOgPng(opts: {
  title: string;
  description: string;
  label: string;
  coverUrl?: string | null;
}): Promise<ArrayBuffer | null> {
  const base = getOgServiceUrl();
  const key = getOgApiKey();
  if (!base || !key) {
    console.warn("[og-remote] OG_SERVICE_URL or OG_API_KEY missing");
    return null;
  }

  const params = new URLSearchParams();
  params.set("title", (opts.title || "Mikoroku").slice(0, 72));
  params.set(
    "description",
    (opts.description || "Baca manga di Mikoroku.").slice(0, 120),
  );
  params.set("label", opts.label || "Manga");
  if (opts.coverUrl && opts.coverUrl.startsWith("http")) {
    params.set("cover", opts.coverUrl);
  }

  const url = `${base}/api/og?${params.toString()}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "x-og-key": key,
        Accept: "image/png",
      },
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (!res.ok) {
      console.warn(
        "[og-remote] HTTP",
        res.status,
        await res.text().catch(() => ""),
      );
      return null;
    }

    const buf = await res.arrayBuffer();
    if (!buf || buf.byteLength < 1000) {
      console.warn("[og-remote] empty/small body", buf?.byteLength);
      return null;
    }
    return buf;
  } catch (error) {
    console.warn("[og-remote] fetch failed", error);
    return null;
  }
}

export function ogResponse(buffer: ArrayBuffer, status = 200): Response {
  return new Response(buffer, { status, headers: CACHE_HEADERS });
}

export { CACHE_HEADERS };