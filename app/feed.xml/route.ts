import { getApps, initializeApp } from "firebase/app";
import { collection, getDocs, getFirestore, limit, orderBy, query } from "firebase/firestore";
import { firebaseConfig } from "../../lib/firebase-config";
import { kvGet, kvSet } from "../../lib/kv-cache";
import { latestChapterFromRecord } from "../../lib/latest-chapter";
import { isNovelSeries } from "../../lib/reader-kind";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FEED_URL = "https://mikoroku.top/feed.xml";
const FEED_CACHE_KEY = "feed:latest-chapters:v3";
const FEED_CACHE_TTL = 15 * 60;
const MAX_FEED_ITEMS = 50;
const MAX_SERIES_QUERY = 200;
const RSS_FIREBASE_APP_NAME = "mikoroku-rss-feed";

type FeedItem = {
  title: string;
  description: string;
  link: string;
  updatedAt: number;
  categories: string[];
};

function xmlEscape(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function timestampMillis(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value < 1_000_000_000_000 ? value * 1000 : value;
  }
  if (typeof value === "string") {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof value === "object" && value !== null) {
    const timestamp = value as { toMillis?: () => number; seconds?: number; _seconds?: number };
    if (typeof timestamp.toMillis === "function") return timestamp.toMillis();
    const seconds = timestamp.seconds ?? timestamp._seconds;
    if (typeof seconds === "number" && Number.isFinite(seconds)) return seconds * 1000;
  }
  return 0;
}

async function buildFeedItems(): Promise<FeedItem[]> {
  const app = getApps().find((candidate) => candidate.name === RSS_FIREBASE_APP_NAME) ??
    initializeApp(firebaseConfig, RSS_FIREBASE_APP_NAME);
  const firestore = getFirestore(app);
  const mangaQuery = query(
    collection(firestore, "manga"),
    orderBy("updatedAt", "desc"),
    limit(MAX_SERIES_QUERY),
  );
  const snapshot = await getDocs(mangaQuery);
  const items: FeedItem[] = [];

  snapshot.forEach((document) => {
    const record = document.data() as Record<string, unknown>;
    if (record.isDraft === true || typeof record.title !== "string") return;

    const chapter = latestChapterFromRecord(record);
    if (!chapter) return;

    const updatedAt = timestampMillis(record.updatedAt ?? record.latestUpdate);
    const kind = isNovelSeries(record) ? "novel" : "manga";
    const link = `https://mikoroku.top/${kind}/${encodeURIComponent(document.id)}/${encodeURIComponent(chapter)}`;
    const title = `${record.title} Chapter ${chapter}`;
    const categories = Array.isArray(record.genres)
      ? record.genres.filter((genre): genre is string => typeof genre === "string")
      : [];

    items.push({
      title,
      description: `Baca ${title} di Mikoroku.`,
      link,
      updatedAt,
      categories,
    });
  });

  return items
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .slice(0, MAX_FEED_ITEMS);
}

function renderFeed(items: FeedItem[]): string {
  const xmlItems = items
    .map((item) => {
      const pubDate = item.updatedAt
        ? `<pubDate>${new Date(item.updatedAt).toUTCString()}</pubDate>`
        : "";
      const categoryTags = item.categories
        .map((category) => `<category>${xmlEscape(category)}</category>`)
        .join("");

      return `<item>
<title>${xmlEscape(item.title)}</title>
<link>${xmlEscape(item.link)}</link>
<description>${xmlEscape(item.description)}</description>
${pubDate}
<guid isPermaLink="true">${xmlEscape(item.link)}</guid>
${categoryTags}
</item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>Mikoroku - Latest Chapters</title>
<link>https://mikoroku.top/</link>
<description>Latest chapter updates from Mikoroku.</description>
<language>id-ID</language>
<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
<ttl>15</ttl>
<atom:link href="${FEED_URL}" rel="self" type="application/rss+xml" />
${xmlItems}
</channel>
</rss>`;
}

function feedResponse(xml: string, cache: "HIT" | "MISS") {
  return new Response(xml, {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=900, stale-while-revalidate=3600",
      "Content-Type": "application/rss+xml; charset=utf-8",
      "X-Cache": cache,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET() {
  const cached = await kvGet<string>(FEED_CACHE_KEY, "text");
  if (cached) return feedResponse(cached, "HIT");

  try {
    const xml = renderFeed(await buildFeedItems());
    try {
      await kvSet(FEED_CACHE_KEY, xml, FEED_CACHE_TTL);
    } catch (error) {
      console.warn("[feed.xml] Could not cache the generated RSS feed.", error);
    }
    return feedResponse(xml, "MISS");
  } catch (error) {
    console.error("[feed.xml] Could not load chapters from Firestore.", error);
    return new Response("RSS feed is temporarily unavailable.", {
      status: 502,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
}
