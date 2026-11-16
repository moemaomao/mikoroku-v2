type FollowingUser = { uid: string } | null;
type FollowingDocumentSnapshot = {
  exists: boolean;
  data: () => Record<string, unknown> | undefined;
};
type FollowingDocumentReference = {
  get: () => Promise<FollowingDocumentSnapshot>;
  set: (data: Record<string, unknown>, options?: { merge?: boolean }) => Promise<void>;
};
type FollowingQuerySnapshot = {
  docs: unknown[];
};
type FollowingQuery = {
  get: () => Promise<FollowingQuerySnapshot>;
};
type FollowingCollection = {
  doc: (id: string) => FollowingDocumentReference;
  where?: (field: string, operator: string, value: unknown) => FollowingQuery;
};
type FollowingFirestore = {
  collection: (name: string) => FollowingCollection;
};
type FollowingFirebase = {
  auth?: () => { currentUser: FollowingUser };
  firestore?: (() => FollowingFirestore) & {
    FieldValue?: {
      arrayUnion?: (...values: unknown[]) => unknown;
      arrayRemove?: (...values: unknown[]) => unknown;
    };
  };
};
type FollowingWindow = Window & {
  currentUser?: FollowingUser;
  firebase?: FollowingFirebase;
};

const FOLLOWING_CACHE_PREFIX = "mikoroku:following:";
const FOLLOWING_CACHE_TTL_MS = 1000 * 60 * 30;

function followingCacheTimestampKey(uid: string): string {
  return `${FOLLOWING_CACHE_PREFIX}${uid}:savedAt`;
}

function followingWindow(): FollowingWindow {
  return window as FollowingWindow;
}

function currentFirestore(): FollowingFirestore | null {
  const firestore = followingWindow().firebase?.firestore;
  if (typeof firestore !== "function") return null;
  try {
    return firestore();
  } catch (error) {
    console.warn("Firestore is not ready for follow actions.", error);
    return null;
  }
}

async function waitForFirestore(): Promise<FollowingFirestore> {
  const existing = currentFirestore();
  if (existing) return existing;

  await new Promise<void>((resolve, reject) => {
    let timeout = 0;
    const cleanup = () => {
      window.clearTimeout(timeout);
      window.removeEventListener("firebaseCompatReady", onReady);
    };
    const onReady = () => {
      if (!currentFirestore()) return;
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

  const firestore = currentFirestore();
  if (!firestore) throw new Error("Firebase Firestore is unavailable after initialization.");
  return firestore;
}

export function getCachedFollowingUids(uid: string): string[] {
  try {
    const cached: unknown = JSON.parse(
      window.localStorage.getItem(`${FOLLOWING_CACHE_PREFIX}${uid}`) || "[]",
    );
    return Array.isArray(cached)
      ? [...new Set(cached.filter((targetUid): targetUid is string => typeof targetUid === "string"))]
      : [];
  } catch (error) {
    console.warn("Cached following list could not be read.", error);
    return [];
  }
}

export function cacheFollowingUids(uid: string, following: string[], isFresh = true): void {
  try {
    window.localStorage.setItem(
      `${FOLLOWING_CACHE_PREFIX}${uid}`,
      JSON.stringify([...new Set(following)]),
    );
    if (isFresh) {
      window.localStorage.setItem(followingCacheTimestampKey(uid), String(Date.now()));
    } else {
      window.localStorage.removeItem(followingCacheTimestampKey(uid));
    }
  } catch (error) {
    console.warn("Cached following list could not be saved.", error);
  }
}

export async function loadFollowingUids(uid: string): Promise<string[]> {
  try {
    const savedAt = Number(window.localStorage.getItem(followingCacheTimestampKey(uid)));
    const age = Date.now() - savedAt;
    if (Number.isFinite(savedAt) && savedAt > 0 && age >= 0 && age < FOLLOWING_CACHE_TTL_MS) {
      return getCachedFollowingUids(uid);
    }
  } catch (error) {
    console.warn("Following cache freshness could not be checked.", error);
  }

  const firestore = await waitForFirestore();
  const snapshot = await firestore.collection("userStats").doc(uid).get();
  const value = snapshot.exists ? snapshot.data()?.following : undefined;
  const following = Array.isArray(value)
    ? [...new Set(value.filter((targetUid): targetUid is string => typeof targetUid === "string"))]
    : [];
  cacheFollowingUids(uid, following);
  return following;
}

export async function setUserFollowing(
  uid: string,
  targetUid: string,
  shouldFollow: boolean,
): Promise<void> {
  const currentUser =
    followingWindow().firebase?.auth?.().currentUser || followingWindow().currentUser || null;
  if (!uid || currentUser?.uid !== uid) {
    throw new Error("Sign in as the follower before changing follow status.");
  }

  const firestore = await waitForFirestore();
  const fieldValue = followingWindow().firebase?.firestore?.FieldValue;
  const followingUpdate = shouldFollow
    ? fieldValue?.arrayUnion?.(targetUid)
    : fieldValue?.arrayRemove?.(targetUid);
  if (followingUpdate === undefined) {
    throw new Error("Firestore array updates are unavailable.");
  }

  await firestore.collection("userStats").doc(uid).set(
    { following: followingUpdate },
    { merge: true },
  );
  const updatedFollowing = new Set(getCachedFollowingUids(uid));
  if (shouldFollow) updatedFollowing.add(targetUid);
  else updatedFollowing.delete(targetUid);
  cacheFollowingUids(uid, [...updatedFollowing]);
}

export async function loadFollowerCount(uid: string): Promise<number | null> {
  const firestore = await waitForFirestore();
  const collection = firestore.collection("userStats");
  if (typeof collection.where !== "function") {
    throw new Error("Firestore follower queries are unavailable.");
  }
  const snapshot = await collection.where("following", "array-contains", uid).get();
  return snapshot.docs.length;
}
