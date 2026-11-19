import type { MetadataRoute } from "next";
import catalog from "../public/catalog/metadata.json";

const SITE_URL = "https://mikoroku.com";

const publicPages: MetadataRoute.Sitemap = [
  { url: SITE_URL, priority: 1 },
  { url: `${SITE_URL}/catalog`, priority: 0.8 },
  { url: `${SITE_URL}/manga-list`, priority: 0.8 },
  { url: `${SITE_URL}/hentai-list`, priority: 0.8 },
  { url: `${SITE_URL}/novel-list`, priority: 0.8 },
  { url: `${SITE_URL}/genre-list`, priority: 0.7 },
  { url: `${SITE_URL}/announcements`, priority: 0.5 },
  { url: `${SITE_URL}/about`, priority: 0.4 },
  { url: `${SITE_URL}/privacy`, priority: 0.3 },
  { url: `${SITE_URL}/terms`, priority: 0.3 },
  { url: `${SITE_URL}/dmca`, priority: 0.3 },
  { url: `${SITE_URL}/commission`, priority: 0.4 },
];

function lastModified(value: unknown): Date | undefined {
  const timestamp = typeof value === "number"
    ? value
    : typeof value === "string"
      ? Number(value)
      : Number.NaN;
  if (!Number.isFinite(timestamp) || timestamp <= 0) return undefined;
  const date = new Date(timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const seriesPages: MetadataRoute.Sitemap = catalog.manga.flatMap((item) => {
    const record = item as Record<string, unknown>;
    const metadata = record.metadata && typeof record.metadata === "object"
      ? record.metadata as Record<string, unknown>
      : {};
    const slug = typeof record.slug === "string"
      ? record.slug
      : typeof record.id === "string"
        ? record.id
        : "";

    if (!slug || record.isDraft === true || metadata.isDraft === true) return [];

    return [{
      url: `${SITE_URL}/series/${encodeURIComponent(slug)}`,
      lastModified: lastModified(record.updatedAt ?? record.latestUpdate),
      priority: 0.6,
    }];
  });

  return [...publicPages, ...seriesPages];
}
