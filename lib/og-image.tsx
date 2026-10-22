import { ImageResponse } from "next/og";

const FAVICON_URL = "https://i.ibb.co/B5g000HF/apple-touch-icon.png";

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
  const safeTitle = (title || "Mikoroku").slice(0, 60);
  const safeDesc = (description || "Baca manga di Mikoroku.").slice(0, 75);
  const hasCover =
    typeof coverUrl === "string" &&
    coverUrl.startsWith("http") &&
    !coverUrl.includes("MIKOROKU.png");

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
          padding: "20px 24px",
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
            width: 5,
            background: "linear-gradient(180deg, #ff4d5e, #a52335)",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: hasCover ? 340 : "100%",
            height: "100%",
            zIndex: 1,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img
              src={FAVICON_URL}
              width={26}
              height={26}
              alt=""
              style={{
                width: 26,
                height: 26,
                borderRadius: 7,
                objectFit: "cover",
              }}
            />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.2 }}
              >
                MIKOROKU
              </span>
              <span
                style={{
                  fontSize: 8,
                  color: "#a9a9b1",
                  letterSpacing: 1,
                  marginTop: 1,
                }}
              >
                READ YOUR NEXT STORY
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              maxWidth: 320,
            }}
          >
            <div
              style={{
                alignSelf: "flex-start",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 999,
                padding: "3px 8px",
                color: "#ff8290",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: 1,
              }}
            >
              {(label || "MANGA").toUpperCase()}
            </div>

            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                lineHeight: 1.15,
                letterSpacing: -0.3,
                color: "#fff",
              }}
            >
              {safeTitle}
            </div>

            <div style={{ fontSize: 11, lineHeight: 1.35, color: "#c3c1c8" }}>
              {safeDesc}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              color: "#999",
              fontSize: 10,
            }}
          >
            <span style={{ color: "#ff6476", fontWeight: 700 }}>
              mikoroku.top
            </span>
            <span>·</span>
            <span>Manga, manhwa & more</span>
          </div>
        </div>

        {hasCover ? (
          <div
            style={{
              position: "absolute",
              top: 22,
              right: 24,
              width: 172,
              height: 255,
              borderRadius: 10,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.18)",
              boxShadow: "0 10px 28px rgba(0,0,0,0.5)",
              background: "#24232a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src={coverUrl!}
              width={172}
              height={255}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        ) : null}
      </div>
    ),
    {
      width: 600,
      height: 315,
      headers: {
        "Cache-Control":
          "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}