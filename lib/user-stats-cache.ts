export type UserStatsProfile = Record<string, unknown>;

export type CachedUserStatsProfile = {
  data: UserStatsProfile;
  cachedAt: number;
  version: number;
  stale: boolean;
};

export type UserStatsProfileUpdatedDetail = {
  uid: string;
  profile: UserStatsProfile;
};

export const USER_STATS_PROFILE_UPDATED_EVENT = "mikoroku:user-stats-profile-updated";

const CACHE_KEY = "mikoroku:user-profile-cache:v1";
const CACHE_LIMIT = 100;
const CACHE_VERSION = 2;
const CACHE_TTL_MS = 1000 * 60 * 30;
const pendingRequests = new Map<string, Promise<UserStatsProfile>>();

type CacheEntry = {
  cachedAt: number;
  version?: number;
  data: UserStatsProfile;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function getProfileCache(): Record<string, unknown> {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const value: unknown = JSON.parse(raw);
    return isRecord(value) ? value : {};
  } catch (error) {
    console.warn("Cached user profiles could not be read.", error);
    return {};
  }
}

function sanitizeProfile(data: UserStatsProfile): UserStatsProfile {
  const cached: UserStatsProfile = {};
  for (const key of [
    "displayName",
    "username",
    "avatar",
    "bio",
    "bioLink",
    "commentCount",
    "points",
    "reputation",
    "customBadges",
    "customBadge",
    "achievementBadges",
    "readingStats",
    "totalChaptersRead",
    "gameRoles",
    "profileBanner",
    "customCommentBg",
    "hiddenStatsSections",
  ]) {
    if (data[key] !== undefined) cached[key] = data[key];
  }

  const history = data.readingHistory;
  const historyCount = Array.isArray(history)
    ? history.length
    : data.readingHistoryCount;
  if (typeof historyCount === "number" && Number.isFinite(historyCount)) {
    cached.readingHistoryCount = historyCount;
  }

  const joinedAt = data.joinedAt || data.createdAt;
  if (typeof joinedAt === "number" || typeof joinedAt === "string") {
    const parsed = new Date(joinedAt).getTime();
    if (Number.isFinite(parsed)) cached.joinedAt = parsed;
  } else if (isRecord(joinedAt)) {
    const seconds = joinedAt.seconds;
    if (typeof seconds === "number" && Number.isFinite(seconds)) {
      cached.joinedAt = seconds * 1000
        + (typeof joinedAt.nanoseconds === "number" ? joinedAt.nanoseconds / 1_000_000 : 0);
    }
  }

  return cached;
}

export function getCachedUserStatsProfile(uid: string): CachedUserStatsProfile | null {
  if (typeof window === "undefined") return null;
  const entry = getProfileCache()[uid];
  if (!isRecord(entry) || !isRecord(entry.data) || typeof entry.cachedAt !== "number") return null;

  const version = typeof entry.version === "number" ? entry.version : 1;
  const age = Date.now() - entry.cachedAt;
  return {
    data: entry.data,
    cachedAt: entry.cachedAt,
    version,
    stale: version !== CACHE_VERSION
      || !Array.isArray(entry.data.hiddenStatsSections)
      || age < 0
      || age >= CACHE_TTL_MS,
  };
}

export function cacheUserStatsProfile(uid: string, data: UserStatsProfile): void {
  if (typeof window === "undefined") return;
  const profileCache = getProfileCache();
  const existingEntry = isRecord(profileCache[uid]) ? profileCache[uid] : {};
  const existingData = isRecord(existingEntry.data) ? existingEntry.data : {};
  const cachedData = {
    ...existingData,
    ...sanitizeProfile(data),
  };
  profileCache[uid] = {
    cachedAt: Date.now(),
    version: CACHE_VERSION,
    data: cachedData,
  } satisfies CacheEntry;

  try {
    const entries = Object.entries(profileCache)
      .sort((left, right) => {
        const leftEntry = isRecord(left[1]) ? left[1] : {};
        const rightEntry = isRecord(right[1]) ? right[1] : {};
        return (typeof rightEntry.cachedAt === "number" ? rightEntry.cachedAt : 0)
          - (typeof leftEntry.cachedAt === "number" ? leftEntry.cachedAt : 0);
      })
      .slice(0, CACHE_LIMIT);
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch (error) {
    console.warn("User profile cache could not be saved.", error);
  }

  const userStatsCache = (window as Window & {
    userStatsCache?: Record<string, UserStatsProfile>;
  }).userStatsCache ||= {};
  userStatsCache[uid] = { ...userStatsCache[uid], ...cachedData };
  notifyUserStatsProfileUpdated(uid, cachedData);
}

export function notifyUserStatsProfileUpdated(uid: string, profile: UserStatsProfile): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<UserStatsProfileUpdatedDetail>(
    USER_STATS_PROFILE_UPDATED_EVENT,
    { detail: { uid, profile: sanitizeProfile(profile) } },
  ));
}

export function loadUserStatsProfile(
  uid: string,
  load: () => Promise<UserStatsProfile>,
): Promise<UserStatsProfile> {
  const cached = getCachedUserStatsProfile(uid);
  if (cached?.version === CACHE_VERSION && !cached.stale) {
    return Promise.resolve(cached.data);
  }

  const pending = pendingRequests.get(uid);
  if (pending) return pending;

  const request = load()
    .then((profile) => {
      cacheUserStatsProfile(uid, {
        ...profile,
        hiddenStatsSections: Array.isArray(profile.hiddenStatsSections)
          ? profile.hiddenStatsSections
          : [],
      });
      return profile;
    })
    .catch((error: unknown) => {
      if (cached?.version === CACHE_VERSION && Array.isArray(cached.data.hiddenStatsSections)) {
        console.warn("User profile refresh failed; using the cached profile.", error);
        return cached.data;
      }
      throw error;
    });
  pendingRequests.set(uid, request);
  const clearPending = () => {
    if (pendingRequests.get(uid) === request) pendingRequests.delete(uid);
  };
  void request.then(clearPending, clearPending);
  return request;
}

export function getSanitizedUserStatsProfile(data: UserStatsProfile): UserStatsProfile {
  return sanitizeProfile(data);
}
