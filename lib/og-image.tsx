import { ImageResponse } from "next/og";

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
  const safeTitle = (title || "Mikoroku").slice(0, 85);
  const safeDesc = (description || "Baca manga di Mikoroku.").slice(0, 110);
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
          padding: "44px 52px",
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
            background: "linear-gradient(180deg, #ff4d5e, #a52335)",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: hasCover ? 680 : "100%",
            height: "100%",
            zIndex: 1,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "#d8374b",
                color: "white",
                fontSize: 24,
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              M
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: 2 }}>
                MIKOROKU
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: "#a9a9b1",
                  letterSpacing: 1.5,
                  marginTop: 3,
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
              gap: 14,
              maxWidth: 640,
            }}
          >
            <div
              style={{
                alignSelf: "flex-start",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 999,
                padding: "6px 14px",
                color: "#ff8290",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 1.4,
              }}
            >
              {(label || "MANGA").toUpperCase()}
            </div>

            <div
              style={{
                fontSize: 40,
                fontWeight: 800,
                lineHeight: 1.15,
                letterSpacing: -0.5,
                color: "#fff",
              }}
            >
              {safeTitle}
            </div>

            <div style={{ fontSize: 18, lineHeight: 1.4, color: "#c3c1c8" }}>
              {safeDesc}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "#999",
              fontSize: 15,
            }}
          >
            <span style={{ color: "#ff6476", fontWeight: 700 }}>mikoroku.top</span>
            <span>·</span>
            <span>Manga, manhwa & more</span>
          </div>
        </div>

        {hasCover ? (
          <div
            style={{
              position: "absolute",
              top: 48,
              right: 52,
              width: 340,
              height: 500,
              borderRadius: 18,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.18)",
              boxShadow: "0 22px 60px rgba(0,0,0,0.55)",
              background: "#24232a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverUrl!}
              width={340}
              height={500}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        ) : null}
      </div>
    ),
    { width: 1200, height: 630 },
  );
}