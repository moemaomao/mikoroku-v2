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

function pickCover(value: Record<string, unknown> | null | undefined): string | undefined {
  if (!value) return undefined;

  const direct =
    safeImageUrl(value.cover) ||
    safeImageUrl(value.img) ||
    safeImageUrl(value.image) ||
    safeImageUrl(value.thumbnail) ||
    safeImageUrl(value.thumb);
  if (direct) return direct;

  const covers = value.covers;
  if (Array.isArray(covers)) {
    for (const item of covers) {
      const url = safeImageUrl(item);
      if (url) return url;
    }
  }

  const info = value.info;
  if (info && typeof info === "object") {
    const record = info as Record<string, unknown>;
    return (
      safeImageUrl(record.cover) ||
      safeImageUrl(record.img) ||
      safeImageUrl(record.image) ||
      safeImageUrl(record.thumbnail)
    );
  }

  return undefined;
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
    asText(value?.synopsis) ||
    asText(value?.sinopsis) ||
    `Baca manga ${title} di Mikoroku.`;

  return {
    title,
    description: description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300),
    image: pickCover(value) || DEFAULT_IMAGE,
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
  let datasetSeries: SeriesSeoData | null = null;

  try {
    const document = await getFirestoreDocument(
      `manga/${encodeURIComponent(slug)}`,
    );
    if (document) return normalizeSeries(document, slug);
  } catch (error) {
    console.error("Metadata seri tidak dapat diambil dari Firestore.", error);
  }

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
    if (manga) datasetSeries = normalizeSeries(manga, slug);
  } catch (error) {
    datasetError = error;
  }

  if (datasetSeries) return datasetSeries;

  if (datasetError) {
    console.error("Metadata seri tidak dapat diambil dari dataset.", datasetError);
  }
  return normalizeSeries({ title }, slug);
}

export async function getSeriesSeoDataForOg(slug: string): Promise<SeriesSeoData> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    try {
      const response = await fetch(
        `${FIRESTORE_DOCUMENTS_URL}/manga/${encodeURIComponent(slug)}`,
        {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        },
      );
      if (response.ok) {
        const document = decodeFirestoreDocument(await response.json());
        return normalizeSeries(document, slug);
      }
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    console.warn("[OG seo] Firestore failed", slug, error);
  }

  return normalizeSeries({ title: fallbackTitle(slug) }, slug);
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
