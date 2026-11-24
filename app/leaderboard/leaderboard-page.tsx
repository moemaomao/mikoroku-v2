"use client";

import { useEffect, useRef, useState } from "react";
import { getApps, initializeApp } from "firebase/app";
import { collectionGroup, getDocs, getFirestore, limit, query, where } from "firebase/firestore";
import SiteChrome from "../site-chrome";

type LeaderboardUser = {
  uid: string;
  name: string;
  username: string;
  avatar: string;
  commentCount: number;
  hidden: boolean;
};

declare global {
  interface Window {
    userStatsCache?: Record<string, Record<string, unknown>>;
  }
}

const defaultAvatar = "/assets/icons/favicon.ico";
const leaderboardDatabaseName = "mikoroku-leaderboard";
const leaderboardStoreName = "cache";
const leaderboardCacheKey = "top-comments";
const commentFirebaseConfig = {
  apiKey: "AIzaSyCxufJubuS95zQnvctINvzj-H8WSIgsse4",
  authDomain: "widget-comment.firebaseapp.com",
  projectId: "widget-comment",
  storageBucket: "widget-comment.firebasestorage.app",
  messagingSenderId: "249700505242",
  appId: "1:249700505242:web:dab240af09caf30ad7f123",
};

type LeaderboardCache = {
  users: LeaderboardUser[];
  updatedAt: number;
};

const commentAvatarCache = new Map<string, string>();
const pendingCommentAvatarRequests = new Map<string, Promise<string>>();

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
}

function displayName(user: LeaderboardUser): string {
  return user.name || user.username || "Anonymous";
}

function timestampValue(value: unknown): number {
  if (typeof value === "number") return value;
  if (!value || typeof value !== "object") return 0;
  const timestamp = value as { toMillis?: () => number; seconds?: number };
  if (typeof timestamp.toMillis === "function") return timestamp.toMillis();
  return typeof timestamp.seconds === "number" ? timestamp.seconds * 1000 : 0;
}

function isDefaultAvatar(avatar: string): boolean {
  if (!avatar) return true;
  try {
    return new URL(avatar, window.location.origin).pathname === defaultAvatar;
  } catch {
    return avatar === defaultAvatar;
  }
}

function loadCommentAvatar(uid: string): Promise<string> {
  const cachedAvatar = commentAvatarCache.get(uid);
  if (cachedAvatar) return Promise.resolve(cachedAvatar);
  const pendingRequest = pendingCommentAvatarRequests.get(uid);
  if (pendingRequest) return pendingRequest;

  let request: Promise<string>;
  try {
    request = getDocs(query(
      collectionGroup(getCommentFirestore(), "postComments"),
      where("uid", "==", uid),
      limit(20),
    ))
      .then((snapshot) => {
        let avatar = "";
        let latestTimestamp = -1;
        snapshot.forEach((comment) => {
          const data = comment.data();
          const candidate = stringValue(data.avatar);
          const timestamp = timestampValue(data.date);
          if (candidate && !isDefaultAvatar(candidate) && timestamp >= latestTimestamp) {
            avatar = candidate;
            latestTimestamp = timestamp;
          }
        });
        if (avatar) commentAvatarCache.set(uid, avatar);
        return avatar;
      });
  } catch (error) {
    return Promise.reject(error);
  }
  pendingCommentAvatarRequests.set(uid, request);
  const clearPending = () => {
    if (pendingCommentAvatarRequests.get(uid) === request) {
      pendingCommentAvatarRequests.delete(uid);
    }
  };
  void request.then(clearPending, clearPending);
  return request;
}

function cacheUserAvatar(uid: string, avatar: string): void {
  window.userStatsCache ||= {};
  window.userStatsCache[uid] = {
    ...window.userStatsCache[uid],
    avatar,
  };
}

function updateOpenProfileAvatar(uid: string, avatar: string): void {
  const modal = document.getElementById("user-profile-modal");
  if (modal?.dataset.profileUid !== uid) return;
  const image = modal.querySelector<HTMLImageElement>('[data-profile="avatar"]');
  if (image) image.src = avatar;
}

function openRankedProfile(user: LeaderboardUser, rank: number): void {
  if (user.avatar) {
    cacheUserAvatar(user.uid, user.avatar);
  }
  const avatar = isDefaultAvatar(user.avatar) ? undefined : user.avatar;
  window.showUserProfile?.(user.uid, rank, avatar);
  if (avatar) return;

  void loadCommentAvatar(user.uid)
    .then((commentAvatar) => {
      if (!commentAvatar) return;
      cacheUserAvatar(user.uid, commentAvatar);
      updateOpenProfileAvatar(user.uid, commentAvatar);
    })
    .catch((error) => {
      console.warn("Could not load the user's comment avatar for the leaderboard profile.", error);
    });
}

function handleAvatarError(image: HTMLImageElement): void {
  if (image.dataset.fallbackApplied) return;
  image.dataset.fallbackApplied = "true";
  image.src = defaultAvatar;
}

function handleRankedAvatarError(user: LeaderboardUser, image: HTMLImageElement): void {
  if (image.dataset.commentAvatarLookupAttempted) {
    handleAvatarError(image);
    return;
  }
  image.dataset.commentAvatarLookupAttempted = "true";

  void loadCommentAvatar(user.uid)
    .then((avatar) => {
      if (!avatar || avatar === user.avatar) {
        handleAvatarError(image);
        return;
      }
      cacheUserAvatar(user.uid, avatar);
      updateOpenProfileAvatar(user.uid, avatar);
      image.src = optimizedAvatarUrl(avatar, 64);
    })
    .catch((error) => {
      console.warn("Could not load a replacement leaderboard avatar.", error);
      handleAvatarError(image);
    });
}

function commentLevel(commentCount: number): number {
  return Math.floor(commentCount / 5) + 1;
}

function openProfile(uid: string): void {
  window.showUserProfile?.(uid);
}

function optimizedAvatarUrl(avatarUrl: string, size: number): string {
  if (!avatarUrl || avatarUrl === defaultAvatar) return defaultAvatar;
  if (avatarUrl.includes("googleusercontent.com") || avatarUrl.includes("lh3.googleusercontent.com")) {
    return avatarUrl;
  }
  if (avatarUrl.includes("gravatar.com")) {
    try {
      const url = new URL(avatarUrl);
      url.searchParams.set("s", String(size));
      return url.toString();
    } catch {
      return avatarUrl;
    }
  }
  return avatarUrl;
}

function LazyAvatar({ src, alt, width, height, className }: {
  src: string;
  alt: string;
  width: number;
  height: number;
  className: string;
}) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);

  useEffect(() => {
    const image = imageRef.current;
    if (!image || loadedSrc) return;
    if (!("IntersectionObserver" in window)) {
      setLoadedSrc(src);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      setLoadedSrc(src);
      observer.disconnect();
    }, { rootMargin: "200px 0px" });
    observer.observe(image);
    return () => observer.disconnect();
  }, [loadedSrc, src]);

  return (
    <img
      ref={imageRef}
      src={loadedSrc ? optimizedAvatarUrl(loadedSrc, width) : defaultAvatar}
      onError={(event) => handleAvatarError(event.currentTarget)}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      className={className}
    />
  );
}

function isLeaderboardUser(user: unknown): user is LeaderboardUser {
  if (!user || typeof user !== "object") return false;
  const candidate = user as Partial<LeaderboardUser>;
  return typeof candidate.uid === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.username === "string" &&
    typeof candidate.avatar === "string" &&
    typeof candidate.commentCount === "number" &&
    candidate.hidden === false;
}

function openLeaderboardDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB tidak tersedia di browser ini."));
      return;
    }
    const request = window.indexedDB.open(leaderboardDatabaseName, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(leaderboardStoreName);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB gagal dibuka."));
  });
}

async function readCachedLeaderboard(): Promise<LeaderboardCache | null> {
  try {
    const database = await openLeaderboardDatabase();
    const cached = await new Promise<unknown>((resolve, reject) => {
      const request = database
        .transaction(leaderboardStoreName, "readonly")
        .objectStore(leaderboardStoreName)
        .get(leaderboardCacheKey);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Cache leaderboard gagal dibaca."));
    });
    database.close();
    if (!cached || typeof cached !== "object") return null;
    const record = cached as Partial<LeaderboardCache>;
    if (typeof record.updatedAt !== "number" || !Array.isArray(record.users)) return null;
    const users = record.users.filter(isLeaderboardUser);
    return users.length ? { users, updatedAt: record.updatedAt } : null;
  } catch (error) {
    console.warn("Cache IndexedDB leaderboard tidak dapat dibaca.", error);
    return null;
  }
}

function readLegacyCachedLeaderboard(): LeaderboardUser[] {
  try {
    const cached = window.localStorage.getItem("mikoroku:leaderboard:top-comments:v2");
    if (!cached) return [];
    const parsed: unknown = JSON.parse(cached);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((user): user is LeaderboardUser => {
      if (!user || typeof user !== "object") return false;
      const candidate = user as Partial<LeaderboardUser>;
      return typeof candidate.uid === "string" &&
        typeof candidate.name === "string" &&
        typeof candidate.username === "string" &&
        typeof candidate.avatar === "string" &&
        typeof candidate.commentCount === "number" &&
        candidate.hidden === false;
    });
  } catch (error) {
    console.warn("Cache lama leaderboard tidak dapat dibaca.", error);
    return [];
  }
}

function getCommentFirestore() {
  const app = getApps().find((candidate) => candidate.name === "mikoroku-leaderboard") ??
    initializeApp(commentFirebaseConfig, "mikoroku-leaderboard");
  return getFirestore(app);
}

export default function LeaderboardPage() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void readCachedLeaderboard().then((cached) => {
      if (active) setUsers(cached?.users ?? readLegacyCachedLeaderboard());
    }).catch((cacheError: unknown) => {
      console.warn("Cache leaderboard lokal gagal dimuat.", cacheError);
      if (active) setUsers(readLegacyCachedLeaderboard());
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const topUsers = users.slice(0, 6);
  const restUsers = users.slice(6);

  return (
    <>
      <SiteChrome showFooter={false} />
      <main className="route-page-background min-h-[calc(100dvh-64px)] px-4 py-8 text-slate-900 dark:text-slate-100 sm:px-6">
        <div className="mx-auto w-full max-w-5xl">
        <header className="mb-8 text-center">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-[var(--mikoroku-accent,#9d1018)]">Community</p>
          <h1 className="m-0 text-3xl font-bold sm:text-4xl">Top Commenters</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-500 dark:text-slate-400">Apresiasi untuk user yang paling aktif berbagi komentar di Mikoroku.</p>
        </header>

        {loading ? (
          <div role="status" aria-label="Loading comment leaderboard" aria-busy="true">
            <span className="sr-only">Loading leaderboard...</span>
            <section aria-hidden="true" className="mb-8 grid grid-cols-3 gap-2 min-[900px]:grid-cols-6 min-[900px]:gap-3">
              {Array.from({ length: 6 }, (_, index) => (
                <div
                  key={index}
                  className="relative flex min-h-[162px] flex-col items-center rounded-xl border border-slate-200/80 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
                >
                  <span className="absolute right-3 top-3 h-5 w-5 animate-pulse rounded-full bg-slate-200 dark:bg-white/10" />
                  <span className="mt-2 h-12 w-12 animate-pulse rounded-full bg-slate-200 dark:bg-white/10" />
                  <span className="mt-3 h-3 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
                  <span className="mt-2 h-2.5 w-1/2 animate-pulse rounded bg-slate-200/80 dark:bg-white/[0.07]" />
                  <span className="mt-4 h-5 w-12 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
                  <span className="mt-1 h-2 w-14 animate-pulse rounded bg-slate-200/80 dark:bg-white/[0.07]" />
                </div>
              ))}
            </section>
            <section className="rounded-2xl border border-slate-200/80 bg-transparent p-4 shadow-sm dark:border-white/10 sm:p-5">
              <div className="border-b border-slate-200/80 px-5 py-4 dark:border-white/10">
                <span className="block h-5 w-48 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
                <span className="mt-2 block h-3 w-64 max-w-full animate-pulse rounded bg-slate-200/80 dark:bg-white/[0.07]" />
              </div>
              <ol className="mt-4 grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 8 }, (_, index) => (
                  <li
                    key={index}
                    className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04] sm:gap-4"
                  >
                    <span className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-slate-200 dark:bg-white/10" />
                    <span className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-slate-200 dark:bg-white/10" />
                    <span className="min-w-0 flex-1">
                      <span className="block h-3 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
                      <span className="mt-2 block h-2.5 w-1/2 animate-pulse rounded bg-slate-200/80 dark:bg-white/[0.07]" />
                    </span>
                    <span className="h-3 w-12 shrink-0 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
                  </li>
                ))}
              </ol>
            </section>
          </div>
        ) : !topUsers.length ? (
          <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-10 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">Belum ada data leaderboard tersimpan di browser ini.</div>
        ) : (
          <>
            <section aria-label="Top six commenters" className="mb-8 grid grid-cols-3 gap-2 min-[900px]:grid-cols-6 min-[900px]:gap-3">
              {topUsers.map((user, index) => (
                <article
                  key={user.uid}
                  className={`leaderboard-animated-card relative overflow-hidden rounded-xl border p-4 shadow-sm transition duration-200 touch-manipulation hover:-translate-y-1 hover:brightness-110 hover:shadow-2xl active:scale-[0.98] active:brightness-125 active:shadow-2xl focus-within:brightness-110 focus-within:shadow-2xl ${
                    [
                      "border-violet-400/70 bg-[linear-gradient(145deg,#f2e8ff,#d8b4fe)] shadow-violet-500/20 dark:bg-[linear-gradient(145deg,#3b1f5b,#21152f)]",
                      "border-red-400/70 bg-[linear-gradient(145deg,#ffe4e6,#fecdd3)] shadow-red-500/20 dark:bg-[linear-gradient(145deg,#5b2027,#30161b)]",
                      "border-orange-400/70 bg-[linear-gradient(145deg,#ffedd5,#fed7aa)] shadow-orange-500/20 dark:bg-[linear-gradient(145deg,#5b321c,#301d12)]",
                      "border-yellow-400/70 bg-[linear-gradient(145deg,#fef9c3,#fde68a)] shadow-yellow-500/20 dark:bg-[linear-gradient(145deg,#514816,#302c12)]",
                      "border-blue-400/70 bg-[linear-gradient(145deg,#dbeafe,#bfdbfe)] shadow-blue-500/20 dark:bg-[linear-gradient(145deg,#1e3a5f,#15283f)]",
                      "border-green-400/70 bg-[linear-gradient(145deg,#dcfce7,#bbf7d0)] shadow-green-500/20 dark:bg-[linear-gradient(145deg,#1d4b2b,#142b1d)]",
                    ][index]
                  }`}
                >
                  <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border border-black/10 bg-white/35 text-xs font-bold text-slate-700 dark:border-white/15 dark:bg-black/20 dark:text-white">
                    {index === 0 ? "🏆" : index + 1}
                  </span>
                  <button type="button" onClick={() => openRankedProfile(user, index + 1)} aria-label={`Open profile of ${displayName(user)}`} className="mx-auto block rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mikoroku-accent,#9d1018)]">
                    <img src={optimizedAvatarUrl(user.avatar, 64)} onError={(event) => handleRankedAvatarError(user, event.currentTarget)} alt="" width={64} height={64} fetchPriority="high" decoding="async" className="h-16 w-16 rounded-full border-2 border-white object-cover shadow dark:border-slate-600" />
                  </button>
                  <button type="button" onClick={() => openRankedProfile(user, index + 1)} className="mx-auto mt-3 block max-w-full truncate text-center text-sm font-bold hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mikoroku-accent,#9d1018)]">{displayName(user)}</button>
                  {user.username && <p className="truncate text-center text-[10px] text-slate-500 dark:text-slate-400">@{user.username}</p>}
                  <span className="mx-auto mt-2 block w-fit rounded-full border border-black/10 bg-white/40 px-2 py-0.5 text-[9px] font-bold text-slate-700 dark:border-white/15 dark:bg-black/20 dark:text-white">LV {commentLevel(user.commentCount)}</span>
                  <p className={`mt-4 text-center text-xl font-black ${
                    ["text-violet-700 dark:text-violet-300", "text-red-700 dark:text-red-300", "text-orange-700 dark:text-orange-300", "text-yellow-700 dark:text-yellow-300", "text-blue-700 dark:text-blue-300", "text-green-700 dark:text-green-300"][index]
                  }`}>{user.commentCount.toLocaleString()}</p>
                  <p className="text-center text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">comments</p>
                </article>
              ))}
            </section>

            <section aria-labelledby="leaderboard-list-title" className="rounded-2xl border border-slate-200/80 bg-transparent p-4 shadow-sm dark:border-white/10 sm:p-5">
              <div className="border-b border-slate-200/80 px-5 py-4 dark:border-white/10">
                <h2 id="leaderboard-list-title" className="m-0 text-lg font-bold">Comment Leaderboard</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Diurutkan dari jumlah komentar terbanyak.</p>
              </div>
              <ol className="mt-4 grid gap-3 sm:grid-cols-2">
                {restUsers.map((user, index) => (
                  <li key={user.uid} className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200/80 bg-white/70 px-4 py-3 transition duration-200 touch-manipulation hover:-translate-y-0.5 hover:brightness-110 hover:border-[var(--mikoroku-accent,#9d1018)]/60 hover:shadow-lg active:scale-[0.99] active:brightness-125 active:shadow-xl focus-within:brightness-110 focus-within:shadow-lg dark:border-white/10 dark:bg-white/[0.04] sm:gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-300/80 bg-slate-100 text-sm font-bold text-slate-500 dark:border-white/15 dark:bg-white/[0.06] dark:text-slate-300">{index + 6}</span>
                    <button type="button" onClick={() => openProfile(user.uid)} aria-label={`Open profile of ${displayName(user)}`} className="shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mikoroku-accent,#9d1018)]">
                      <LazyAvatar src={user.avatar} alt="" width={44} height={44} className="h-11 w-11 rounded-full border border-slate-200 object-cover dark:border-white/15" />
                    </button>
                    <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-1">
                          <button type="button" onClick={() => openProfile(user.uid)} className="min-w-0 truncate text-left text-sm font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mikoroku-accent,#9d1018)]">{displayName(user)}</button>
                          <span className="shrink-0 rounded-full border border-slate-300/80 bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500 dark:border-white/15 dark:bg-white/[0.06] dark:text-slate-300">LV {commentLevel(user.commentCount)}</span>
                        </div>
                        {user.username && <p className="truncate text-xs text-slate-500 dark:text-slate-400">@{user.username}</p>}
                    </div>
                    <p className="w-[4.5rem] min-w-0 shrink-0 text-right text-xs font-bold leading-tight text-[var(--mikoroku-accent,#9d1018)] sm:w-auto sm:text-sm">{user.commentCount.toLocaleString()} <span className="block break-words text-[10px] font-normal text-slate-500 dark:text-slate-400 sm:inline sm:text-inherit">comments</span></p>
                  </li>
                ))}
              </ol>
            </section>
          </>
        )}
        </div>
      </main>
      <SiteChrome showChrome={false} />
    </>
  );
}
