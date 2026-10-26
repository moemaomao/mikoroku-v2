import { ImageResponse } from "next/og";

const FAVICON_URL = "https://i.ibb.co/B5g000HF/apple-touch-icon.png";

export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

const COVER_W = 280;
const COVER_H = 420;
const MAX_COVER_BYTES = 280_000;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
  }
  return btoa(binary);
}

function shrinkBloggerUrl(url: string): string {
  if (!url.includes("blogger.googleusercontent.com")) return url;
  return url.replace(/\/s\d+(-[cwcwhh\d]+)?\//, "/s300/");
}

function isPlaceholderCover(url: string): boolean {
  return (
    !url ||
    url.includes("MIKOROKU.png") ||
    url.includes("apple-touch-icon")
  );
}

export async function toOgCoverDataUrl(
  coverUrl: string | null | undefined,
): Promise<string | null> {
  if (!coverUrl || !coverUrl.startsWith("http") || isPlaceholderCover(coverUrl)) {
    return null;
  }

  const url = shrinkBloggerUrl(coverUrl);

  try {
    const res = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(2500),
      headers: {
        Accept: "image/jpeg,image/png,image/webp,image/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (compatible; MikorokuOG/1.2; +https://mikoroku.top)",
      },
      redirect: "follow",
    });

    if (!res.ok) {
      console.warn("[OG] cover HTTP", res.status, url);
      return null;
    }

    const contentType = (res.headers.get("content-type") || "").split(";")[0].trim();
    if (contentType && !contentType.startsWith("image/")) {
      return null;
    }

    const buf = await res.arrayBuffer();
    if (buf.byteLength < 100) return null;

    if (buf.byteLength > MAX_COVER_BYTES) {
      return url;
    }

    return `data:${contentType || "image/jpeg"};base64,${arrayBufferToBase64(buf)}`;
  } catch (error) {
    console.warn("[OG] cover fetch failed, trying remote URL", url, error);
    return url;
  }
}

function buildOgJsx({
  title,
  description,
  label,
  coverUrl,
}: {
  title: string;
  description: string;
  label: string;
  coverUrl?: string | null;
}) {
  const safeTitle = (title || "Mikoroku").slice(0, 72);
  const safeDesc = (description || "Baca manga di Mikoroku.").slice(0, 120);
  const hasCover =
    typeof coverUrl === "string" &&
    (coverUrl.startsWith("http") || coverUrl.startsWith("data:image/")) &&
    !isPlaceholderCover(coverUrl);

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background:
          "linear-gradient(135deg, #0f1115 0%, #17141a 55%, #241018 100%)",
        color: "#f5f5f5",
        fontFamily: "Arial, sans-serif",
        padding: "36px 40px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 8,
          background: "linear-gradient(180deg, #e11d48 0%, #f59e0b 100%)",
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: hasCover ? 800 : "100%",
          height: "100%",
          paddingRight: hasCover ? 24 : 0,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img
              src={FAVICON_URL}
              width={44}
              height={44}
              alt=""
              style={{ width: 44, height: 44, borderRadius: 10 }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  letterSpacing: 1,
                  color: "#fb7185",
                }}
              >
                MIKOROKU
              </span>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>
                READ YOUR NEXT STORY
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center" }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: 0.6,
                textTransform: "uppercase",
                color: "#fda4af",
                background: "rgba(225, 29, 72, 0.18)",
                border: "1px solid rgba(251, 113, 133, 0.35)",
                borderRadius: 999,
                padding: "5px 12px",
              }}
            >
              {label || "Manga & Series"}
            </span>
          </div>

          <div
            style={{
              fontSize: 42,
              fontWeight: 800,
              lineHeight: 1.12,
              color: "#fff",
              marginTop: 4,
              maxHeight: 150,
              overflow: "hidden",
            }}
          >
            {safeTitle}
          </div>

          <div
            style={{
              fontSize: 22,
              lineHeight: 1.35,
              color: "rgba(255,255,255,0.72)",
              maxHeight: 110,
              overflow: "hidden",
            }}
          >
            {safeDesc}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 16,
            color: "rgba(255,255,255,0.45)",
          }}
        >
          <span>mikoroku.top</span>
          <span>·</span>
          <span>Manga, manhwa & more</span>
        </div>
      </div>

      {hasCover ? (
        <div
          style={{
            position: "absolute",
            top: (OG_IMAGE_HEIGHT - COVER_H) / 2,
            right: 40,
            width: COVER_W,
            height: COVER_H,
            borderRadius: 16,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.18)",
            boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
            background: "#24232a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={coverUrl!}
            width={COVER_W}
            height={COVER_H}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      ) : null}
    </div>
  );
}

export function createMikorokuOgImage(opts: {
  title: string;
  description: string;
  label: string;
  coverUrl?: string | null;
}) {
  return new ImageResponse(buildOgJsx(opts), {
    width: OG_IMAGE_WIDTH,
    height: OG_IMAGE_HEIGHT,
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}

export async function renderOgPng(opts: {
  title: string;
  description: string;
  label: string;
  coverUrl?: string | null;
}): Promise<ArrayBuffer> {
  if (opts.coverUrl) {
    try {
      const withCover = createMikorokuOgImage(opts);
      const buf = await withCover.arrayBuffer();
      if (buf.byteLength > 1000) return buf;
    } catch (error) {
      console.warn("[OG] with cover failed", error);
    }
  }

  const plain = createMikorokuOgImage({ ...opts, coverUrl: null });
  return plain.arrayBuffer();
}
