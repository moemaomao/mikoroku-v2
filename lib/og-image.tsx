import { ImageResponse } from "next/og";

const FAVICON_URL = "https://i.ibb.co/B5g000HF/apple-touch-icon.png";

export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

export function createMikorokuOgImage({
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
  const safeDesc = (description || "Baca manga di Mikoroku.").slice(0, 140);
  const hasCover =
    typeof coverUrl === "string" &&
    coverUrl.startsWith("http") &&
    !coverUrl.includes("MIKOROKU.png");

  const COVER_W = 260;
  const COVER_H = 390;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(135deg, #0f1115 0%, #17141a 55%, #241018 100%)",
          color: "#f5f5f5",
          fontFamily: "Arial, sans-serif",
          padding: "36px 44px",
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
            width: hasCover ? OG_IMAGE_WIDTH - COVER_W - 120 : "100%",
            height: "100%",
            paddingRight: hasCover ? 20 : 0,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
                    letterSpacing: 1.1,
                    color: "#fb7185",
                  }}
                >
                  MIKOROKU
                </span>
                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>
                  READ YOUR NEXT STORY
                </span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginTop: 4,
              }}
            >
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
                fontSize: hasCover ? 40 : 44,
                fontWeight: 800,
                lineHeight: 1.12,
                color: "#fff",
                marginTop: 6,
                maxHeight: 150,
                overflow: "hidden",
              }}
            >
              {safeTitle}
            </div>

            <div
              style={{
                fontSize: 20,
                lineHeight: 1.35,
                color: "rgba(255,255,255,0.7)",
                maxHeight: 100,
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
              color: "rgba(255,255,255,0.4)",
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
              borderRadius: 14,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.16)",
              boxShadow: "0 14px 36px rgba(0,0,0,0.45)",
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
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </div>
        ) : null}
      </div>
    ),
    {
      width: OG_IMAGE_WIDTH,
      height: OG_IMAGE_HEIGHT,
      headers: {
        "Cache-Control":
          "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}