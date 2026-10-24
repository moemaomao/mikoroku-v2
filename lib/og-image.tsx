import { ImageResponse } from "next/og";

const FAVICON_URL = "https://i.ibb.co/B5g000HF/apple-touch-icon.png";

export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

const COVER_W = 320;
const COVER_H = 480;

function isSafeCoverHost(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return (
      host === "i.ibb.co" ||
      host === "ibb.co" ||
      host.endsWith(".ibb.co") ||
      host === "image.ibb.co"
    );
  } catch {
    return false;
  }
}

export async function toOgCoverDataUrl(
  coverUrl: string | null | undefined,
): Promise<string | null> {
  if (
    !coverUrl ||
    !coverUrl.startsWith("http") ||
    coverUrl.includes("MIKOROKU.png")
  ) {
    return null;
  }

  if (coverUrl.includes("blogger.googleusercontent.com")) {
    return null;
  }

  if (isSafeCoverHost(coverUrl)) {
    return coverUrl;
  }

  try {
    const res = await fetch(coverUrl, {
      signal: AbortSignal.timeout(3000),
      headers: {
        Accept: "image/*,*/*;q=0.8",
        "User-Agent": "MikorokuOG/1.0",
      },
      redirect: "follow",
    });
    if (!res.ok) return null;

    const contentType = (res.headers.get("content-type") || "image/jpeg")
      .split(";")[0]
      .trim();
    if (!contentType.startsWith("image/")) return null;

    const buf = await res.arrayBuffer();
    if (buf.byteLength < 100 || buf.byteLength > 800_000) return null;

    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]!);
    }
    return `data:${contentType};base64,${btoa(binary)}`;
  } catch {
    return null;
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
  const safeTitle = (title || "Mikoroku").slice(0, 80);
  const safeDesc = (description || "Baca manga di Mikoroku.").slice(0, 160);
  const hasCover =
    typeof coverUrl === "string" &&
    (coverUrl.startsWith("http") || coverUrl.startsWith("data:image/"));

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
        padding: "40px 44px",
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
          width: 10,
          background: "linear-gradient(180deg, #e11d48 0%, #f59e0b 100%)",
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: hasCover ? 760 : "100%",
          height: "100%",
          paddingRight: hasCover ? 28 : 0,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img
              src={FAVICON_URL}
              width={52}
              height={52}
              alt=""
              style={{ width: 52, height: 52, borderRadius: 12 }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: 1.2,
                  color: "#fb7185",
                }}
              >
                MIKOROKU
              </span>
              <span style={{ fontSize: 15, color: "rgba(255,255,255,0.55)" }}>
                READ YOUR NEXT STORY
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", marginTop: 4 }}>
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: 0.7,
                textTransform: "uppercase",
                color: "#fda4af",
                background: "rgba(225, 29, 72, 0.18)",
                border: "1px solid rgba(251, 113, 133, 0.35)",
                borderRadius: 999,
                padding: "6px 14px",
              }}
            >
              {label || "Manga & Series"}
            </span>
          </div>

          <div
            style={{
              fontSize: 48,
              fontWeight: 800,
              lineHeight: 1.12,
              color: "#fff",
              marginTop: 6,
              maxHeight: 170,
              overflow: "hidden",
            }}
          >
            {safeTitle}
          </div>

          <div
            style={{
              fontSize: 24,
              lineHeight: 1.4,
              color: "rgba(255,255,255,0.72)",
              maxHeight: 130,
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
            gap: 10,
            fontSize: 18,
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
            right: 44,
            width: COVER_W,
            height: COVER_H,
            borderRadius: 18,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.18)",
            boxShadow: "0 18px 48px rgba(0,0,0,0.5)",
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