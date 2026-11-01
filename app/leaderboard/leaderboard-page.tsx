"use client";

import { useEffect, useState } from "react";
import { getApps, initializeApp } from "firebase/app";
import { collection, getDocs, getFirestore, limit, orderBy, query, startAfter, type QueryDocumentSnapshot } from "firebase/firestore";
import SiteChrome from "../site-chrome";

type LeaderboardUser = {
  uid: string;
  name: string;
  username: string;
  avatar: string;
  commentCount: number;
  hidden: boolean;
};

const defaultAvatar = "/assets/icons/favicon.ico";
const leaderboardDatabaseName = "mikoroku-leaderboard";
const leaderboardStoreName = "cache";
const leaderboardCacheKey = "top-comments";
const leaderboardCacheTtl = 2 * 60 * 60 * 1000;
const leaderboardVisibleLimit = 100;
const leaderboardBatchSize = 100;
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

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
}

function displayName(user: LeaderboardUser): string {
  return user.name || user.username || "Anonymous";
}

function commentLevel(commentCount: number): number {
  return Math.floor(commentCount / 5) + 1;
}

function openProfile(uid: string): void {
  window.showUserProfile?.(uid);
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

async function readKvLeaderboard(): Promise<LeaderboardCache | null> {
  try {
    const response = await fetch("/api/leaderboard", { cache: "no-store" });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`KV cache returned HTTP ${response.status}.`);
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object") return null;
    const record = payload as Partial<LeaderboardCache>;
    if (typeof record.updatedAt !== "number" || !Array.isArray(record.users)) return null;
    const users = record.users.filter(isLeaderboardUser);
    return users.length ? { users, updatedAt: record.updatedAt } : null;
  } catch (error) {
    console.warn("Cache KV leaderboard tidak dapat dibaca.", error);
    return null;
  }
}

async function writeCachedLeaderboard(users: LeaderboardUser[]): Promise<void> {
  try {
    const database = await openLeaderboardDatabase();
    await new Promise<void>((resolve, reject) => {
      const request = database
        .transaction(leaderboardStoreName, "readwrite")
        .objectStore(leaderboardStoreName)
        .put({ users, updatedAt: Date.now() } satisfies LeaderboardCache, leaderboardCacheKey);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("Cache leaderboard gagal disimpan."));
    });
    database.close();
  } catch (error) {
    console.warn("Cache IndexedDB leaderboard tidak dapat disimpan.", error);
  }
}

async function writeKvLeaderboard(users: LeaderboardUser[]): Promise<void> {
  try {
    const response = await fetch("/api/leaderboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ users, updatedAt: Date.now() }),
    });
    if (!response.ok) throw new Error(`KV cache returned HTTP ${response.status}.`);
  } catch (error) {
    console.warn("Cache KV leaderboard tidak dapat disimpan.", error);
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
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const loadLeaderboard = async () => {
      const [indexedDbCache, kvCache] = await Promise.all([
        readCachedLeaderboard(),
        readKvLeaderboard(),
      ]);
      const cached = kvCache ?? indexedDbCache;
      const cachedUsers = cached?.users ?? readLegacyCachedLeaderboard();
      const cacheIsFresh = Boolean(cached && Date.now() - cached.updatedAt < leaderboardCacheTtl);
      if (active && cachedUsers.length) {
        setUsers(cachedUsers);
        setLoading(false);
      }
      if (cacheIsFresh) return;

      try {
        const firestore = getCommentFirestore();
        const result: LeaderboardUser[] = [];
        let lastDocument: QueryDocumentSnapshot | undefined;
        do {
          const leaderboardQuery = query(
            collection(firestore, "userStats"),
            orderBy("commentCount", "desc"),
            ...(lastDocument ? [startAfter(lastDocument)] : []),
            limit(leaderboardBatchSize),
          );
          const snapshot = await getDocs(leaderboardQuery);
          snapshot.forEach((entry) => {
            const data = entry.data();
            result.push({
              uid: entry.id,
              name: stringValue(data.displayName),
              username: stringValue(data.username),
              avatar: stringValue(data.avatar, defaultAvatar),
              commentCount: numberValue(data.commentCount),
              hidden: data.leaderboardHidden === true,
            });
          });
          lastDocument = snapshot.docs.at(-1);
          if (snapshot.empty || result.filter((user) => !user.hidden).length >= leaderboardVisibleLimit) break;
        } while (result.length < leaderboardVisibleLimit * 2);

        const visibleUsers = result.filter((user) => !user.hidden).slice(0, leaderboardVisibleLimit);
        void Promise.all([
          writeCachedLeaderboard(visibleUsers),
          writeKvLeaderboard(visibleUsers),
        ]);
        if (active) {
          setUsers(visibleUsers);
          setError("");
        }
      } catch (loadError) {
        console.error("Leaderboard komentar gagal dimuat.", loadError);
        if (active && !cachedUsers.length) setError("Leaderboard belum bisa dimuat. Silakan coba lagi.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadLeaderboard();
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
          <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-10 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">Loading leaderboard...</div>
        ) : error ? (
          <div role="alert" className="rounded-2xl border border-red-300/60 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-400/30 dark:bg-red-950/30 dark:text-red-200">{error}</div>
        ) : !topUsers.length ? (
          <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-10 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">Belum ada data komentar.</div>
        ) : (
          <>
            <section aria-label="Top six commenters" className="mb-8 grid grid-cols-3 gap-2 min-[900px]:grid-cols-6 min-[900px]:gap-3">
              {topUsers.map((user, index) => (
                <article
                  key={user.uid}
                  className={`relative overflow-hidden rounded-xl border p-4 shadow-sm transition duration-200 touch-manipulation hover:-translate-y-1 hover:brightness-110 hover:shadow-2xl active:scale-[0.98] active:brightness-125 active:shadow-2xl focus-within:brightness-110 focus-within:shadow-2xl ${
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
                  <button type="button" onClick={() => openProfile(user.uid)} aria-label={`Open profile of ${displayName(user)}`} className="mx-auto block rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mikoroku-accent,#9d1018)]">
                    <img src={user.avatar} alt="" className="h-16 w-16 rounded-full border-2 border-white object-cover shadow dark:border-slate-600" />
                  </button>
                  <button type="button" onClick={() => openProfile(user.uid)} className="mx-auto mt-3 block max-w-full truncate text-center text-sm font-bold hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mikoroku-accent,#9d1018)]">{displayName(user)}</button>
                  {user.username && <p className="truncate text-center text-[10px] text-slate-500 dark:text-slate-400">@{user.username}</p>}
                  <span className="mx-auto mt-2 block w-fit rounded-full border border-black/10 bg-white/40 px-2 py-0.5 text-[9px] font-bold text-slate-700 dark:border-white/15 dark:bg-black/20 dark:text-white">LV {commentLevel(user.commentCount)}</span>
                  <p className={`mt-4 text-center text-xl font-black ${
                    ["text-violet-700 dark:text-violet-300", "text-red-700 dark:text-red-300", "text-orange-700 dark:text-orange-300", "text-yellow-700 dark:text-yellow-300", "text-blue-700 dark:text-blue-300", "text-green-700 dark:text-green-300"][index]
                  }`}>{user.commentCount.toLocaleString()}</p>
                  <p className="text-center text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">comments</p>
                </article>
              ))}
            </section>

            <section aria-labelledby="leaderboard-list-title" className="rounded-2xl border border-slate-200/80 bg-white/60 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03] sm:p-5">
              <div className="border-b border-slate-200/80 px-5 py-4 dark:border-white/10">
                <h2 id="leaderboard-list-title" className="m-0 text-lg font-bold">Comment Leaderboard</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Diurutkan dari jumlah komentar terbanyak.</p>
              </div>
              <ol className="mt-4 grid gap-3 sm:grid-cols-2">
                {restUsers.map((user, index) => (
                  <li key={user.uid} className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white/70 px-4 py-3 transition duration-200 touch-manipulation hover:-translate-y-0.5 hover:brightness-110 hover:border-[var(--mikoroku-accent,#9d1018)]/60 hover:shadow-lg active:scale-[0.99] active:brightness-125 active:shadow-xl focus-within:brightness-110 focus-within:shadow-lg dark:border-white/10 dark:bg-white/[0.04] sm:gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-300/80 bg-slate-100 text-sm font-bold text-slate-500 dark:border-white/15 dark:bg-white/[0.06] dark:text-slate-300">{index + 6}</span>
                    <button type="button" onClick={() => openProfile(user.uid)} aria-label={`Open profile of ${displayName(user)}`} className="shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mikoroku-accent,#9d1018)]">
                      <img src={user.avatar} alt="" className="h-11 w-11 rounded-full border border-slate-200 object-cover dark:border-white/15" />
                    </button>
                    <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-1">
                          <button type="button" onClick={() => openProfile(user.uid)} className="min-w-0 truncate text-left text-sm font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mikoroku-accent,#9d1018)]">{displayName(user)}</button>
                          <span className="shrink-0 rounded-full border border-slate-300/80 bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500 dark:border-white/15 dark:bg-white/[0.06] dark:text-slate-300">LV {commentLevel(user.commentCount)}</span>
                        </div>
                        {user.username && <p className="truncate text-xs text-slate-500 dark:text-slate-400">@{user.username}</p>}
                    </div>
                    <p className="shrink-0 text-sm font-bold text-[var(--mikoroku-accent,#9d1018)]">{user.commentCount.toLocaleString()} <span className="font-normal text-slate-500 dark:text-slate-400">comments</span></p>
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
