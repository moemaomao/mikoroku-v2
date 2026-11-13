type StatsUser = {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
};

type StatsDocumentSnapshot = {
  exists: boolean;
  data: () => Record<string, unknown> | undefined;
};

type StatsQueryDocument = {
  id: string;
  data: () => Record<string, unknown>;
  ref?: { parent: { parent: { id: string } | null } };
};

type StatsQuerySnapshot = {
  forEach: (callback: (document: StatsQueryDocument) => void) => void;
};

type StatsQuery = {
  where?: (field: string, operator: string, value: unknown) => StatsQuery;
  get: () => Promise<StatsQuerySnapshot>;
};

type StatsDocumentReference = {
  collection: (name: string) => StatsCollection;
  get: () => Promise<StatsDocumentSnapshot>;
  set: (data: Record<string, unknown>, options?: { merge?: boolean }) => Promise<void>;
};

type StatsCollection = {
  doc: (id: string) => StatsDocumentReference;
  limit: (count: number) => StatsQuery;
};

type StatsFirestore = {
  collection: (name: string) => StatsCollection;
  collectionGroup?: (name: string) => StatsQuery;
};

type StatsFirebase = {
  auth?: () => { currentUser: StatsUser | null };
  firestore?: (() => StatsFirestore) & {
    FieldValue?: { increment?: (value: number) => unknown };
  };
};

type StatsWindow = Window & {
  currentUser?: StatsUser | null;
  firebase?: StatsFirebase;
};

export type ReaderStatsInput = {
  slug: string;
  title: string;
  cover: string;
  kind: "manga" | "novel";
  chapter: string;
  chapterTitle: string;
  chapterProgress: number;
  chapterPosition: number;
  chapterCount: number;
  source?: string;
};

export type ReadingProgressItem = {
  slug: string;
  title: string;
  cover: string;
  kind: "manga" | "novel";
  chapter: string;
  chapterTitle: string;
  chapterProgress: number;
  seriesProgress: number;
  chapterPosition: number;
  chapterCount: number;
  source: string;
  updatedAt: number;
};

export type ReadingActivityDay = {
  date: string;
  chapters: number;
};

export type CommentHistoryItem = {
  id: string;
  text: string;
  hasImage: boolean;
  createdAt: number;
  isReply: boolean;
  linkTitle: string;
  threadUrl: string;
};

export type PublicReadingStats = {
  profile: Record<string, unknown>;
  progress: ReadingProgressItem[];
  activity: ReadingActivityDay[];
  totalChaptersRead: number;
  bookmarksCount: number | null;
  commentHistory: CommentHistoryItem[];
  commentHistoryError: string;
};

function getStatsWindow(): StatsWindow {
  return window as StatsWindow;
}

function getFirestore(): StatsFirestore | null {
  const firebase = getStatsWindow().firebase;
  if (typeof firebase?.firestore !== "function") return null;
  return firebase.firestore();
}

async function waitForFirestore(): Promise<StatsFirestore> {
  const existing = getFirestore();
  if (existing) return existing;

  await new Promise<void>((resolve, reject) => {
    let timeout = 0;
    const cleanup = () => {
      window.clearTimeout(timeout);
      window.removeEventListener("firebaseCompatReady", onReady);
    };
    const onReady = () => {
      if (!getFirestore()) return;
      cleanup();
      resolve();
    };
    timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Firebase Firestore initialization timed out."));
    }, 15000);

    window.addEventListener("firebaseCompatReady", onReady);
    onReady();
  });

  const firestore = getFirestore();
  if (!firestore) throw new Error("Firebase Firestore is unavailable after initialization.");
  return firestore;
}

function clampPercentage(value: number): number {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}

function safeDocumentId(value: string): string {
  return encodeURIComponent(value);
}

function utcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getLastSevenUtcDates(now = new Date()): string[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() - (6 - index));
    return utcDateKey(date);
  });
}

export async function saveReaderStats(
  input: ReaderStatsInput,
  recordChapterActivity: boolean,
): Promise<boolean> {
  const firestore = await waitForFirestore();
  const sdk = getStatsWindow().firebase;
  const user = getStatsWindow().currentUser || sdk?.auth?.().currentUser;
  if (!sdk || !user?.uid) return false;

  const now = new Date().toISOString();
  const chapterProgress = clampPercentage(input.chapterProgress);
  const seriesProgress = input.chapterCount > 0 && input.chapterPosition > 0
    ? clampPercentage(((input.chapterPosition - 1 + chapterProgress / 100) / input.chapterCount) * 100)
    : chapterProgress;
  const userReference = firestore.collection("userStats").doc(user.uid);
  const readingStats: Record<string, unknown> = {
    progress: {
      [safeDocumentId(input.slug)]: {
        slug: input.slug,
        title: input.title,
        cover: input.cover,
        kind: input.kind,
        chapter: input.chapter,
        chapterTitle: input.chapterTitle,
        chapterProgress,
        seriesProgress,
        chapterPosition: input.chapterPosition,
        chapterCount: input.chapterCount,
        source: input.source || "",
        updatedAt: now,
      },
    },
  };

  const profileFields: Record<string, unknown> = {};
  if (recordChapterActivity) {
    const profileSnapshot = await userReference.get();
    if (!profileSnapshot.exists) {
      const name = user.displayName || user.email?.split("@")[0] || "Reader";
      profileFields.displayName = name;
      profileFields.username = name;
      profileFields.avatar = user.photoURL || "";
      profileFields.createdAt = now;
    }

    const increment = sdk.firestore?.FieldValue?.increment;
    if (typeof increment !== "function") {
      throw new Error("Firestore atomic increment is unavailable.");
    }
    const day = utcDateKey(new Date());
    readingStats.activity = {
      [day]: { chapters: increment(1) },
    };
    readingStats.totalChaptersRead = increment(1);
  }

  await userReference.set({
    ...profileFields,
    readingStats,
  }, { merge: true });

  if (recordChapterActivity) window.dispatchEvent(new Event("mikoroku:reading-stats-updated"));
  return true;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function decodePathPart(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function timestampValue(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (!value || typeof value !== "object") return 0;

  const timestamp = value as {
    toMillis?: () => number;
    toDate?: () => Date;
    seconds?: number;
    nanoseconds?: number;
  };
  if (typeof timestamp.toMillis === "function") return timestamp.toMillis();
  if (typeof timestamp.toDate === "function") return timestamp.toDate().getTime();
  return typeof timestamp.seconds === "number"
    ? timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1_000_000
    : 0;
}

function normalizeCommentPageId(value: string): string {
  return value
    .replace(/^[\/]+|[\/]+$/g, "")
    .replace(/[\/]/g, "__")
    .replace(/\.html$/, "")
    .replace(/[^a-zA-Z0-9-_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function getCommentPageIdFromUrl(value: string): string {
  try {
    const segments = new URL(value, window.location.origin).pathname.split("/").filter(Boolean);
    const kind = segments[0];
    const slug = decodePathPart(segments[1] || "");
    if ((kind === "manga" || kind === "novel") && segments[2]) {
      const chapter = decodePathPart(segments[2]);
      return normalizeCommentPageId(`${kind === "manga" ? "reader" : "novel"}_${slug}_${chapter}`);
    }
    if (kind === "series" && slug) return normalizeCommentPageId(`detail_${slug}`);
  } catch {
    return "";
  }
  return "";
}

function getCommentThreadUrlFromProfile(postId: string, profile: Record<string, unknown>): string {
  const candidates: string[] = [];
  if (Array.isArray(profile.readingHistory)) {
    profile.readingHistory.forEach((value) => {
      const url = stringValue(asRecord(value).url);
      if (url) candidates.push(url);
    });
  }
  const progressBySlug = asRecord(asRecord(profile.readingStats).progress);
  Object.values(progressBySlug).forEach((value) => {
    const entry = asRecord(value);
    const kind = entry.kind === "novel" ? "novel" : entry.kind === "manga" ? "manga" : "";
    const slug = stringValue(entry.slug);
    const chapter = stringValue(entry.chapter);
    if (kind && slug && chapter) {
      candidates.push(`/${kind}/${encodeURIComponent(slug)}/${encodeURIComponent(chapter)}`);
    }
  });

  const matchingUrl = candidates.find((candidate) => getCommentPageIdFromUrl(candidate) === postId);
  if (!matchingUrl) return "";
  try {
    const url = new URL(matchingUrl, window.location.origin);
    url.hash = "comments-list";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "";
  }
}

function getCommentThreadUrl(postId: string, savedUrl: unknown, profile: Record<string, unknown>): string {
  const rawUrl = stringValue(savedUrl);
  if (rawUrl) {
    try {
      const url = new URL(rawUrl, window.location.origin);
      const hostname = url.hostname.toLowerCase();
      const allowedHost = hostname === window.location.hostname.toLowerCase()
        || hostname === "mikoroku.top"
        || hostname === "www.mikoroku.top";
      if ((url.protocol === "http:" || url.protocol === "https:") && allowedHost) {
        url.hash = "comments-list";
        return `${url.pathname}${url.search}${url.hash}`;
      }
    } catch {
      // Fall through to the saved reading history and post ID mapping.
    }
  }

  const historyUrl = getCommentThreadUrlFromProfile(postId, profile);
  if (historyUrl) return historyUrl;

  if (postId === "home") return "/#comments-list";
  let match = postId.match(/^reader_(.+)_([^_]+)$/);
  if (match) return `/manga/${encodeURIComponent(match[1])}/${encodeURIComponent(match[2])}#comments-list`;
  match = postId.match(/^novel_(.+)_([^_]+)$/);
  if (match) return `/novel/${encodeURIComponent(match[1])}/${encodeURIComponent(match[2])}#comments-list`;
  match = postId.match(/^detail_(.+)$/);
  if (match) return `/series/${encodeURIComponent(match[1])}#comments-list`;

  const legacyPath = postId
    .replace(/_html_m_1$/, "")
    .replace(/\/html\/m\/\d+$/, "")
    .replace(/\?m=\d+$/, "")
    .replace(/\/m\/\d+$/, "")
    .replace(/\/html$/, "")
    .replace(/_/g, "/")
    .replace(/^\/+|\/+$/g, "");
  return legacyPath ? `/${legacyPath}#comments-list` : "";
}

function getCommentLinkTitle(postId: string, savedTitle: unknown, savedUrl: unknown, profile: Record<string, unknown>): string {
  const storedTitle = stringValue(savedTitle).trim().replace(/\s*\|\s*Mikoroku.*$/i, "").trim();
  if (storedTitle) {
    const separator = storedTitle.indexOf(" - ");
    if (separator > 0) {
      const chapterTitle = storedTitle.slice(0, separator).trim();
      const seriesTitle = storedTitle.slice(separator + 3).trim();
      if (/^(chapter|episode|ep\.?)\b/i.test(chapterTitle) && seriesTitle) {
        return `${seriesTitle} ${chapterTitle}`;
      }
    }
    return storedTitle;
  }

  const threadUrl = getCommentThreadUrl(postId, savedUrl, profile);
  let pathSegments: string[] = [];
  try {
    pathSegments = new URL(threadUrl, window.location.origin).pathname.split("/").filter(Boolean);
  } catch {
    pathSegments = [];
  }
  const routeKind = pathSegments[0];
  const slug = routeKind === "manga" || routeKind === "novel" || routeKind === "series"
    ? decodePathPart(pathSegments[1] || "")
    : "";
  const chapter = routeKind === "manga" || routeKind === "novel"
    ? decodePathPart(pathSegments[2] || "")
    : "";

  const historyEntries = Array.isArray(profile.readingHistory)
    ? profile.readingHistory.map(asRecord)
    : [];
  const historyMatch = historyEntries.find((entry) => {
    if (!threadUrl || !stringValue(entry.url)) return false;
    try {
      return new URL(stringValue(entry.url), window.location.origin).pathname
        === new URL(threadUrl, window.location.origin).pathname;
    } catch {
      return false;
    }
  });
  if (historyMatch) {
    const seriesTitle = stringValue(historyMatch.series) || stringValue(historyMatch.title);
    if (seriesTitle) {
      const chapterTitle = stringValue(historyMatch.chapter) || (chapter ? `Chapter ${chapter}` : "");
      return [seriesTitle, chapterTitle].filter(Boolean).join(" ");
    }
  }

  const progressBySlug = asRecord(asRecord(profile.readingStats).progress);
  const progressMatch = Object.values(progressBySlug)
    .map(asRecord)
    .find((entry) => decodePathPart(stringValue(entry.slug)) === slug);
  const seriesTitle = stringValue(progressMatch?.title);
  if (seriesTitle) {
    return [seriesTitle, chapter ? `Chapter ${chapter}` : ""].filter(Boolean).join(" ");
  }

  const readableSlug = slug
    .replace(/[-_]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  return [readableSlug, chapter ? `Chapter ${chapter}` : ""].filter(Boolean).join(" ")
    || "Lihat halaman komentar";
}

function parseProgressItem(value: unknown): ReadingProgressItem | null {
  const data = asRecord(value);
  const kind = data.kind === "novel" ? "novel" : data.kind === "manga" ? "manga" : null;
  const slug = stringValue(data.slug);
  if (!kind || !slug) return null;
  return {
    slug,
    title: stringValue(data.title) || slug,
    cover: stringValue(data.cover),
    kind,
    chapter: stringValue(data.chapter),
    chapterTitle: stringValue(data.chapterTitle),
    chapterProgress: clampPercentage(numberValue(data.chapterProgress)),
    seriesProgress: clampPercentage(numberValue(data.seriesProgress)),
    chapterPosition: numberValue(data.chapterPosition),
    chapterCount: numberValue(data.chapterCount),
    source: stringValue(data.source),
    updatedAt: timestampValue(data.updatedAt),
  };
}

export async function loadPublicReadingStats(uid: string): Promise<PublicReadingStats> {
  const firestore = await waitForFirestore();
  const userReference = firestore.collection("userStats").doc(uid);
  const profileSnapshotPromise = userReference.get();
  const commentSnapshotPromise = (async () => {
    try {
      if (typeof firestore.collectionGroup !== "function") {
        throw new Error("Firestore collection-group queries are unavailable.");
      }
      const commentsQuery = firestore.collectionGroup("postComments");
      if (typeof commentsQuery.where !== "function") {
        throw new Error("Firestore comment filtering is unavailable.");
      }
      return {
        snapshot: await commentsQuery.where("uid", "==", uid).get(),
        error: "",
      };
    } catch (error) {
      console.warn("Comment history could not be loaded for this user.", error);
      return {
        snapshot: null,
        error: error instanceof Error ? error.message : "Comment history could not be loaded.",
      };
    }
  })();
  const bookmarksCountPromise = (async () => {
    try {
      const bookmarks = await firestore.collection("users").doc(uid).collection("bookmarks").limit(1000).get();
      let count = 0;
      bookmarks.forEach(() => { count += 1; });
      return count;
    } catch (error) {
      console.warn("Bookmark count is not publicly available for this user.", error);
      return null;
    }
  })();
  const [profileSnapshot, commentSnapshotResult, bookmarksCount] = await Promise.all([
    profileSnapshotPromise,
    commentSnapshotPromise,
    bookmarksCountPromise,
  ]);
  const profile = profileSnapshot.exists ? profileSnapshot.data() || {} : {};
  const readingStats = asRecord(profile.readingStats);
  const progressBySlug = asRecord(readingStats.progress);
  const progress = Object.values(progressBySlug)
    .map(parseProgressItem)
    .filter((item): item is ReadingProgressItem => item !== null)
    .sort((left, right) => right.updatedAt - left.updatedAt);
  const activityByDate = asRecord(readingStats.activity);
  const activity = getLastSevenUtcDates().map((date) => ({
    date,
    chapters: numberValue(asRecord(activityByDate[date]).chapters),
  }));
  const activityTotal = Object.values(activityByDate).reduce<number>(
    (total, day) => total + numberValue(asRecord(day).chapters),
    0,
  );
  const historyTotal = Array.isArray(profile.readingHistory) ? profile.readingHistory.length : 0;
  const totalChaptersRead = Math.max(
    numberValue(readingStats.totalChaptersRead),
    activityTotal,
    historyTotal,
  );

  const commentHistory: CommentHistoryItem[] = [];
  let commentHistoryError = commentSnapshotResult.error;
  if (commentSnapshotResult.snapshot) {
    try {
      commentSnapshotResult.snapshot.forEach((document) => {
        const data = document.data();
        if (stringValue(data.uid) !== uid) return;
        const postId = document.ref?.parent.parent?.id;
        if (!postId) return;
        commentHistory.push({
          id: document.id,
          text: stringValue(data.text),
          hasImage: Boolean(data.image),
          createdAt: timestampValue(data.date),
          isReply: Boolean(data.parentId),
          linkTitle: getCommentLinkTitle(postId, data.postTitle, data.postUrl, profile),
          threadUrl: getCommentThreadUrl(postId, data.postUrl, profile),
        });
      });
      commentHistory.sort((left, right) => right.createdAt - left.createdAt);
    } catch (error) {
      console.warn("Comment history could not be loaded for this user.", error);
      commentHistoryError = error instanceof Error ? error.message : "Comment history could not be loaded.";
    }
  }

  return {
    profile,
    progress,
    activity,
    totalChaptersRead,
    bookmarksCount,
    commentHistory,
    commentHistoryError,
  };
}
