import { ImageResponse } from "next/og";

const FAVICON_URL = "https://mikoroku.top/assets/icons/apple-touch-icon.png";

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
  const safeTitle = (title || "Mikoroku").slice(0, 70);
  const safeDesc = (description || "Baca manga di Mikoroku.").slice(0, 90);
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
          padding: "28px 34px",
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
            width: 7,
            background: "linear-gradient(180deg, #ff4d5e, #a52335)",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: hasCover ? 460 : "100%",
            height: "100%",
            zIndex: 1,
          }}
        >
          
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img
              src={FAVICON_URL}
              width={34}
              height={34}
              alt=""
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                objectFit: "cover",
              }}
            />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{ fontSize: 15, fontWeight: 800, letterSpacing: 1.5 }}
              >
                MIKOROKU
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: "#a9a9b1",
                  letterSpacing: 1.2,
                  marginTop: 2,
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
              gap: 10,
              maxWidth: 430,
            }}
          >
            <div
              style={{
                alignSelf: "flex-start",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 999,
                padding: "4px 10px",
                color: "#ff8290",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1.2,
              }}
            >
              {(label || "MANGA").toUpperCase()}
            </div>

            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                lineHeight: 1.15,
                letterSpacing: -0.4,
                color: "#fff",
              }}
            >
              {safeTitle}
            </div>

            <div style={{ fontSize: 14, lineHeight: 1.35, color: "#c3c1c8" }}>
              {safeDesc}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "#999",
              fontSize: 12,
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
              top: 30,
              right: 34,
              width: 230,
              height: 340,
              borderRadius: 12,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.18)",
              boxShadow: "0 14px 40px rgba(0,0,0,0.5)",
              background: "#24232a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src={coverUrl!}
              width={230}
              height={340}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        ) : null}
      </div>
    ),
    {
      width: 800,
      height: 420,
      headers: {
        "Cache-Control":
          "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}