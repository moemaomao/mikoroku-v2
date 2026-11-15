import { firebaseConfig } from "../../lib/firebase-config";
import { kvGet, kvSet } from "../../lib/kv-cache";
import { latestChapterFromRecord } from "../../lib/latest-chapter";
import { isNovelSeries } from "../../lib/reader-kind";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FEED_URL = "https://mikoroku.top/feed.xml";
const FEED_CACHE_KEY = "feed:latest-chapters:v4";
const FEED_STALE_CACHE_KEY = "feed:latest-chapters:stale:v1";
const PREVIOUS_FEED_CACHE_KEY = "feed:latest-chapters:v3";
const FEED_CACHE_TTL = 15 * 60;
const FEED_STALE_CACHE_TTL = 7 * 24 * 60 * 60;
const MAX_FEED_ITEMS = 50;

type FeedItem = {
  title: string;
  description: string;
  link: string;
  updatedAt: number;
  categories: string[];
};

type FirestoreValue = {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  timestampValue?: string;
  nullValue?: null | string;
  arrayValue?: { values?: FirestoreValue[] };
  mapValue?: { fields?: Record<string, FirestoreValue> };
  referenceValue?: string;
  bytesValue?: string;
  geoPointValue?: { latitude?: number; longitude?: number };
};

function decodeFirestoreValue(value: FirestoreValue): unknown {
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("nullValue" in value) return null;
  if ("arrayValue" in value) {
    return (value.arrayValue?.values ?? []).map(decodeFirestoreValue);
  }
  if ("mapValue" in value) {
    return Object.fromEntries(
      Object.entries(value.mapValue?.fields ?? {}).map(([key, field]) => [
        key,
        decodeFirestoreValue(field),
      ]),
    );
  }
  if ("referenceValue" in value) return value.referenceValue;
  if ("bytesValue" in value) return value.bytesValue;
  if ("geoPointValue" in value) return value.geoPointValue;
  return undefined;
}

function decodeFirestoreFields(fields: Record<string, FirestoreValue>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, decodeFirestoreValue(value)]),
  );
}

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
  const endpoint = new URL(
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(firebaseConfig.projectId)}/databases/(default)/documents:runQuery`,
  );
  endpoint.searchParams.set("key", firebaseConfig.apiKey);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "manga" }],
        orderBy: [{ field: { fieldPath: "updatedAt" }, direction: "DESCENDING" }],
        limit: MAX_FEED_ITEMS,
      },
    }),
  });
  if (!response.ok) {
    throw new Error(`Firestore query returned HTTP ${response.status}.`);
  }

  const results: unknown = await response.json();
  if (!Array.isArray(results)) {
    throw new Error("Firestore query returned an invalid response.");
  }

  const items: FeedItem[] = [];

  results.forEach((result: unknown) => {
    if (!result || typeof result !== "object") return;
    const row = result as {
      document?: { name?: unknown; fields?: unknown };
    };
    const name = row.document?.name;
    const fields = row.document?.fields;
    if (typeof name !== "string" || !fields || typeof fields !== "object") return;

    const id = name.slice(name.lastIndexOf("/") + 1);
    const record = decodeFirestoreFields(fields as Record<string, FirestoreValue>);
    if (record.isDraft === true || typeof record.title !== "string") return;

    const chapter = latestChapterFromRecord(record);
    if (!chapter) return;

    const updatedAt = timestampMillis(record.updatedAt ?? record.latestUpdate);
    const kind = isNovelSeries(record) ? "novel" : "manga";
    const link = `https://mikoroku.top/${kind}/${encodeURIComponent(id)}/${encodeURIComponent(chapter)}`;
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

function feedResponse(xml: string, cache: "HIT" | "MISS" | "STALE") {
  return new Response(xml, {
    headers: {
      "Cache-Control": cache === "STALE"
        ? "public, max-age=60, s-maxage=60, stale-while-revalidate=300"
        : "public, max-age=300, s-maxage=900, stale-while-revalidate=3600",
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
    try {
      await kvSet(FEED_STALE_CACHE_KEY, xml, FEED_STALE_CACHE_TTL);
    } catch (error) {
      console.warn("[feed.xml] Could not save a stale RSS fallback.", error);
    }
    return feedResponse(xml, "MISS");
  } catch (error) {
    console.error("[feed.xml] Could not load chapters from Firestore.", error);
    const stale = await kvGet<string>(FEED_STALE_CACHE_KEY, "text") ??
      await kvGet<string>(PREVIOUS_FEED_CACHE_KEY, "text");
    if (stale) return feedResponse(stale, "STALE");

    return new Response("RSS feed is temporarily unavailable.", {
      status: 502,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
}
