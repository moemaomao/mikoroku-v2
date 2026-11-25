"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CoverImage } from "../lib/cover-image";
import { setLocalStorageCacheItem } from "../lib/local-storage-cache";
import { setCachedBookmarkCount } from "../lib/reading-stats-cache";
import { markLocalBookmarksUpdated } from "../../lib/reading-stats";
import GlobalAuth from "../global-auth";
import { initializeFirebaseClient, loadFirestoreMangaCatalog } from "../lib/firebase-client";
import {
  getSeriesNotificationUpdates,
  getSeriesNotificationUserId,
  loadSeriesNotificationSubscriptions,
  markSeriesNotificationUpdatesRead,
  readSeriesNotificationSubscriptions,
  removeSeriesNotificationSubscription,
  SERIES_NOTIFICATIONS_UPDATED_EVENT,
  SERIES_NOTIFICATIONS_STORAGE_KEY,
  type SeriesNotificationSubscription,
  type SeriesNotificationUpdate,
} from "../lib/series-notifications";
import MangaDataProvider from "../manga-data-provider";
import UserModals from "../user-modals";
import SiteFooter from "../site-footer";
import SiteHeader from "../site-header";
import { isNsfwManga } from "../lib/nsfw";

type Bookmark = {
  title: string;
  img: string;
  slug: string;
  addedAt: number;
  updatedAt: number;
};

type AuthUser = {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
};

type FirestoreDocumentReference = {
  collection: (name: string) => FirestoreCollection;
  get: () => Promise<{ exists: boolean; data: () => Record<string, unknown> | undefined }>;
  set: (data: Record<string, unknown>, options?: { merge?: boolean }) => Promise<void>;
  delete: () => Promise<void>;
};

type FirestoreTimestamp = {
  toMillis?: () => number;
};

type FirestoreBookmark = {
  title?: string;
  img?: string;
  slug?: string;
  addedAt?: number | FirestoreTimestamp;
  updatedAt?: number | FirestoreTimestamp;
  seriesNotification?: boolean;
};

type FirestoreSnapshot = {
  empty: boolean;
  forEach: (callback: (document: {
    id: string;
    data: () => FirestoreBookmark;
  }) => void) => void;
};

type FirestoreCollection = {
  doc: (id: string) => FirestoreDocumentReference;
  orderBy: (field: string, direction: "desc") => {
    get: () => Promise<FirestoreSnapshot>;
  };
  where: (field: string, operator: string, value: unknown) => {
    get: () => Promise<{ docs: Array<{ id: string }> }>;
  };
  limit: (count: number) => {
    get: () => Promise<FirestoreSnapshot>;
  };
};

type FirebaseCompatApp = {
  name?: string;
  firestore?: () => unknown;
};

type FirebaseCompat = {
  apps: FirebaseCompatApp[];
  initializeApp: (config: Record<string, string>, name?: string) => FirebaseCompatApp;
  auth: (() => {
    currentUser: AuthUser | null;
    onAuthStateChanged: (callback: (user: AuthUser | null) => void) => () => void;
    signInWithEmailAndPassword: (email: string, password: string) => Promise<unknown>;
    createUserWithEmailAndPassword: (email: string, password: string) => Promise<unknown>;
    signInWithPopup: (provider: unknown) => Promise<unknown>;
  }) & {
    GoogleAuthProvider: new () => unknown;
    GithubAuthProvider: new () => unknown;
    FacebookAuthProvider: new () => unknown;
    TwitterAuthProvider: new () => unknown;
  };
  firestore: (() => {
    collection: (name: string) => FirestoreCollection;
    batch: () => {
      set: (reference: unknown, data: Record<string, unknown>) => void;
      commit: () => Promise<void>;
    };
  }) & {
    FieldValue: {
      serverTimestamp: () => unknown;
    };
  };
};

declare global {
  interface Window {
    firebase?: FirebaseCompat;
    saveBookmarkSync?: (bookmark: Bookmark) => Promise<void>;
    firestore?: unknown;
    fs?: {
      collection?: (...args: unknown[]) => unknown;
      doc?: (...args: unknown[]) => unknown;
      getDoc?: (reference: unknown) => Promise<{
        exists: () => boolean;
        data: () => Record<string, unknown>;
      }>;
      getDocs?: (reference: unknown) => Promise<{
        empty: boolean;
        forEach: (callback: (document: {
          id: string;
          data: () => Record<string, unknown>;
          updateTime?: { toDate?: () => Date; seconds?: number };
        }) => void) => void;
      }>;
      addDoc?: (reference: unknown, data: Record<string, unknown>) => Promise<unknown>;
      serverTimestamp?: () => unknown;
    };
    __authListenerAttached?: boolean;
    __mangaDataLoaded?: boolean;
    showHistory?: () => void;
    currentUser?: AuthUser | null;
    userStatsCache?: Record<string, Record<string, unknown>>;
    triggerLogin?: (provider?: string) => Promise<void>;
  }
}

type AuthStatus = "loading" | "guest" | "logged-in" | "unavailable";

const firebaseConfig = {
  apiKey: "AIzaSyCxufJubuS95zQnvctINvzj-H8WSIgsse4",
  authDomain: "widget-comment.firebaseapp.com",
  projectId: "widget-comment",
  storageBucket: "widget-comment.firebasestorage.app",
  messagingSenderId: "249700505242",
  appId: "1:249700505242:web:dab240af09caf30ad7f123",
};

function normalizeTitle(title: string): string {
  return title.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9\s-]/g, "")
    .trim().replace(/\s+/g, "-").replace(/-+/g, "-");
}

function readLocalBookmarks(): Bookmark[] {
  try {
    const items = JSON.parse(localStorage.getItem("mangaBookmarks") || "[]") as unknown[];
    return items.flatMap((item) => {
      if (typeof item === "string" && item.trim()) {
        return [{
          title: item.trim(),
          img: "",
          slug: slugify(item),
          addedAt: 0,
          updatedAt: 0,
        }];
      }
      if (!item || typeof item !== "object") return [];

      const value = item as Partial<Bookmark>;
      if (typeof value.title !== "string" || !value.title.trim()) return [];
      return [{
        title: value.title.trim(),
        img: typeof value.img === "string" ? value.img : "",
        slug: typeof value.slug === "string" && value.slug ? value.slug : slugify(value.title),
        addedAt: Number(value.addedAt) || 0,
        updatedAt: Number(value.updatedAt) || 0,
      }];
    });
  } catch (error) {
    console.warn("Daftar bookmark lokal tidak valid dan akan diabaikan.", error);
    return [];
  }
}

function timestampValue(value?: number | FirestoreTimestamp): number {
  if (typeof value === "number") return value;
  return value?.toMillis?.() || 0;
}

function getFirestoreCollection(user: AuthUser): FirestoreCollection {
  const firebase = window.firebase;
  if (!firebase) throw new Error("Firebase belum tersedia.");
  return firebase.firestore().collection("users").doc(user.uid).collection("bookmarks");
}

function scriptAlreadyExecuted(src: string): boolean {
  if (src.includes("firebase-app-compat.js")) return !!window.firebase?.initializeApp;
  if (src.includes("firebase-auth-compat.js")) return !!window.firebase?.auth;
  if (src.includes("firebase-firestore-compat.js")) return !!window.firebase?.firestore;
  return false;
}

function loadScript(src: string, type = "text/javascript"): Promise<void> {
  return new Promise((resolve, reject) => {
    const absoluteSrc = new URL(src, window.location.href).href;
    const existing = [...document.scripts].find((script) => script.src === absoluteSrc);
    if (existing) {
      if (existing.dataset.loaded === "true" || scriptAlreadyExecuted(src)) {
        existing.dataset.loaded = "true";
        resolve();
      } else {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error(`Gagal memuat ${src}`)), { once: true });
      }
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.type = type;
    script.async = false;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => {
      script.remove();
      reject(new Error(`Gagal memuat ${src}`));
    };
    document.head.appendChild(script);
  });
}

async function initializeBookmarkIntegrations(): Promise<void> {
  await loadScript("https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js");
  await loadScript("https://www.gstatic.com/firebasejs/10.14.0/firebase-auth-compat.js");
  await loadScript("https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore-compat.js");
  if (!window.firebase) throw new Error("Firebase compat SDK tidak tersedia setelah dimuat.");
  if (!window.firebase.apps.some((app) => app.name === "[DEFAULT]")) {
    window.firebase.initializeApp(firebaseConfig);
  }

  initializeFirebaseClient();
}

function bookmarkFromFirestore(document: {
  data: () => FirestoreBookmark;
}): Bookmark | null {
  const data = document.data();
  if (!data.title || data.seriesNotification === true) return null;
  return {
    title: data.title,
    img: data.img || "",
    slug: data.slug || slugify(data.title),
    addedAt: timestampValue(data.addedAt),
    updatedAt: timestampValue(data.updatedAt),
  };
}

async function migrateLocalBookmarks(user: AuthUser, local: Bookmark[]): Promise<void> {
  if (!local.length || !window.firebase) return;
  const collection = getFirestoreCollection(user);
  const snapshot = await collection.orderBy("updatedAt", "desc").get();
  const existing = new Set<string>();
  snapshot.forEach((document) => {
    const bookmark = bookmarkFromFirestore(document);
    if (bookmark) existing.add(normalizeTitle(bookmark.title));
  });
  const missing = local.filter((item) => !existing.has(normalizeTitle(item.title)));
  if (!missing.length) return;

  const firestore = window.firebase.firestore();
  const batch = firestore.batch();
  for (const item of missing) {
    batch.set(collection.doc(normalizeTitle(item.title)), {
      title: item.title,
      img: item.img,
      slug: item.slug || slugify(item.title),
      addedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
}

export default function BookmarkPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [activeView, setActiveView] = useState<"bookmarks" | "notifications">("bookmarks");
  const [notificationSubscriptions, setNotificationSubscriptions] = useState<SeriesNotificationSubscription[]>([]);
  const [displayedUpdates, setDisplayedUpdates] = useState<SeriesNotificationUpdate[]>([]);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const [notificationRemoving, setNotificationRemoving] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  const [syncError, setSyncError] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);
  const coverLookupAttempted = useRef(false);

  const refreshLocalBookmarks = useCallback(() => {
    setBookmarks(readLocalBookmarks());
  }, []);

  useEffect(() => {
    refreshLocalBookmarks();
    setNotificationSubscriptions(readSeriesNotificationSubscriptions());
    const onStorage = (event: StorageEvent) => {
      if (event.key === "mangaBookmarks") refreshLocalBookmarks();
      if (event.key === SERIES_NOTIFICATIONS_STORAGE_KEY) {
        setNotificationSubscriptions(readSeriesNotificationSubscriptions());
      }
    };
    const onBookmarkUpdate = () => refreshLocalBookmarks();
    const onNotificationUpdate = () => {
      const local = readSeriesNotificationSubscriptions();
      setNotificationSubscriptions(local);
      setDisplayedUpdates((current) =>
        current
          .filter((update) => local.some((item) => item.slug === update.subscription.slug))
          .map((update) => ({ ...update, unread: false })),
      );
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("bookmarkUpdated", onBookmarkUpdate);
    window.addEventListener(SERIES_NOTIFICATIONS_UPDATED_EVENT, onNotificationUpdate);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("bookmarkUpdated", onBookmarkUpdate);
      window.removeEventListener(SERIES_NOTIFICATIONS_UPDATED_EVENT, onNotificationUpdate);
    };
  }, [refreshLocalBookmarks]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("view") === "notifications") {
      setActiveView("notifications");
    }
  }, []);

  useEffect(() => {
    if (coverLookupAttempted.current || !bookmarks.some((bookmark) => !bookmark.img)) return;
    coverLookupAttempted.current = true;
    const controller = new AbortController();

    loadFirestoreMangaCatalog()
      .then((items) => {
        if (controller.signal.aborted) return;
        const index = new Map<string, (typeof items)[number]>();
        for (const item of items) {
          if (typeof item.title === "string" && item.title.trim()) {
            index.set(normalizeTitle(item.title), item);
          }
        }
        setBookmarks((current) => {
          const next = current.map((bookmark) => {
            if (bookmark.img) return bookmark;
            const match = index.get(normalizeTitle(bookmark.title));
            return match ? {
              ...bookmark,
              img: typeof match.img === "string"
                ? match.img
                : typeof match.cover === "string" ? match.cover : "",
              slug: typeof match.slug === "string" && match.slug ? match.slug : bookmark.slug,
            } : bookmark;
          });
          localStorage.setItem("mangaBookmarks", JSON.stringify(next));
          return next;
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.warn("Cover bookmark tidak dapat diperkaya dari metadata manga.", error);
      });

    return () => controller.abort();
  }, [bookmarks]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let authTimeout: number | undefined;
    let active = true;
    const loadAccountNotifications = async (uid?: string) => {
      setNotificationSubscriptions(readSeriesNotificationSubscriptions());
      try {
        const subscriptions = await loadSeriesNotificationSubscriptions(uid || "");
        if (active) {
          setNotificationSubscriptions(subscriptions);
          setNotificationError("");
        }
      } catch (error) {
        console.error("Notifikasi seri gagal disinkronkan.", error);
        if (active) {
          setNotificationError("Notifikasi lokal tetap tersedia, tetapi sinkronisasi akun gagal.");
        }
      }
    };
    const loadAccountBookmarks = async (user: AuthUser | null) => {
      if (!active) return;
      setSyncError("");
      if (!user) {
        setAuthStatus("guest");
        refreshLocalBookmarks();
        void loadAccountNotifications();
        return;
      }

      setAuthStatus("logged-in");
      void loadAccountNotifications(user.uid);
      const local = readLocalBookmarks();
      try {
        await migrateLocalBookmarks(user, local);
        const snapshot = await getFirestoreCollection(user).orderBy("updatedAt", "desc").get();
        const remote = new Map<string, Bookmark>();
        snapshot.forEach((document) => {
          const bookmark = bookmarkFromFirestore(document);
          if (bookmark) remote.set(normalizeTitle(bookmark.title), bookmark);
        });
        for (const bookmark of local) {
          const key = normalizeTitle(bookmark.title);
          if (!remote.has(key)) remote.set(key, bookmark);
        }
        const merged = [...remote.values()].sort((a, b) =>
          (b.updatedAt || b.addedAt) - (a.updatedAt || a.addedAt),
        );
        localStorage.setItem("mangaBookmarks", JSON.stringify(merged));
        markLocalBookmarksUpdated();
        void setCachedBookmarkCount(user.uid, merged.length);
        if (active) setBookmarks(merged);
      } catch (error) {
        console.error("Bookmark Firestore gagal dimuat; menggunakan data lokal.", error);
        if (active) {
          setAuthStatus("unavailable");
          setSyncError("Sinkronisasi akun gagal. Bookmark lokal tetap tersedia.");
          refreshLocalBookmarks();
        }
      }
    };

    initializeBookmarkIntegrations().then(() => {
      if (!active || !window.firebase) return;
      authTimeout = window.setTimeout(() => {
        if (!active) return;
        setAuthStatus("unavailable");
        setSyncError("Status akun tidak dapat diverifikasi. Bookmark lokal tetap tersedia.");
      }, 10_000);
      unsubscribe = window.firebase.auth().onAuthStateChanged((user) => {
        if (authTimeout !== undefined) window.clearTimeout(authTimeout);
        void loadAccountBookmarks(user);
      });
    }).catch((error: unknown) => {
      console.error("Integrasi halaman bookmark gagal dimuat.", error);
      if (active) {
        setAuthStatus("unavailable");
        setSyncError("Layanan akun tidak tersedia. Bookmark lokal tetap dapat digunakan.");
        void loadAccountNotifications();
      }
    });

    return () => {
      active = false;
      if (authTimeout !== undefined) window.clearTimeout(authTimeout);
      unsubscribe?.();
    };
  }, [refreshLocalBookmarks]);

  useEffect(() => {
    if (activeView !== "notifications" || authStatus === "loading") return;
    let active = true;
    const loadNotifications = async () => {
      setNotificationLoading(true);
      setNotificationError("");
      let subscriptions = readSeriesNotificationSubscriptions();
      try {
        subscriptions = await loadSeriesNotificationSubscriptions(getSeriesNotificationUserId() || "");
        if (active) setNotificationSubscriptions(subscriptions);
      } catch (error) {
        console.error("Daftar notifikasi seri gagal dimuat dari Firestore.", error);
        if (active) setNotificationError("Gagal menyinkronkan notifikasi. Data lokal tetap ditampilkan.");
      }

      if (!subscriptions.length) {
        if (active) {
          setDisplayedUpdates([]);
          setNotificationLoading(false);
        }
        return;
      }

      try {
        const records = await loadFirestoreMangaCatalog({ force: true });
        if (!active) return;
        const updates = getSeriesNotificationUpdates(subscriptions, records);
        setDisplayedUpdates(updates);
        const markedRead = await markSeriesNotificationUpdatesRead(
          subscriptions,
          records,
          getSeriesNotificationUserId() || "",
        );
        if (active) setNotificationSubscriptions(markedRead);
      } catch (error) {
        console.error("Update seri gagal dimuat.", error);
        if (active) setNotificationError("Data update terbaru tidak dapat dimuat saat ini.");
      } finally {
        if (active) setNotificationLoading(false);
      }
    };
    void loadNotifications();
    return () => {
      active = false;
    };
  }, [activeView, authStatus]);

  useEffect(() => {
    if (activeView === "notifications" || !notificationSubscriptions.length) return;
    let active = true;
    void loadFirestoreMangaCatalog()
      .then((records) => {
        if (active) setDisplayedUpdates(getSeriesNotificationUpdates(notificationSubscriptions, records));
      })
      .catch((error: unknown) => {
        console.warn("Update seri untuk badge bookmark tidak dapat dimuat.", error);
      });
    return () => {
      active = false;
    };
  }, [activeView, notificationSubscriptions]);

  useEffect(() => {
    window.saveBookmarkSync = async (value) => {
      const title = value.title.trim();
      if (!title) return;
      const nextBookmark: Bookmark = {
        title,
        img: value.img || "",
        slug: value.slug || slugify(title),
        addedAt: value.addedAt || Date.now(),
        updatedAt: Date.now(),
      };
      const next = [
        nextBookmark,
        ...readLocalBookmarks().filter((item) => normalizeTitle(item.title) !== normalizeTitle(title)),
      ];
      localStorage.setItem("mangaBookmarks", JSON.stringify(next));
      markLocalBookmarksUpdated();
      setBookmarks(next);

      const user = window.firebase?.auth().currentUser;
      if (!user || !window.firebase) return;
      void setCachedBookmarkCount(user.uid, next.length);
      try {
        await getFirestoreCollection(user).doc(normalizeTitle(title)).set({
          ...nextBookmark,
          addedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      } catch (error) {
        console.error("Bookmark gagal disimpan ke Firestore.", error);
        setAuthStatus("unavailable");
        setSyncError("Bookmark tersimpan di perangkat, tetapi gagal disinkronkan ke akun.");
      }
    };
    return () => {
      delete window.saveBookmarkSync;
    };
  }, []);

  const visibleBookmarks = useMemo(() => {
    return [...bookmarks]
      .sort((a, b) => (b.updatedAt || b.addedAt) - (a.updatedAt || a.addedAt))
  }, [bookmarks]);

  const openBookmark = useCallback((bookmark: Bookmark) => {
    setLocalStorageCacheItem("currentManga", JSON.stringify({
      title: bookmark.title,
      img: bookmark.img,
      cover: bookmark.img,
      slug: bookmark.slug || slugify(bookmark.title),
    }));
    window.location.href = `/series/${encodeURIComponent(bookmark.slug || slugify(bookmark.title))}`;
  }, []);

  const selectView = useCallback((nextView: "bookmarks" | "notifications") => {
    setActiveView(nextView);
    const url = new URL(window.location.href);
    if (nextView === "notifications") url.searchParams.set("view", "notifications");
    else url.searchParams.delete("view");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  const openNotificationSeries = useCallback((subscription: SeriesNotificationSubscription) => {
    setLocalStorageCacheItem("currentManga", JSON.stringify({
      title: subscription.title,
      img: subscription.cover,
      cover: subscription.cover,
      slug: subscription.slug,
    }));
    window.location.href = `/series/${encodeURIComponent(subscription.slug)}`;
  }, []);

  const removeNotification = useCallback(async (subscription: SeriesNotificationSubscription) => {
    setNotificationRemoving(subscription.slug);
    setNotificationError("");
    try {
      const next = await removeSeriesNotificationSubscription(
        subscription.slug,
        getSeriesNotificationUserId() || "",
      );
      setNotificationSubscriptions(next);
      setDisplayedUpdates((current) =>
        current.filter((update) => update.subscription.slug !== subscription.slug),
      );
    } catch (error) {
      console.error("Notifikasi seri gagal dihapus.", error);
      setNotificationError("Notifikasi dihapus dari perangkat, tetapi gagal disinkronkan.");
    } finally {
      setNotificationRemoving(null);
    }
  }, []);

  const removeBookmark = useCallback(async (bookmark: Bookmark) => {
    setRemoving(bookmark.title);
    const next = readLocalBookmarks().filter(
      (item) => normalizeTitle(item.title) !== normalizeTitle(bookmark.title),
    );
    localStorage.setItem("mangaBookmarks", JSON.stringify(next));
    markLocalBookmarksUpdated();
    setBookmarks(next);
    window.dispatchEvent(new Event("bookmarkUpdated"));

    const user = window.firebase?.auth().currentUser;
    if (!user || !window.firebase) {
      setRemoving(null);
      return;
    }
    void setCachedBookmarkCount(user.uid, next.length);
    try {
      await getFirestoreCollection(user).doc(normalizeTitle(bookmark.title)).delete();
    } catch (error) {
      console.error("Bookmark gagal dihapus dari Firestore.", error);
      setAuthStatus("unavailable");
      setSyncError("Bookmark dihapus dari perangkat, tetapi gagal dihapus dari akun.");
    } finally {
      setRemoving(null);
    }
  }, []);

  return (
    <>
      <GlobalAuth />
      <UserModals />
      <MangaDataProvider />
      <SiteHeader />
      <main className="bookmark-route route-page-background">
        <section className="bookmark-container" aria-labelledby="bookmark-title">
          <header className="bookmark-header">
            <h1 id="bookmark-title"><i className="fas fa-bookmark" aria-hidden="true" /> Bookmark</h1>
          </header>

          <div className={`bookmark-notice ${authStatus === "logged-in" ? "logged-in" : "guest"}`} role="status">
            <i className={`fas ${authStatus === "logged-in" ? "fa-cloud" : "fa-info-circle"}`} aria-hidden="true" />
            <div>
              {authStatus === "logged-in" ? (
                <><strong>Tersinkron:</strong> Bookmark kamu tersimpan di akun dan bisa diakses di device lain.</>
              ) : authStatus === "loading" ? (
                <>Memeriksa status akun. Bookmark tetap tersedia secara lokal.</>
              ) : authStatus === "unavailable" ? (
                <>Layanan akun tidak tersedia. Bookmark hanya tersimpan di perangkat ini.</>
              ) : (
                <><strong>Tips:</strong> Login agar bookmark tetap tersedia saat ganti perangkat atau membersihkan data browser. Tanpa login, bookmark tersimpan di perangkat ini.</>
              )}
            </div>
          </div>

          {syncError && <p className="bookmark-sync-error" role="alert">{syncError}</p>}
          <nav className="bookmark-tabs" aria-label="Bookmark and notifications">
            <button
              type="button"
              className={`bookmark-tab${activeView === "bookmarks" ? " active" : ""}`}
              aria-pressed={activeView === "bookmarks"}
              onClick={() => selectView("bookmarks")}
            >
              <i className="fas fa-bookmark" aria-hidden="true" />
              <span>Seri bookmark</span>
              <span className="bookmark-tab-count">{visibleBookmarks.length}</span>
            </button>
            <button
              type="button"
              className={`bookmark-tab${activeView === "notifications" ? " active" : ""}`}
              aria-pressed={activeView === "notifications"}
              onClick={() => selectView("notifications")}
            >
              <i className="fas fa-bell" aria-hidden="true" />
              <span>Notifikasi</span>
              {displayedUpdates.some((update) => update.unread) && (
                <span className="bookmark-tab-badge" aria-label={`${displayedUpdates.filter((update) => update.unread).length} update belum dibaca`}>
                  {displayedUpdates.filter((update) => update.unread).length}
                </span>
              )}
            </button>
          </nav>

          {activeView === "bookmarks" ? (
            visibleBookmarks.length === 0 ? (
              <div className="bookmark-empty">
                <i className="far fa-bookmark" aria-hidden="true" />
                <h2>Bookmark kosong</h2>
              </div>
            ) : (
              <ul className="bookmark-list">
                {visibleBookmarks.map((bookmark) => (
                  <li className="bookmark-card" key={normalizeTitle(bookmark.title)}>
                    <button className="bookmark-open" type="button" onClick={() => openBookmark(bookmark)}>
                      <span className="bookmark-cover">
                        <CoverImage
                          src={bookmark.img || "/assets/icons/favicon.ico"}
                          alt=""
                          nsfw={isNsfwManga(bookmark.slug, bookmark.title)}
                          showNsfwBadge={false}
                          onError={(event) => { event.currentTarget.src = "/assets/icons/favicon.ico"; }}
                        />
                      </span>
                      <span className="bookmark-info">
                        <span className="bookmark-title">{bookmark.title}</span>
                      </span>
                    </button>
                    <button
                      className="bookmark-remove"
                      type="button"
                      aria-label={`Hapus bookmark ${bookmark.title}`}
                      disabled={removing === bookmark.title}
                      onClick={() => void removeBookmark(bookmark)}
                    >
                      <i className={`fas ${removing === bookmark.title ? "fa-spinner fa-spin" : "fa-trash"}`} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <>
              {notificationError && <p className="bookmark-sync-error" role="alert">{notificationError}</p>}
              {notificationLoading ? (
                <div className="bookmark-empty" role="status">
                  <i className="fas fa-spinner fa-spin" aria-hidden="true" />
                  <h2>Memuat notifikasi...</h2>
                </div>
              ) : notificationSubscriptions.length === 0 ? (
                <div className="bookmark-empty">
                  <i className="far fa-bell" aria-hidden="true" />
                  <h2>Belum mengikuti notifikasi seri</h2>
                  <p>Aktifkan tombol “Notify updates” pada halaman seri untuk mengikuti update.</p>
                </div>
              ) : (
                <ul className="bookmark-list">
                  {notificationSubscriptions.map((subscription) => {
                    const update = displayedUpdates.find((item) => item.subscription.slug === subscription.slug);
                    const image = subscription.cover ||
                      (typeof update?.record.cover === "string" ? update.record.cover : "") ||
                      (typeof update?.record.img === "string" ? update.record.img : "");
                    return (
                      <li className="bookmark-card" key={subscription.slug}>
                        <button className="bookmark-open" type="button" onClick={() => openNotificationSeries(subscription)}>
                          <span className="bookmark-cover">
                            <CoverImage
                              src={image || "/assets/icons/favicon.ico"}
                              alt=""
                              nsfw={isNsfwManga(subscription.slug, subscription.title)}
                              showNsfwBadge={false}
                              onError={(event) => { event.currentTarget.src = "/assets/icons/favicon.ico"; }}
                            />
                          </span>
                          <span className="bookmark-info">
                            <span className="bookmark-title">{subscription.title}</span>
                            <span className={`bookmark-notification-status${update?.unread ? " unread" : ""}`}>
                              {update?.unread
                                ? "Update terbaru"
                                : update
                                  ? update.hasUpdate
                                    ? "Update tersedia"
                                    : "Diikuti"
                                  : "Data update belum tersedia"}
                              {update?.updatedAt ? ` · ${new Date(update.updatedAt).toLocaleDateString("id-ID")}` : ""}
                            </span>
                          </span>
                        </button>
                        <button
                          className="bookmark-remove"
                          type="button"
                          aria-label={`Matikan notifikasi ${subscription.title}`}
                          disabled={notificationRemoving === subscription.slug}
                          onClick={() => void removeNotification(subscription)}
                        >
                          <i className={`fas ${notificationRemoving === subscription.slug ? "fa-spinner fa-spin" : "fa-bell-slash"}`} aria-hidden="true" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
