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
  const safeTitle = (title || "Mikoroku").slice(0, 80);
  const safeDesc = (description || "Baca manga di Mikoroku.").slice(0, 160);
  const hasCover =
    typeof coverUrl === "string" &&
    coverUrl.startsWith("http") &&
    !coverUrl.includes("MIKOROKU.png");

  const COVER_W = 320;
  const COVER_H = 480;

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

            {/* Title lebih besar */}
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

            {/* Description lebih besar */}
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