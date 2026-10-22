import { ImageResponse } from "next/og";

export function createMikorokuOgImage({
  title,
  description,
  label,
}: {
  title: string;
  description: string;
  label: string;
  image?: string | null;
}) {
  const safeTitle = (title || "Mikoroku").slice(0, 90);
  const safeDesc = (description || "Baca manga di Mikoroku.").slice(0, 110);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #111318 0%, #1a141c 50%, #2a1218 100%)",
          color: "#f5f5f5",
          fontFamily: "Arial, sans-serif",
          padding: "48px 56px",
          position: "relative",
        }}
      >
        {/* bar kiri */}
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
            width: "100%",
            height: "100%",
          }}
        >
          {/* header */}
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
              <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: 2 }}>MIKOROKU</span>
              <span style={{ fontSize: 13, color: "#aaa", letterSpacing: 1.5, marginTop: 2 }}>
                READ YOUR NEXT STORY
              </span>
            </div>
          </div>

          {/* konten */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 1000 }}>
            <div
              style={{
                alignSelf: "flex-start",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 999,
                padding: "6px 14px",
                color: "#ff8290",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 1.5,
              }}
            >
              {(label || "MANGA").toUpperCase()}
            </div>

            <div
              style={{
                fontSize: 44,
                fontWeight: 800,
                lineHeight: 1.15,
                letterSpacing: -0.5,
                color: "#fff",
              }}
            >
              {safeTitle}
            </div>

            <div
              style={{
                fontSize: 20,
                lineHeight: 1.4,
                color: "#c8c5cc",
              }}
            >
              {safeDesc}
            </div>
          </div>

          {/* footer */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#999", fontSize: 16 }}>
            <span style={{ color: "#ff6476", fontWeight: 700 }}>mikoroku.top</span>
            <span>·</span>
            <span>Manga, manhwa & more</span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}