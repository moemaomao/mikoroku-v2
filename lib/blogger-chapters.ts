export type BloggerChapterSource = "blogger" | "blogger2";

export type BloggerChapter = {
  num: string;
  title: string;
  url: string;
  images: string[];
  thumbnail: string;
  createdAt: string;
  source: BloggerChapterSource;
};

export type BloggerChapterListItem = {
  num: string;
  title: string;
  url: string;
  thumbnail: string;
  createdAt: string;
  source: BloggerChapterSource;
};

type BloggerEntry = {
  title?: { $t?: string };
  link?: Array<{ rel?: string; href?: string }>;
  content?: { $t?: string };
  updated?: { $t?: string };
  published?: { $t?: string };
};

type BloggerFeed = {
  feed?: { entry?: BloggerEntry[] };
};

const BLOGGER_DOMAINS: Record<BloggerChapterSource, string> = {
  blogger: "https://www.mikodrive.my.id",
  blogger2: "https://www.yomidays.my.id",
};

export const BLOGGER_CHAPTERS_TTL = 20 * 60;
export const BLOGGER_CHAPTERS_KV_TTL = 24 * 60 * 60;
export const BLOGGER_CHAPTERS_BROWSER_MAX_AGE = 5 * 60;

export function bloggerChaptersCacheKey(
  source: BloggerChapterSource,
  title: string,
): string {
  const normalized = title.trim().toLowerCase().replace(/\s+/g, " ");
  return `blogger:chapters:${source}:${normalized}`;
}

export function getBloggerChapterNumber(title: string, url: string): string {
  const match =
    title.match(
      /(?:chapter|chapters|ch\.?|chap\.?|ep\.?|episode)\s*[:\-]?\s*(\d+(?:[.,．]\d+)?)/i,
    ) ||
    title.match(/第\s*(\d+(?:[.,．]\d+)?)\s*[話话回]?/) ||
    title.match(/#\s*(\d+(?:[.,．]\d+)?)/) ||
    [...title.matchAll(/(\d+(?:[.,．]\d+)?)/g)].at(-1) ||
    url.match(/(?:chapter|ch)[_-]?(\d+(?:[.-]\d+)?)/i);
  const raw = match?.[1]?.replace(/[,_．]/g, ".").replace(/-/g, ".");
  if (!raw) return "?";
  const number = Number(raw);
  return Number.isFinite(number) ? String(number) : "?";
}

export function parseBloggerEntries(
  data: BloggerFeed,
  source: BloggerChapterSource,
): BloggerChapter[] {
  const chapters = (data.feed?.entry || []).map((entry) => {
    const title = entry.title?.$t || "";
    const url =
      entry.link?.find((link) => link.rel === "alternate")?.href || "";
    const html = entry.content?.$t || "";
    const images = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map(
      (m) => m[1],
    );
    return {
      num: getBloggerChapterNumber(title, url),
      title,
      url,
      images,
      thumbnail: (images[2] || images[0] || "").replace(/\/s\d+/, "/s100"),
      createdAt: entry.updated?.$t || entry.published?.$t || "",
      source,
    };
  });

  const merged = new Map<string, BloggerChapter>();
  for (const chapter of chapters) {
    const num = Number.isFinite(Number(chapter.num))
      ? String(Number(chapter.num))
      : chapter.num.trim();
    if (!num || num === "?") continue;
    const normalized = { ...chapter, num };
    const previous = merged.get(num);
    if (!previous) {
      merged.set(num, normalized);
      continue;
    }
    merged.set(num, {
      ...previous,
      ...normalized,
      images: normalized.images.length ? normalized.images : previous.images,
      thumbnail: normalized.thumbnail || previous.thumbnail,
    });
  }
  return [...merged.values()];
}

export function toListChapters(
  chapters: BloggerChapter[],
): BloggerChapterListItem[] {
  return chapters.map(({ num, title, url, thumbnail, createdAt, source }) => ({
    num,
    title,
    url,
    thumbnail,
    createdAt,
    source,
  }));
}

export async function fetchBloggerChapters(
  title: string,
  source: BloggerChapterSource,
  options?: { signal?: AbortSignal; maxResults?: number },
): Promise<BloggerChapter[]> {
  const domain = BLOGGER_DOMAINS[source];
  if (!domain) return [];

  const maxResults = options?.maxResults ?? 500;
  const q = encodeURIComponent(title.trim());
  const url = `${domain}/feeds/posts/default?alt=json&max-results=${maxResults}&q=${q}`;

  const res = await fetch(url, {
    signal: options?.signal,
    headers: {
      Accept: "application/json",
      "User-Agent": "mikoroku-blogger-proxy/1.0",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(
      `Blogger feed ${source} merespons HTTP ${res.status} untuk "${title}".`,
    );
  }

  const data = (await res.json()) as BloggerFeed;
  return parseBloggerEntries(data, source);
}

export function isBloggerChapterSource(
  value: string,
): value is BloggerChapterSource {
  return value === "blogger" || value === "blogger2";
}
