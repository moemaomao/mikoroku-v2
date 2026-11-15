export type HomepageMangaSection = "latest" | "random" | "novel";

type MangaRecord = Record<string, unknown>;

function isRecord(value: unknown): value is MangaRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizedType(value: unknown): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function genreTypes(record: MangaRecord, info: MangaRecord): string[] {
  return [record.genres, record.genre, info.genres, info.genre].flatMap((value) => {
    const values = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[,|/]/) : [];
    return values.map(normalizedType).filter(Boolean);
  });
}

export function getHomepageMangaType(record: MangaRecord): string {
  const info = isRecord(record.info) ? record.info : {};
  const type = normalizedType(record.type || info.type);
  if (type && type !== "manga") return type;

  const genres = genreTypes(record, info);
  const specificType = [
    "doujinshi",
    "doujin",
    "oneshot",
    "one shot",
    "cg collection",
    "cg",
    "manhwa",
    "manhua",
    "light novel",
    "web novel",
    "novel",
  ].find((candidate) => genres.includes(candidate));

  return specificType || type || "manga";
}

export function getHomepageMangaSection(record: MangaRecord): HomepageMangaSection {
  const type = getHomepageMangaType(record);
  if (type.includes("novel")) return "novel";
  if (
    type.includes("doujinshi") ||
    type === "doujin" ||
    type === "oneshot" ||
    type === "one shot" ||
    type === "cg" ||
    type.includes("cg collection")
  ) {
    return "random";
  }
  return "latest";
}

function titleKey(record: MangaRecord): string {
  const title = typeof record.title === "string" ? record.title : "";
  return title.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

const sectionPriority: Record<HomepageMangaSection, number> = {
  latest: 0,
  random: 1,
  novel: 2,
};

export function splitHomepageMangaSections<T extends MangaRecord>(records: T[]): {
  latest: T[];
  random: T[];
  novel: T[];
} {
  const unique = new Map<string, { record: T; section: HomepageMangaSection }>();

  for (const record of records) {
    if (record.isDraft === true) continue;
    const key = titleKey(record);
    if (!key) continue;

    const section = getHomepageMangaSection(record);
    const existing = unique.get(key);
    if (!existing || sectionPriority[section] > sectionPriority[existing.section]) {
      unique.set(key, { record, section });
    }
  }

  const sections = { latest: [] as T[], random: [] as T[], novel: [] as T[] };
  for (const { record, section } of unique.values()) {
    sections[section].push(record);
  }
  return sections;
}
