import type { MangaMetadata } from "../types";

type MangaMetadataPayload = {
  manga: unknown[];
};

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    if (Array.isArray(value)) {
      const joined = value.filter((item): item is string =>
        typeof item === "string" && Boolean(item.trim()),
      ).map((item) => item.trim()).join(", ");
      if (joined) return joined;
    }
  }
  return "";
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string =>
    typeof item === "string" && Boolean(item.trim()),
  ).map((item) => item.trim());
}

export async function loadMikorokuMangaCatalog(
  force = false,
): Promise<MangaMetadata[]> {
  const timestamp = force ? `?t=${Date.now()}` : "";
  const sources = [
    `/api/catalog/metadata${timestamp}`,
    `/catalog/metadata.json${timestamp}`,
  ];
  const failures: string[] = [];
  let payload: MangaMetadataPayload | null = null;
  for (const source of sources) {
    try {
      const response = await fetch(source, { cache: force ? "no-store" : "default" });
      if (!response.ok) {
        failures.push(`${source} returned HTTP ${response.status}`);
        continue;
      }
      const value: unknown = await response.json();
      const record = asRecord(value);
      if (!Array.isArray(record.manga)) {
        failures.push(`${source} returned an invalid catalog payload`);
        continue;
      }
      payload = { manga: record.manga };
      break;
    } catch (error) {
      failures.push(`${source}: ${error instanceof Error ? error.message : "request failed"}`);
    }
  }
  if (!payload) {
    throw new Error(`Could not load the MikoRoku manga catalog. ${failures.join("; ")}`);
  }

  return payload.manga.flatMap((raw) => {
    const record = asRecord(raw);
    const metadata = asRecord(record.metadata);
    const title = firstString(record.title, record.name, metadata.title, metadata.name);
    const slug = firstString(record.slug, metadata.slug);
    if (!slug || !title) return [];

    return [{
      slug,
      title,
      altTitle: firstString(
        record.altTitle,
        record.alternative,
        record.alt_title,
        metadata.altTitle,
        metadata.alternative,
        metadata.alt_title,
      ),
      author: firstString(record.author, record.authors, metadata.author, metadata.authors),
      artist: firstString(record.artist, record.artists, metadata.artist, metadata.artists),
      cover: firstString(record.cover, record.img, metadata.cover, metadata.img),
      covers: [
        ...new Set([
          ...strings(record.covers),
          ...strings(metadata.covers),
        ]),
      ],
    }];
  }).sort((left, right) => left.title.localeCompare(right.title));
}
