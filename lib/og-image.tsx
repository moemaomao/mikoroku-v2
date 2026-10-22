import { ImageResponse } from "next/og";

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
            width: coverDataUrl ? 680 : "100%",
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
              <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: 2 }}>MIKOROKU</span>
              <span style={{ fontSize: 13, color: "#aaa", letterSpacing: 1.5, marginTop: 2 }}>
                READ YOUR NEXT STORY
              </span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 640 }}>
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
                color: "#c8c5cc",
              }}
            >
              {safeDesc}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#999", fontSize: 16 }}>
            <span style={{ color: "#ff6476", fontWeight: 700 }}>mikoroku.top</span>
            <span>·</span>
            <span>Manga, manhwa & more</span>
          </div>
        </div>

        {coverDataUrl ? (
          <div
            style={{
              position: "absolute",
              top: 50,
              right: 56,
              width: 340,
              height: 500,
              borderRadius: 18,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.2)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
              background: "#24232a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src={coverDataUrl}
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

const MANGA_DATA_URL =
  "https://raw.githubusercontent.com/moemaomao/mymangadata/main/all-manga.json";
const FIRESTORE_DOCUMENTS_URL =
  "https://firestore.googleapis.com/v1/projects/mikoroku/databases/(default)/documents";
const COVER_BASE =
  "https://raw.githubusercontent.com/moemaomao/mymangadata/main/";
const DEFAULT_IMAGE =
  "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhlpxqlAz__8_IHcJpy_JsiuX2dr0ompUWEoaUjtk279x167sNP1AphlLYw92AECMAcyXEg4bSnNcGnKZ86a3KEFGHwyi1huUIJ52zejDYkSeeTEnCL4Loig440EuS6yyeKZjmnAdkdcxsic5rArUT_bwv2Sk4lJgDXSYFSWLBawxBPBjGZPTS-pp2xTsc/s1000/MIKOROKU.png";

export type SeriesSeoData = {
  title: string;
  description: string;
  image: string;
};

function decodeFirestoreValue(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  if ("stringValue" in record) return record.stringValue;
  if ("integerValue" in record) return Number(record.integerValue);
  if ("doubleValue" in record) return Number(record.doubleValue);
  if ("booleanValue" in record) return record.booleanValue;
  if ("nullValue" in record) return null;
  if ("arrayValue" in record) {
    const array = record.arrayValue as { values?: unknown[] } | undefined;
    return (array?.values || []).map(decodeFirestoreValue);
  }
  if ("mapValue" in record) {
    const map = record.mapValue as { fields?: Record<string, unknown> } | undefined;
    return Object.fromEntries(
      Object.entries(map?.fields || {}).map(([key, item]) => [key, decodeFirestoreValue(item)]),
    );
  }
  return record;
}

function decodeFirestoreDocument(document: {
  fields?: Record<string, unknown>;
}): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(document.fields || {}).map(([key, value]) => [
      key,
      decodeFirestoreValue(value),
    ]),
  );
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function safeImageUrl(value: unknown): string | undefined {
  const image = asText(value);
  if (!image) return undefined;

  try {
    if (/^https?:\/\//i.test(image)) {
      return new URL(image).href;
    }

    if (image.startsWith("cover/") || image.startsWith("/cover/")) {
      const path = image.replace(/^\/+/, "");
      const parts = path.split("/");
      const encoded = parts
        .map((part, index) =>
          index === parts.length - 1 ? encodeURIComponent(part) : part,
        )
        .join("/");
      return new URL(encoded, COVER_BASE).href;
    }

    return new URL(image, "https://mikoroku.top").href;
  } catch {
    return undefined;
  }
}

function slugKey(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function fallbackTitle(slug: string): string {
  return decodeURIComponent(slug)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function normalizeSeries(
  value: Record<string, unknown> | null | undefined,
  slug: string,
): SeriesSeoData {
  const title =
    asText(value?.title) || asText(value?.name) || fallbackTitle(slug);
  const description =
    asText(value?.desc) ||
    asText(value?.description) ||
    `Baca manga ${title} di Mikoroku.`;

  const image =
    safeImageUrl(value?.img) ||
    safeImageUrl(value?.cover) ||
    safeImageUrl(value?.thumbnail) ||
    safeImageUrl(value?.image) ||
    DEFAULT_IMAGE;

  return {
    title,
    description: description.slice(0, 300),
    image,
  };
}

async function getFirestoreDocument(
  path: string,
): Promise<Record<string, unknown> | null> {
  const response = await fetch(`${FIRESTORE_DOCUMENTS_URL}/${path}`, {
    next: { revalidate: 900 },
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Firestore metadata request returned HTTP ${response.status}.`);
  }
  return decodeFirestoreDocument(await response.json());
}

export async function getSeriesSeoData(slug: string): Promise<SeriesSeoData> {
  const title = fallbackTitle(slug);
  let datasetError: unknown;

  try {
    const response = await fetch(MANGA_DATA_URL, { next: { revalidate: 900 } });
    if (!response.ok) {
      throw new Error(`Manga dataset returned HTTP ${response.status}.`);
    }
    const mangaList = (await response.json()) as Array<Record<string, unknown>>;
    const manga = mangaList.find(
      (item) =>
        asText(item.slug) === slug ||
        slugKey(asText(item.title)) === slugKey(slug),
    );
    if (manga) return normalizeSeries(manga, slug);
  } catch (error) {
    datasetError = error;
  }

  try {
    const document = await getFirestoreDocument(
      `manga/${encodeURIComponent(slug)}`,
    );
    if (document) return normalizeSeries(document, slug);
  } catch (error) {
    console.error("Metadata seri tidak dapat diambil dari Firestore.", error);
  }

  if (datasetError) {
    console.error("Metadata seri tidak dapat diambil dari dataset.", datasetError);
  }
  return normalizeSeries({ title }, slug);
}

export async function getChapterSeoTitle(
  slug: string,
  chapter: string,
): Promise<{ title: string; description: string; image: string }> {
  const series = await getSeriesSeoData(slug);
  let chapterTitle = `Chapter ${chapter}`;
  let description = `Baca ${chapterTitle} ${series.title} di Mikoroku.`;

  try {
    const document = await getFirestoreDocument(
      `manga/${encodeURIComponent(slug)}/chapters/${encodeURIComponent(chapter)}`,
    );
    const label =
      asText(document?.label) ||
      asText(document?.chapterTitle) ||
      asText(document?.title);
    if (label && slugKey(label) !== slugKey(series.title)) {
      chapterTitle = label;
    }
    const text = asText(document?.desc) || asText(document?.description);
    if (text) description = text;
  } catch (error) {
    console.error("Metadata chapter tidak dapat diambil dari Firestore.", error);
  }

  return {
    title: `${chapterTitle} - ${series.title} - Mikoroku`,
    description: description.slice(0, 300),
    image: series.image,
  };
}

export function defaultSocialImage(): string {
  return DEFAULT_IMAGE;
}