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

type StatsQuerySnapshot = {
  forEach: (callback: () => void) => void;
};

type StatsQuery = {
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

export type PublicReadingStats = {
  profile: Record<string, unknown>;
  progress: ReadingProgressItem[];
  activity: ReadingActivityDay[];
  totalChaptersRead: number;
  bookmarksCount: number | null;
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
  const profileSnapshot = await userReference.get();
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

  let bookmarksCount: number | null = null;
  try {
    const bookmarks = await firestore.collection("users").doc(uid).collection("bookmarks").limit(1000).get();
    let count = 0;
    bookmarks.forEach(() => { count += 1; });
    bookmarksCount = count;
  } catch (error) {
    console.warn("Bookmark count is not publicly available for this user.", error);
  }

  return {
    profile,
    progress,
    activity,
    totalChaptersRead,
    bookmarksCount,
  };
}
