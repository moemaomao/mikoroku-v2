"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CoverImage } from "../lib/cover-image";
import GlobalAuth from "../global-auth";
import { initializeFirebaseClient } from "../lib/firebase-client";
import MangaDataProvider from "../manga-data-provider";
import UserModals from "../user-modals";
import SiteFooter from "../site-footer";
import SiteHeader from "../site-header";

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

const githubDatasetUrl =
  "https://raw.githubusercontent.com/moemaomao/mymangadata/main/all-manga.json";

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
  if (!data.title) return null;
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
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  const [syncError, setSyncError] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);
  const coverLookupAttempted = useRef(false);

  const refreshLocalBookmarks = useCallback(() => {
    setBookmarks(readLocalBookmarks());
  }, []);

  useEffect(() => {
    refreshLocalBookmarks();
    const onStorage = (event: StorageEvent) => {
      if (event.key === "mangaBookmarks") refreshLocalBookmarks();
    };
    const onBookmarkUpdate = () => refreshLocalBookmarks();
    window.addEventListener("storage", onStorage);
    window.addEventListener("bookmarkUpdated", onBookmarkUpdate);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("bookmarkUpdated", onBookmarkUpdate);
    };
  }, [refreshLocalBookmarks]);

  useEffect(() => {
    if (coverLookupAttempted.current || !bookmarks.some((bookmark) => !bookmark.img)) return;
    coverLookupAttempted.current = true;
    const controller = new AbortController();

    fetch(githubDatasetUrl, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Dataset manga merespons HTTP ${response.status}.`);
        return response.json() as Promise<Array<{
          title?: string;
          slug?: string;
          img?: string;
          cover?: string;
        }>>;
      })
      .then((items) => {
        const index = new Map<string, (typeof items)[number]>();
        for (const item of items) {
          if (item.title) index.set(normalizeTitle(item.title), item);
        }
        setBookmarks((current) => {
          const next = current.map((bookmark) => {
            if (bookmark.img) return bookmark;
            const match = index.get(normalizeTitle(bookmark.title));
            return match ? {
              ...bookmark,
              img: match.img || match.cover || "",
              slug: match.slug || bookmark.slug,
            } : bookmark;
          });
          localStorage.setItem("mangaBookmarks", JSON.stringify(next));
          return next;
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.warn("Cover bookmark tidak dapat diperkaya dari dataset manga.", error);
      });

    return () => controller.abort();
  }, [bookmarks]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let authTimeout: number | undefined;
    let active = true;
    const loadAccountBookmarks = async (user: AuthUser | null) => {
      if (!active) return;
      setSyncError("");
      if (!user) {
        setAuthStatus("guest");
        refreshLocalBookmarks();
        return;
      }

      setAuthStatus("logged-in");
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
      }
    });

    return () => {
      active = false;
      if (authTimeout !== undefined) window.clearTimeout(authTimeout);
      unsubscribe?.();
    };
  }, [refreshLocalBookmarks]);

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
      setBookmarks(next);

      const user = window.firebase?.auth().currentUser;
      if (!user || !window.firebase) return;
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
    localStorage.setItem("currentManga", JSON.stringify({
      title: bookmark.title,
      img: bookmark.img,
      cover: bookmark.img,
      slug: bookmark.slug || slugify(bookmark.title),
    }));
    window.location.href = `/series/${encodeURIComponent(bookmark.slug || slugify(bookmark.title))}`;
  }, []);

  const removeBookmark = useCallback(async (bookmark: Bookmark) => {
    setRemoving(bookmark.title);
    const next = readLocalBookmarks().filter(
      (item) => normalizeTitle(item.title) !== normalizeTitle(bookmark.title),
    );
    localStorage.setItem("mangaBookmarks", JSON.stringify(next));
    setBookmarks(next);
    window.dispatchEvent(new Event("bookmarkUpdated"));

    const user = window.firebase?.auth().currentUser;
    if (!user || !window.firebase) {
      setRemoving(null);
      return;
    }
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

          {visibleBookmarks.length === 0 ? (
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
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
