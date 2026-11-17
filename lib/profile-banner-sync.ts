export type PendingProfileBanner = {
  uid: string;
  url: string;
  attempts: number;
  nextAttemptAt: number;
  updatedAt: number;
};

export type ProfileBannerFirestore = {
  collection: (name: string) => {
    doc: (uid: string) => {
      set: (data: Record<string, unknown>, options?: { merge?: boolean }) => Promise<void>;
    };
  };
};

export const PROFILE_BANNER_QUEUED_EVENT = "mikoroku:profile-banner-queued";
export const PROFILE_BANNER_SYNCED_EVENT = "mikoroku:profile-banner-synced";

const STORAGE_KEY_PREFIX = "mikoroku:pending-profile-banner:v1:";
const INITIAL_RETRY_DELAY_MS = 60_000;
const MAX_RETRY_DELAY_MS = 60 * 60 * 1000;

function storageKey(uid: string): string {
  return `${STORAGE_KEY_PREFIX}${uid}`;
}

export function getPendingProfileBanner(uid: string): PendingProfileBanner | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(uid));
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    if (
      record.uid !== uid
      || typeof record.url !== "string"
      || !record.url
      || typeof record.attempts !== "number"
      || typeof record.nextAttemptAt !== "number"
      || typeof record.updatedAt !== "number"
    ) {
      return null;
    }
    return record as PendingProfileBanner;
  } catch (error) {
    console.warn("Pending profile banner could not be read from local storage.", error);
    return null;
  }
}

export function queueProfileBanner(uid: string, url: string): PendingProfileBanner {
  const pending: PendingProfileBanner = {
    uid,
    url,
    attempts: 0,
    nextAttemptAt: Date.now(),
    updatedAt: Date.now(),
  };
  window.localStorage.setItem(storageKey(uid), JSON.stringify(pending));
  window.dispatchEvent(new Event(PROFILE_BANNER_QUEUED_EVENT));
  return pending;
}

export async function syncPendingProfileBanner(
  uid: string,
  firestore: ProfileBannerFirestore,
): Promise<PendingProfileBanner | null> {
  const pending = getPendingProfileBanner(uid);
  if (!pending || pending.nextAttemptAt > Date.now() || !navigator.onLine) return pending;

  let timeout: number | undefined;
  try {
    await Promise.race([
      firestore.collection("userStats").doc(uid).set(
        { profileBanner: pending.url },
        { merge: true },
      ),
      new Promise<never>((_, reject) => {
        timeout = window.setTimeout(
          () => reject(new Error("Profile banner synchronization timed out.")),
          20000,
        );
      }),
    ]);
    const latest = getPendingProfileBanner(uid);
    if (
      latest
      && (latest.url !== pending.url
        || latest.updatedAt !== pending.updatedAt
        || latest.attempts !== pending.attempts)
    ) {
      return latest;
    }
    try {
      window.localStorage.removeItem(storageKey(uid));
    } catch (error) {
      console.warn("The synchronized profile banner queue entry could not be removed.", error);
    }
    window.dispatchEvent(new CustomEvent(PROFILE_BANNER_SYNCED_EVENT, { detail: { uid } }));
    return null;
  } catch (error) {
    const latest = getPendingProfileBanner(uid);
    if (!latest) return null;
    if (
      latest.url !== pending.url
        || latest.updatedAt !== pending.updatedAt
        || latest.attempts !== pending.attempts
    ) {
      return latest;
    }
    const attempts = pending.attempts + 1;
    const delay = Math.min(
      INITIAL_RETRY_DELAY_MS * (2 ** Math.min(attempts - 1, 10)),
      MAX_RETRY_DELAY_MS,
    );
    const retry: PendingProfileBanner = {
      ...pending,
      attempts,
      nextAttemptAt: Date.now() + delay,
      updatedAt: Date.now(),
    };
    try {
      window.localStorage.setItem(storageKey(uid), JSON.stringify(retry));
    } catch (storageError) {
      console.error("The profile banner retry time could not be persisted.", storageError);
    }
    console.warn("Profile banner remains queued for background synchronization.", error);
    return retry;
  } finally {
    if (timeout !== undefined) window.clearTimeout(timeout);
  }
}
