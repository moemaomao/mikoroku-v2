import { ImageResponse } from "next/og";

export function createMikorokuOgImage({
  title,
  description,
  image,
  label,
}: {
  title: string;
  description: string;
  image: string;
  label: string;
}) {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          position: "relative",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          padding: "48px 56px",
          color: "#f7f7f8",
          background: "linear-gradient(120deg, #111318 0%, #19141b 58%, #29141b 100%)",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 0,
            left: 0,
            width: 12,
            height: "100%",
            background: "linear-gradient(180deg, #ff4d5e 0%, #a52335 100%)",
          }}
        />
        <div
          style={{
            display: "flex",
            position: "absolute",
            right: 0,
            top: 0,
            width: 590,
            height: "100%",
            background: "linear-gradient(90deg, #19141b 0%, rgba(25,20,27,0.25) 100%)",
          }}
        />
        <div
          style={{
            display: "flex",
            zIndex: 1,
            width: 660,
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "8px 0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                display: "flex",
                width: 48,
                height: 48,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 14,
                background: "#d8374b",
                color: "white",
                fontSize: 25,
                fontWeight: 800,
              }}
            >
              M
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: 2 }}>MIKOROKU</span>
              <span style={{ marginTop: 4, color: "#a9a9b1", fontSize: 13, letterSpacing: 2 }}>
                READ YOUR NEXT STORY
              </span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", width: 640 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                alignSelf: "flex-start",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 999,
                padding: "8px 14px",
                color: "#ff8290",
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: 1.5,
              }}
            >
              {label.toUpperCase()}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 22,
                maxHeight: 150,
                overflow: "hidden",
                color: "#fff",
                fontSize: 46,
                fontWeight: 800,
                lineHeight: 1.12,
                letterSpacing: -1,
              }}
            >
              {title}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 18,
                maxHeight: 76,
                overflow: "hidden",
                color: "#c3c1c8",
                fontSize: 19,
                lineHeight: 1.4,
              }}
            >
              {description.length > 105 ? `${description.slice(0, 105).trimEnd()}…` : description}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#a9a9b1", fontSize: 16 }}>
            <span style={{ color: "#ff6476", fontWeight: 700 }}>mikoroku.com</span>
            <span>·</span>
            <span>Manga, manhwa &amp; more</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 58,
            right: 72,
            width: 350,
            height: 514,
            overflow: "hidden",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 20,
            background: "#24232a",
            boxShadow: "0 24px 70px rgba(0,0,0,0.55)",
          }}
        >
          <img
            src={image}
            alt=""
            width={350}
            height={514}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
