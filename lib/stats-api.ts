const STATS_BASE =
  process.env.NEXT_PUBLIC_STATS_URL ?? "https://mikoroku-og.vercel.app";

export type SeriesStats = {
  views: number;
  bookmarks: number;
};

const EMPTY_SERIES_STATS: SeriesStats = { views: 0, bookmarks: 0 };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function countValue(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : 0;
}

async function fetchCountMap(
  endpoint: "views" | "bookmarks",
  slugs: string[],
): Promise<Record<string, number>> {
  try {
    const query = slugs.map(encodeURIComponent).join(",");
    const res = await fetch(`${STATS_BASE}/api/${endpoint}?slugs=${query}`, {
      cache: "no-store",
      credentials: "omit",
    });
    if (!res.ok) return {};

    const data: unknown = await res.json();
    if (!isRecord(data)) return {};
    return Object.fromEntries(
      Object.entries(data).map(([slug, count]) => [slug, countValue(count)]),
    );
  } catch {
    return {};
  }
}

async function getSeriesStatsMap(slugs: string[]): Promise<Record<string, SeriesStats>> {
  let primaryStats: Record<string, SeriesStats> = {};
  try {
    const query = slugs.map(encodeURIComponent).join(",");
    const res = await fetch(`${STATS_BASE}/api/stats?slugs=${query}`, {
      cache: "no-store",
      credentials: "omit",
    });
    if (res.ok) {
      const data: unknown = await res.json();
      if (isRecord(data)) {
        primaryStats = Object.fromEntries(
          Object.entries(data).flatMap(([slug, value]) =>
            isRecord(value)
              ? [[slug, {
                  views: countValue(value.views),
                  bookmarks: countValue(value.bookmarks),
                }]]
              : [],
          ),
        );
      }
    }
  } catch {
    primaryStats = {};
  }

  const missingSlugs = slugs.filter((slug) => !primaryStats[slug]);
  if (!missingSlugs.length) return primaryStats;

  const [views, bookmarks] = await Promise.all([
    fetchCountMap("views", missingSlugs),
    fetchCountMap("bookmarks", missingSlugs),
  ]);
  return {
    ...primaryStats,
    ...Object.fromEntries(missingSlugs.map((slug) => [
      slug,
      {
        views: views[slug] ?? 0,
        bookmarks: bookmarks[slug] ?? 0,
      },
    ])),
  };
}

/** Ambil views + bookmarks 1 series. */
export async function getSeriesStats(slug: string): Promise<SeriesStats> {
  const stats = await getSeriesStatsMap([slug]);
  return stats[slug] ?? EMPTY_SERIES_STATS;
}

/** Ambil statistik banyak series sekaligus. */
export async function getSeriesStatsBatch(
  slugs: string[],
): Promise<Record<string, SeriesStats>> {
  if (slugs.length === 0) return {};
  return getSeriesStatsMap([...new Set(slugs)]);
}

async function updateBookmark(slug: string, action: "inc" | "dec"): Promise<number> {
  const res = await fetch(`${STATS_BASE}/api/bookmarks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "omit",
    body: JSON.stringify({ slug, action }),
  });
  if (!res.ok) {
    throw new Error(`Could not update the public bookmark count (${res.status}).`);
  }

  const data: unknown = await res.json();
  if (!isRecord(data) || data.ok !== true) {
    throw new Error("The bookmark statistics API returned an invalid response.");
  }
  return countValue(data.count);
}

/** Panggil setelah penulisan bookmark ke Firestore berhasil. */
export function incrementBookmark(slug: string): Promise<number> {
  return updateBookmark(slug, "inc");
}

/** Panggil setelah penghapusan bookmark dari Firestore berhasil. */
export function decrementBookmark(slug: string): Promise<number> {
  return updateBookmark(slug, "dec");
}

/** Ambil jumlah notifikasi belum dibaca untuk pengguna yang login. */
export async function getUnreadNotifCount(idToken: string): Promise<number> {
  const res = await fetch(`${STATS_BASE}/api/notifications`, {
    headers: { Authorization: `Bearer ${idToken}` },
    credentials: "omit",
  });
  if (!res.ok) return 0;

  const data: unknown = await res.json();
  return isRecord(data) ? countValue(data.unreadCount) : 0;
}

/** Perbarui cache notifikasi setelah data Firestore berubah. */
export async function setUnreadNotifCount(
  idToken: string,
  count: number,
): Promise<void> {
  const res = await fetch(`${STATS_BASE}/api/notifications`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    credentials: "omit",
    body: JSON.stringify({ unreadCount: Math.max(0, Math.floor(count)) }),
  });
  if (!res.ok) {
    throw new Error(`Could not update the unread notification count (${res.status}).`);
  }
}
