import { ImageResponse } from "next/og";

const DEFAULT_COVER =
  "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhlpxqlAz__8_IHcJpy_JsiuX2dr0ompUWEoaUjtk279x167sNP1AphlLYw92AECMAcyXEg4bSnNcGnKZ86a3KEFGHwyi1huUIJ52zejDYkSeeTEnCL4Loig440EuS6yyeKZjmnAdkdcxsic5rArUT_bwv2Sk4lJgDXSYFSWLBawxBPBjGZPTS-pp2xTsc/s1000/MIKOROKU.png";

export async function fetchCoverAsDataUrl(
  url?: string | null,
): Promise<string | null> {
  if (!url || typeof url !== "string" || !url.startsWith("http")) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MikorokuOG/1.0)",
        Accept: "image/jpeg,image/png,image/webp,image/*",
      },
    });
    clearTimeout(timer);

    if (!res.ok) return null;

    const contentType = (res.headers.get("content-type") || "image/jpeg")
      .split(";")[0]
      .trim();
    if (!contentType.startsWith("image/")) return null;

    const buffer = await res.arrayBuffer();
    if (buffer.byteLength < 1000 || buffer.byteLength > 900_000) return null;

    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    let binary = "";
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return `data:${contentType};base64,${btoa(binary)}`;
  } catch {
    return null;
  }
}

export function createMikorokuOgImage({
  title,
  description,
  label,
  coverDataUrl,
}: {
  title: string;
  description: string;
  label: string;
  coverDataUrl?: string | null;
}) {
  const safeTitle = (title || "Mikoroku").slice(0, 85);
  const safeDesc = (description || "Baca manga di Mikoroku.").slice(0, 110);
  const cover = coverDataUrl || null;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #0f1115 0%, #17141a 55%, #241018 100%)",
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
            width: cover ? 680 : "100%",
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

          <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 640 }}>
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

            <div
              style={{
                fontSize: 18,
                lineHeight: 1.4,
                color: "#c3c1c8",
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
              color: "#999",
              fontSize: 15,
            }}
          >
            <span style={{ color: "#ff6476", fontWeight: 700 }}>mikoroku.top</span>
            <span>·</span>
            <span>Manga, manhwa & more</span>
          </div>
        </div>

        {cover ? (
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
            <img
              src={cover}
              width={340}
              height={500}
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
      width: 1200,
      height: 630,
    },
  );
}