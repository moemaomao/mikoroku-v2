"use client";

import { imageProxyUrl } from "../lib/image-proxy";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyGlobalAppearance,
  GLOBAL_APPEARANCE_KEY,
  readGlobalAppearance,
} from "./lib/global-appearance";
import { Icon, SiteSidebar } from "./site-header-parts";

type MangaEntry = {
  title: string;
  slug?: string;
  img?: string;
  cover?: string;
  firestore?: boolean;
  github?: boolean;
  [key: string]: unknown;
};

type HeaderBookmark = {
  title: string;
  img?: string;
  slug?: string;
  addedAt?: number;
  updatedAt?: number;
};

type HeaderUser = {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
};

type AnnouncementSnapshot = {
  docs: Array<{ id: string }>;
};

declare global {
  interface Window {
    GITHUB_RAW?: string;
    commentDisplayName?: string | null;
    _headerAvatar?: string | null;
    announcementBadgeCheck?: number;
    triggerLogin?: (provider?: string) => Promise<void>;
    showHistory?: () => void;
    showUserProfile?: (uid: string) => void;
    loadUserNotifications?: () => void;
    showReplyNotifications?: () => void;
    closeReplyNotifications?: () => void;
    loadDmInbox?: () => void;
    openBookmark?: (title: string) => void;
    updateHeaderAuth?: () => Promise<void>;
    syncHeaderDisplayName?: (name: string) => void;
    syncHeaderAvatar?: (avatarUrl: string) => void;
    closeAuthDropdown?: () => void;
  }
}

const LOGO_URL =
  "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhlpxqlAz__8_IHcJpy_JsiuX2dr0ompUWEoaUjtk279x167sNP1AphlLYw92AECMAcyXEg4bSnNcGnKZ86a3KEFGHwyi1huUIJ52zejDYkSeeTEnCL4Loig440EuS6yyeKZjmnAdkdcxsic5rArUT_bwv2Sk4lJgDXSYFSWLBawxBPBjGZPTS-pp2xTsc/s100/MIKOROKU.png";
const DEFAULT_AVATAR = "/assets/icons/favicon.ico";
const DEFAULT_THUMB = "https://mikoroku.com/default-thumb.jpg";
const DISPLAY_NAME_KEY = "commentWidget_displayName";
const AVATAR_KEY = "commentWidget_avatar";
const SIDEBAR_PREF_KEY = "mk_sidebar_open";
const ADMIN_PANEL_EMAILS = ["mikorokuscan@gmail.com", "moemaomao@gmail.com"];
let desktopSidebarPreference: boolean | null = null;
const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/moemaomao/mymangadata/main/";
const ANNOUNCEMENT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAi8z8oGGNJSNe87WhV3FagJZSy_uhuoI",
  authDomain: "mikoroku.firebaseapp.com",
  databaseURL: "https://mikoroku-default-rtdb.firebaseio.com",
  projectId: "mikoroku",
  storageBucket: "mikoroku.firebasestorage.app",
  messagingSenderId: "271920446600",
  appId: "1:271920446600:web:974b11c707ebc11a7bf33d",
};

function isDesktop(): boolean {
  return window.matchMedia("(min-width: 769px)").matches;
}

function normalizeTitle(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s-]/g, "")
    .trim().replace(/\s+/g, "-").replace(/-+/g, "-");
}

function previewCover(value?: string): string {
  if (!value) return DEFAULT_THUMB;
  const url = /^https?:\/\//i.test(value)
    ? value
    : `${window.GITHUB_RAW || GITHUB_RAW_BASE}${value.replace(/^\//, "")}`;
  return imageProxyUrl(url, "headerPreview");
}

function getMangaEntry(value: unknown): MangaEntry | undefined {
  if (!value || typeof value !== "object") return undefined;
  const item = value as Record<string, unknown>;
  if (typeof item.title !== "string" || !item.title.trim()) return undefined;
  return {
    ...item,
    title: item.title,
    slug: typeof item.slug === "string" ? item.slug : undefined,
    img: typeof item.img === "string" ? item.img : undefined,
    cover: typeof item.cover === "string" ? item.cover : undefined,
    firestore: Boolean(item.firestore),
    github: Boolean(item.github),
  };
}

function getCurrentUser(): HeaderUser | null {
  const currentUser = window.currentUser as HeaderUser | null | undefined;
  if (currentUser) return currentUser;

  const firebase = window.firebase;
  if (!firebase?.auth || !firebase.apps.some((app) => app.name === "[DEFAULT]")) return null;
  return (firebase.auth().currentUser as HeaderUser | null | undefined) || null;
}

function getDisplayName(user: HeaderUser | null): string {
  if (!user) return "User";
  const stats = window.userStatsCache?.[user.uid];
  if (typeof stats?.displayName === "string") return stats.displayName;
  if (typeof stats?.username === "string") return stats.username;
  try {
    const cached = localStorage.getItem(DISPLAY_NAME_KEY);
    if (cached) return cached;
  } catch (error) {
    console.warn("Nama pengguna tersimpan tidak dapat dibaca.", error);
  }
  return user.displayName || user.email?.split("@")[0] || "User";
}

function navigateToManga(title: string): void {
  const cleanTitle = title.trim();
  if (!cleanTitle) return;
  const key = normalizeTitle(cleanTitle);
  const mangaData = Object.values(window.mangaData || {}).flatMap((value) => {
    const item = getMangaEntry(value);
    return item ? [item] : [];
  });
  const manga = mangaData.find((item) => normalizeTitle(item.title) === key) ||
    mangaData.find((item) => item.title.trim().toLowerCase() === cleanTitle.toLowerCase());
  if (manga) {
    try {
      localStorage.setItem("currentManga", JSON.stringify(manga));
    } catch (error) {
      console.warn("Data manga tidak dapat disimpan sebelum navigasi.", error);
    }
  } else {
    try {
      localStorage.setItem("currentManga", JSON.stringify({ title: cleanTitle, slug: slugify(cleanTitle) }));
    } catch (error) {
      console.warn("Judul manga tidak dapat disimpan sebelum navigasi.", error);
    }
  }
  const slug = manga?.slug || slugify(cleanTitle);
  window.location.href = `/series/${encodeURIComponent(slug)}`;
}

function updateBookmarkIcon(): boolean {
  try {
    const bookmarks = JSON.parse(localStorage.getItem("mangaBookmarks") || "[]") as unknown[];
    return bookmarks.length > 0;
  } catch (error) {
    console.warn("Daftar bookmark lokal tidak valid.", error);
    return false;
  }
}

function HeaderContents() {
  const [sidebarOpen, setSidebarOpen] = useState(() => desktopSidebarPreference ?? false);
  const [mobile, setMobile] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [dark, setDark] = useState(false);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [mangaRevision, setMangaRevision] = useState(0);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [bookmarks, setBookmarks] = useState<HeaderBookmark[]>([]);
  const [hasBookmarks, setHasBookmarks] = useState(false);
  const [user, setUser] = useState<HeaderUser | null>(null);
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR);
  const [displayName, setDisplayName] = useState("User");
  const [authOpen, setAuthOpen] = useState(false);
  const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);
  const [announcementLabel, setAnnouncementLabel] = useState("Announcements");
  const searchArea = useRef<HTMLDivElement>(null);
  const bookmarkArea = useRef<HTMLDivElement>(null);
  const authArea = useRef<HTMLDivElement>(null);
  const canAccessAdminPanels = Boolean(
    user?.email && ADMIN_PANEL_EMAILS.includes(user.email.trim().toLowerCase()),
  );

  const closeAuth = useCallback(() => setAuthOpen(false), []);

  useEffect(() => {
    window.closeAuthDropdown = closeAuth;
    window.openBookmark = navigateToManga;
    return () => {
      if (window.closeAuthDropdown === closeAuth) delete window.closeAuthDropdown;
      if (window.openBookmark === navigateToManga) delete window.openBookmark;
    };
  }, [closeAuth]);

  const applyTheme = useCallback((isDark: boolean) => {
    [document.documentElement, document.body].forEach((root) => {
      root.classList.toggle("dark", isDark);
      root.classList.toggle("light", !isDark);
    });
    document.documentElement.style.setProperty("--mk-page-bg", isDark ? "#0b0b0b" : "#f8f9fa");
    document.documentElement.style.setProperty("--mk-route-text", isDark ? "#ffffff" : "#1e293b");
    document.documentElement.style.setProperty("--mk-bookmark-container", isDark ? "#0f0f1e" : "#ffffff");
    document.documentElement.style.setProperty("--mk-bookmark-text", isDark ? "#ffffff" : "#111827");
    document.documentElement.style.setProperty("--mk-commission-card-bg", isDark ? "#171725" : "#ffffff");
    document.documentElement.style.setProperty("--mk-commission-card-text", isDark ? "#e2e8f0" : "#1e293b");
    document.documentElement.style.setProperty("--mk-footer-bg", "transparent");
    document.documentElement.style.setProperty("--mk-footer-card-bg", isDark ? "rgba(15,15,25,0.32)" : "rgba(255,255,255,0.28)");
    document.documentElement.style.setProperty("--mk-footer-card-border", isDark ? "rgba(255,255,255,.1)" : "rgba(15,23,42,.12)");
    document.documentElement.style.setProperty("--mk-footer-card-text", isDark ? "#d4d4d8" : "#334155");
    document.documentElement.style.setProperty("--mk-footer-link", isDark ? "#ff5757" : "#be123c");
    document.documentElement.style.backgroundColor = isDark ? "#0b0b0b" : "#f8f9fa";
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    setDark(isDark);
  }, []);

  useEffect(() => {
    let prefersDark = true;
    try {
      prefersDark = localStorage.getItem("darkMode") !== "false";
    } catch (error) {
      console.warn("Preferensi tema tidak dapat dibaca.", error);
    }
    applyTheme(prefersDark);
    applyGlobalAppearance(readGlobalAppearance());
    const query = window.matchMedia("(min-width: 769px)");
    const applySidebarPreference = () => {
      const desktop = query.matches;
      setMobile(!desktop);
      if (desktop) {
        setSearchExpanded(false);
        setHeaderHidden(false);
      }
      if (!desktop) {
        setSidebarOpen(false);
        document.body.classList.remove("sidebar-open");
        document.body.style.overflow = "";
        return;
      }
      let preferOpen = true;
      try {
        const saved = localStorage.getItem(SIDEBAR_PREF_KEY);
        if (saved === "0") preferOpen = false;
        if (saved === "1") preferOpen = true;
      } catch (error) {
        console.warn("Preferensi sidebar tidak dapat dibaca.", error);
      }
      desktopSidebarPreference = preferOpen;
      setSidebarOpen(preferOpen);
      document.body.classList.toggle("sidebar-open", preferOpen);
      document.body.classList.toggle("left-sidebar-closed", !preferOpen);
    };
    applySidebarPreference();
    query.addEventListener("change", applySidebarPreference);

    let lastScroll = window.scrollY;
    const handleScroll = () => {
      const current = window.scrollY;
      setHeaderHidden(!query.matches && current >= 50 && current > lastScroll);
      lastScroll = current;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSidebarOpen(false);
        setSearchOpen(false);
        setSearchExpanded(false);
        setBookmarksOpen(false);
        setAuthOpen(false);
        if (query.matches) {
          desktopSidebarPreference = false;
          document.body.classList.add("left-sidebar-closed");
          document.body.classList.remove("sidebar-open");
          try {
            localStorage.setItem(SIDEBAR_PREF_KEY, "0");
          } catch (error) {
            console.warn("Preferensi sidebar tidak dapat disimpan.", error);
          }
        } else {
          document.body.classList.remove("sidebar-open");
          document.body.style.overflow = "";
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "darkMode") applyTheme(event.newValue === "true");
      if (event.key === GLOBAL_APPEARANCE_KEY) {
        applyGlobalAppearance(readGlobalAppearance());
      }
      if (event.key === "mangaBookmarks") {
        setHasBookmarks(updateBookmarkIcon());
        setBookmarks(readBookmarks());
      }
    };
    const handleBookmarkUpdate = () => {
      setHasBookmarks(updateBookmarkIcon());
      setBookmarks(readBookmarks());
    };
    const handleMangaDataReady = () => setMangaRevision((revision) => revision + 1);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("bookmarkUpdated", handleBookmarkUpdate);
    window.addEventListener("mangaDataReady", handleMangaDataReady);
    setHasBookmarks(updateBookmarkIcon());
    setBookmarks(readBookmarks());

    return () => {
      query.removeEventListener("change", applySidebarPreference);
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("bookmarkUpdated", handleBookmarkUpdate);
      window.removeEventListener("mangaDataReady", handleMangaDataReady);
      if (!query.matches) {
        document.body.classList.remove("sidebar-open");
        document.body.style.overflow = "";
      }
    };
  }, [applyTheme]);

  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!searchArea.current?.contains(target)) {
        setSearchOpen(false);
        if (!search.trim()) setSearchExpanded(false);
      }
      if (!bookmarkArea.current?.contains(target)) setBookmarksOpen(false);
      if (!authArea.current?.contains(target)) setAuthOpen(false);
    };
    document.addEventListener("mousedown", closeOutside);
    return () => document.removeEventListener("mousedown", closeOutside);
  }, [search]);

  const openSidebar = useCallback(() => {
    setSidebarOpen(true);
    document.body.classList.remove("left-sidebar-closed");
    if (isDesktop()) {
      desktopSidebarPreference = true;
      document.body.classList.add("sidebar-open");
      document.body.style.overflow = "";
      try {
        localStorage.setItem(SIDEBAR_PREF_KEY, "1");
      } catch (error) {
        console.warn("Preferensi sidebar tidak dapat disimpan.", error);
      }
    } else {
      document.body.classList.remove("sidebar-open");
      document.body.style.overflow = "hidden";
    }
  }, []);

  const closeSidebar = useCallback(() => {
    // Blur fokus di dalam sidebar dulu supaya browser tidak complain aria-hidden
    try {
      const sidebar = document.getElementById("siteSidebar");
      const active = document.activeElement;
      if (
        sidebar &&
        active instanceof HTMLElement &&
        sidebar.contains(active)
      ) {
        active.blur();
      }
    } catch {
      /* ignore */
    }
    setSidebarOpen(false);
    document.body.style.overflow = "";
    if (isDesktop()) {
      desktopSidebarPreference = false;
      document.body.classList.add("left-sidebar-closed");
      document.body.classList.remove("sidebar-open");
      try {
        localStorage.setItem(SIDEBAR_PREF_KEY, "0");
      } catch (error) {
        console.warn("Preferensi sidebar tidak dapat disimpan.", error);
      }
    }
  }, []);

  const toggleSidebar = () => {
    if (mobile ? sidebarOpen : document.body.classList.contains("sidebar-open")) {
      closeSidebar();
    } else {
      openSidebar();
    }
  };

  const mangaSearchResults = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return [];
    const unique = new Map<string, MangaEntry>();
    Object.values(window.mangaData || {}).forEach((value) => {
      const item = getMangaEntry(value);
      if (!item?.title) return;
      const key = item.title.trim().toLowerCase();
      if (!unique.has(key)) unique.set(key, item);
    });
    return [...unique.values()]
      .filter((item) => item.title.toLowerCase().includes(keyword))
      .sort((left, right) => {
        const leftTitle = left.title.toLowerCase().trim();
        const rightTitle = right.title.toLowerCase().trim();
        const leftStarts = leftTitle.startsWith(keyword);
        const rightStarts = rightTitle.startsWith(keyword);
        if (leftStarts !== rightStarts) return leftStarts ? -1 : 1;
        return leftTitle.localeCompare(rightTitle);
      })
      .slice(0, 12);
  }, [search, mangaRevision]);

  useEffect(() => {
    let active = true;
    const updateUser = (nextUser: HeaderUser | null) => {
      setUser(nextUser);
      if (!nextUser) {
        setDisplayName("User");
        setAvatar(DEFAULT_AVATAR);
        window.commentDisplayName = null;
        window._headerAvatar = null;
        try {
          localStorage.removeItem(AVATAR_KEY);
        } catch (error) {
          console.warn("Avatar lama tidak dapat dihapus.", error);
        }
        return;
      }
      const nextName = getDisplayName(nextUser);
      setDisplayName(nextName);
      window.commentDisplayName = nextName;
      const quickAvatar = String(
        window.userStatsCache?.[nextUser.uid]?.avatar ||
        localStorage.getItem(AVATAR_KEY) ||
        nextUser.photoURL ||
        DEFAULT_AVATAR,
      );
      setAvatar(quickAvatar);
      window._headerAvatar = quickAvatar;
      void resolveAvatar(nextUser).then((photo) => {
        if (!active) return;
        setAvatar(photo);
        window._headerAvatar = photo;
      });
    };

    const refreshUser = () => updateUser(getCurrentUser());
    const handleUserStats = () => refreshUser();
    window.addEventListener("userStatsReady", handleUserStats);
    window.updateHeaderAuth = async () => refreshUser();
    window.syncHeaderDisplayName = (name) => {
      if (!name) return;
      window.commentDisplayName = name;
      setDisplayName(name);
      try {
        localStorage.setItem(DISPLAY_NAME_KEY, name);
      } catch (error) {
        console.warn("Nama pengguna tidak dapat disimpan.", error);
      }
      if (getCurrentUser()) refreshUser();
    };
    window.syncHeaderAvatar = (url) => {
      if (!url) return;
      setAvatar(url);
      window._headerAvatar = url;
      const current = getCurrentUser();
      if (current) {
        window.userStatsCache ||= {};
        window.userStatsCache[current.uid] ||= {};
        window.userStatsCache[current.uid].avatar = url;
      }
      try {
        localStorage.setItem(AVATAR_KEY, url);
      } catch (error) {
        console.warn("Avatar pengguna tidak dapat disimpan.", error);
      }
    };

    let unsubscribe: (() => void) | undefined;
    let authCheck: number | undefined;
    const connectAuth = () => {
      const firebase = window.firebase;
      if (!firebase?.auth || !firebase.apps.some((app) => app.name === "[DEFAULT]")) return false;
      try {
        unsubscribe = firebase.auth().onAuthStateChanged((nextUser) => {
          window.currentUser = nextUser;
          setAuthOpen(false);
          updateUser(nextUser);
        });
        return true;
      } catch (error) {
        console.warn("Header auth listener gagal diinisialisasi.", error);
        return false;
      }
    };
    if (!connectAuth()) {
      authCheck = window.setInterval(() => {
        if (!connectAuth()) return;
        if (authCheck !== undefined) window.clearInterval(authCheck);
        authCheck = undefined;
      }, 200);
    } else {
      refreshUser();
    }
    const refreshTimers = [
      window.setTimeout(refreshUser, 1500),
      window.setTimeout(refreshUser, 3500),
    ];

    return () => {
      window.removeEventListener("userStatsReady", handleUserStats);
      unsubscribe?.();
      active = false;
      if (authCheck !== undefined) window.clearInterval(authCheck);
      refreshTimers.forEach((timer) => window.clearTimeout(timer));
      delete window.updateHeaderAuth;
      delete window.syncHeaderDisplayName;
      delete window.syncHeaderAvatar;
    };
  }, []);

  const resolveAvatar = async (current: HeaderUser): Promise<string> => {
    const stats = window.userStatsCache?.[current.uid];
    if (typeof stats?.avatar === "string" && stats.avatar) {
      try {
        localStorage.setItem(AVATAR_KEY, stats.avatar);
      } catch (error) {
        console.warn("Avatar cache tidak dapat disimpan.", error);
      }
      return stats.avatar;
    }
    try {
      const cached = localStorage.getItem(AVATAR_KEY);
      if (cached?.startsWith("http")) return cached;
    } catch (error) {
      console.warn("Avatar cache tidak dapat dibaca.", error);
    }
    try {
      const database = window.firebase?.firestore?.();
      const document = database?.collection("userStats").doc(current.uid);
      if (document) {
        const snapshot = await document.get();
        const data = snapshot.exists ? snapshot.data() || {} : undefined;
        if (data) {
          window.userStatsCache ||= {};
          window.userStatsCache[current.uid] = {
            ...window.userStatsCache[current.uid],
            ...data,
          };
          if (typeof data.avatar === "string" && data.avatar) {
            localStorage.setItem(AVATAR_KEY, data.avatar);
            return data.avatar;
          }
        }
      }
    } catch (error) {
      console.warn("Avatar pengguna gagal dimuat dari Firestore.", error);
    }
    return current.photoURL || DEFAULT_AVATAR;
  };

  useEffect(() => {
    let active = true;
    const updateBadge = async () => {
      const firebase = window.firebase;
      if (!firebase?.firestore) return false;
      try {
        const app = firebase.apps.find((item) => item.name === "mikoroku-announcements") ||
          firebase.initializeApp(ANNOUNCEMENT_FIREBASE_CONFIG, "mikoroku-announcements");
        const database = app.firestore?.() || firebase.firestore();
        const snapshot = await (database as {
          collection: (name: string) => {
            where: (field: string, operator: string, value: unknown) => {
              get: () => Promise<AnnouncementSnapshot>;
            };
          };
        })
          .collection("announcements")
          .where("published", "==", true)
          .get();
        let readIds: string[] = [];
        try {
          const stored = JSON.parse(localStorage.getItem("announcementsReadIds") || "[]") as unknown;
          if (Array.isArray(stored)) readIds = stored.filter((value): value is string => typeof value === "string");
        } catch (error) {
          console.error("Status baca pengumuman tidak dapat dibaca.", error);
        }
        const unread = snapshot.docs.filter((announcement) => !readIds.includes(announcement.id)).length;
        if (!active) return true;
        setUnreadAnnouncements(unread);
        setAnnouncementLabel(unread ? `Announcements, ${unread} unread` : "Announcements");
        return true;
      } catch (error) {
        console.error("Badge pengumuman gagal dimuat.", error);
        return true;
      }
    };

    let attempts = 0;
    const pollForFirebase = () => {
      window.announcementBadgeCheck = window.setInterval(() => {
        attempts += 1;
        void updateBadge().then((ready) => {
          if (!ready && attempts < 120) return;
          if (window.announcementBadgeCheck !== undefined) {
            window.clearInterval(window.announcementBadgeCheck);
            window.announcementBadgeCheck = undefined;
          }
          if (!ready) console.error("Badge pengumuman tidak dapat tersambung ke Firebase.");
        });
      }, 250);
    };
    void updateBadge().then((connected) => {
      if (!connected && active && !window.announcementBadgeCheck) pollForFirebase();
    });
    return () => {
      active = false;
      if (window.announcementBadgeCheck !== undefined) {
        window.clearInterval(window.announcementBadgeCheck);
        window.announcementBadgeCheck = undefined;
      }
    };
  }, []);

  const selectManga = (title: string) => {
    setSearchOpen(false);
    setSearchExpanded(false);
    setSearch("");
    navigateToManga(title);
  };

  const openMobileSearch = () => {
    setSearchExpanded(true);
    setBookmarksOpen(false);
    setAuthOpen(false);
    requestAnimationFrame(() => {
      document.getElementById("searchManga")?.focus();
    });
  };

  const closeMobileSearch = () => {
    setSearchExpanded(false);
    setSearchOpen(false);
    setSearch("");
  };

  const toggleAuth = () => {
    const current = getCurrentUser();
    setUser(current);
    setDisplayName(getDisplayName(current));
    setAuthOpen((open) => !open);
  };

  const handleProfile = () => {
    if (user) window.showUserProfile?.(user.uid);
    closeAuth();
  };

  const handleNotifications = () => {
    closeAuth();
    if (typeof window.showReplyNotifications === "function") {
      window.showReplyNotifications();
      return;
    }
    window.loadUserNotifications?.();
    const overlay = document.getElementById("reply-notif-overlay");
    if (!overlay) return;
    const list = document.getElementById("reply-notif-list");
    if (list && !list.innerHTML.trim()) {
      list.innerHTML = '<p style="text-align:center;color:#ccc;">Tidak ada notifikasi</p>';
    }
    overlay.style.display = "flex";
  };

  const handleMessages = () => {
    closeAuth();
    const button = document.getElementById("dm-btn");
    if (button) {
      button.click();
      return;
    }
    const modal = document.getElementById("dm-modal");
    if (modal) modal.style.display = "flex";
    window.loadDmInbox?.();
  };

  const handleLogout = () => {
    closeAuth();
    setUser(null);
    setDisplayName("User");

    type CompatAuth = {
      signOut: () => Promise<void>;
      currentUser: HeaderUser | null;
    };
    const auth = window.firebase?.auth?.() as CompatAuth | undefined;
    if (!auth || typeof auth.signOut !== "function") {
      console.error("Firebase Auth is not available for logout.");
      try {
        Object.keys(localStorage)
          .filter((key) => /firebase:authUser/.test(key))
          .forEach((key) => localStorage.removeItem(key));
      } catch { /* ignore */ }
      return;
    }

    void auth.signOut()
      .then(() => {
        setUser(null);
        setDisplayName("User");
      })
      .catch((error: unknown) => {
        console.error("Logout failed.", error);
      });
  };

  const classButton =
    "flex h-9 min-h-9 w-9 min-w-9 shrink-0 items-center justify-center rounded-md border-0 bg-transparent p-0 text-zinc-800 transition hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mikoroku-accent)] dark:text-white dark:hover:bg-white/10";
  const mainHeaderClass = [
    "fixed inset-x-0 top-0 z-[9999] flex h-14 items-center justify-between border-b border-zinc-200 bg-white/90 px-2 py-2 text-zinc-900 shadow-sm backdrop-blur-sm transition-transform duration-300 sm:px-5 dark:border-zinc-700 dark:bg-zinc-950/90 dark:text-white",
    !mobile && sidebarOpen ? "min-[769px]:!pl-[calc(var(--sidebar-width)+1.25rem)]" : "",
    headerHidden ? "-translate-y-full" : "translate-y-0",
  ].join(" ");

  return (
    <>
      <header id="mainHeader" className={mainHeaderClass}>
        <div
          className={`flex shrink-0 items-center gap-1 ${
            mobile && searchExpanded ? "hidden" : ""
          }`}
        >
          <button
            id="sidebarToggle"
            type="button"
            aria-label="Menu"
            aria-expanded={sidebarOpen}
            onClick={toggleSidebar}
            className={`${classButton} ${!mobile && sidebarOpen ? "min-[769px]:hidden" : ""}`}
          >
            <span className="sr-only">Menu</span>
            <svg className="h-7 w-7 overflow-visible" viewBox="0 0 64 64" fill="currentColor" aria-hidden="true">
              <path className={`origin-center transition-transform duration-300 ${sidebarOpen ? "-translate-y-[7px]" : ""}`} d="M8 22c0-9 10-14 24-14s24 5 24 14H8z" />
              <g className={`origin-center transition-transform duration-300 ${sidebarOpen ? "-translate-y-[7px]" : ""}`} fill="white" fillOpacity=".85">
                <circle cx="20" cy="13" r="1.6" /><circle cx="28" cy="11" r="1.6" /><circle cx="36" cy="12" r="1.6" />
                <circle cx="44" cy="14" r="1.6" /><circle cx="24" cy="17" r="1.4" /><circle cx="40" cy="16" r="1.4" />
              </g>
              <rect className="origin-center transition-transform duration-300" x="10" y="28" width="44" height="8" rx="3" />
              <path className={`origin-center transition-transform duration-300 ${sidebarOpen ? "translate-y-[7px]" : ""}`} d="M8 42h48c0 6-10 10-24 10S8 48 8 42z" />
            </svg>
          </button>
          <a
            id="headerLogo"
            href="/"
            aria-label="Mikoroku home"
            className={`${!mobile && sidebarOpen ? "min-[769px]:hidden" : ""} flex h-9 max-w-[120px] shrink-0 items-center sm:h-10 sm:max-w-none`}
          >
            <img src={LOGO_URL} alt="Mikoroku" className="h-full w-auto max-w-full object-contain" />
          </a>
        </div>

        <div
          className={
            mobile
              ? searchExpanded
                ? "mx-1 min-w-0 flex-1"
                : "hidden"
              : "mx-2 min-w-0 flex-1 sm:mx-[15px] sm:max-w-[600px]"
          }
          ref={searchArea}
        >
          <div className="relative flex min-h-10 w-full items-center gap-1">
            {mobile && searchExpanded && (
              <button
                type="button"
                aria-label="Tutup pencarian"
                onClick={closeMobileSearch}
                className={classButton}
              >
                <Icon name="close" className="h-5 w-5" />
              </button>
            )}
            <input
              type="search"
              id="searchManga"
              placeholder="Search manga..."
              autoComplete="off"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setSearchOpen(Boolean(event.target.value.trim()));
              }}
              onFocus={() => setSearchOpen(Boolean(search.trim()))}
              className="h-[34px] min-w-0 w-full appearance-none rounded-3xl border border-zinc-300 bg-zinc-100 px-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-500 focus:border-[var(--mikoroku-accent)] sm:h-[30px] sm:px-4 dark:border-zinc-600 dark:bg-black/35 dark:text-white dark:placeholder:text-zinc-400"
            />
            {searchOpen && search.trim() && (
              <div
                id="searchResults"
                className="absolute left-0 top-full z-[10000] max-h-[min(60vh,320px)] w-full min-w-[min(100vw-1rem,320px)] overflow-y-auto rounded-xl border border-black/10 bg-white/95 shadow-xl backdrop-blur-lg dark:border-white/10 dark:bg-zinc-950/90"
              >
                {!Object.keys(window.mangaData || {}).length ? (
                  <div className="px-3 py-3 text-sm text-zinc-500">Data sedang dimuat...</div>
                ) : mangaSearchResults.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-zinc-500">Tidak ditemukan</div>
                ) : mangaSearchResults.map((manga) => (
                  <button
                    type="button"
                    key={`${manga.title}-${manga.slug || ""}`}
                    onClick={() => selectManga(manga.title)}
                    className="flex w-full cursor-pointer items-center gap-3 px-3.5 py-2.5 text-left transition hover:bg-black/5 dark:hover:bg-white/[0.08]"
                  >
                    <img
                      src={previewCover(manga.cover || manga.img)}
                      alt=""
                      loading="lazy"
                      onError={(event) => { event.currentTarget.src = DEFAULT_THUMB; }}
                      className="h-[60px] w-[42px] shrink-0 rounded-md object-cover"
                    />
                    <span className="flex min-w-0 flex-col">
                      <span className="text-xs font-semibold leading-snug text-zinc-900 dark:text-white">{manga.title}</span>
                      {manga.firestore && <small className="text-indigo-600">Firestore</small>}
                      {manga.github && <small className="text-emerald-600">GitHub</small>}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div
          className={`relative flex h-10 shrink-0 items-center justify-end gap-0 sm:gap-2 ${
            mobile && searchExpanded ? "hidden" : ""
          }`}
        >
          {mobile && (
            <button
              type="button"
              id="mobileSearchToggle"
              aria-label="Cari manga"
              title="Search"
              onClick={openMobileSearch}
              className={classButton}
            >
              <Icon name="search" />
            </button>
          )}
          <a
            id="announcementLink"
            className={`${classButton} relative no-underline`}
            href="/announcements"
            aria-label={announcementLabel}
            title="Announcements"
          >
            <span className="sr-only">Announcements</span>
            <Icon name="megaphone" />
            {unreadAnnouncements > 0 && (
              <span className="absolute right-0 top-0 min-w-4 rounded-full border-2 border-white bg-red-600 px-1 text-center text-[9px] font-bold leading-3 text-white dark:border-zinc-950" aria-label={`${unreadAnnouncements} unread announcements`}>
                {unreadAnnouncements > 99 ? "99+" : unreadAnnouncements}
              </span>
            )}
          </a>
          <button
            id="darkModeToggle"
            type="button"
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            title={dark ? "Light mode" : "Dark mode"}
            onClick={() => {
              const next = !document.documentElement.classList.contains("dark");
              localStorage.setItem("darkMode", String(next));
              applyTheme(next);
            }}
            className={classButton}
          >
            {dark ? (
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : <Icon name="sun" />}
          </button>

          <div className="relative" ref={bookmarkArea}>
            <button
              id="headerBookmarkBtn"
              type="button"
              aria-label="Bookmark"
              aria-expanded={bookmarksOpen}
              onClick={() => {
                setBookmarks(readBookmarks());
                setHasBookmarks(updateBookmarkIcon());
                setBookmarksOpen((open) => !open);
              }}
              className={classButton}
            >
              <svg id="headerBookmarkIcon" className="h-6 w-6" viewBox="0 0 24 24" fill={hasBookmarks ? "#ffcc00" : "none"} stroke={hasBookmarks ? (dark ? "#ffffff" : "#111827") : "currentColor"} strokeWidth="2" aria-hidden="true">
                <path d="M6 4h12v18l-6-4-6 4V4z" />
              </svg>
            </button>
            {bookmarksOpen && (
              <div
                id="bookmarkContent"
                className="absolute right-0 top-full z-[10000] mt-2 max-h-[min(70vh,480px)] w-[min(calc(100vw-1rem),280px)] min-w-[200px] overflow-y-auto rounded-lg border border-black/[0.06] bg-white/95 py-1.5 shadow-lg backdrop-blur-xl dark:border-white/[0.08] dark:bg-black/90"
              >
                {bookmarks.length === 0 ? (
                  <div className="px-4 py-3 text-center text-[13px] text-zinc-600 dark:text-zinc-300">You have no bookmarks yet!</div>
                ) : bookmarks.map((bookmark) => {
                  const key = normalizeTitle(bookmark.title);
                  const image = bookmark.img || getMangaEntry(window.mangaData?.[key])?.img ||
                    getMangaEntry(window.mangaData?.[key])?.cover;
                  return (
                    <button
                      type="button"
                      key={`${bookmark.title}-${bookmark.slug || ""}`}
                      onClick={() => navigateToManga(bookmark.title)}
                      className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left transition hover:bg-black/5 dark:hover:bg-white/[0.08]"
                    >
                      <img
                        src={previewCover(image)}
                        alt=""
                        loading="lazy"
                        onError={(event) => { event.currentTarget.src = DEFAULT_THUMB; }}
                        className="h-[52px] w-[38px] shrink-0 rounded-md object-cover"
                      />
                      <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[13px] leading-snug">{bookmark.title}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="relative" ref={authArea}>
            <button
              id="headerAuthBtn"
              type="button"
              aria-label={user ? `Account (${displayName})` : "Account"}
              aria-expanded={authOpen}
              title="Account"
              onClick={toggleAuth}
              className={classButton}
            >
              {user ? (
                <img
                  src={avatar}
                  alt=""
                  onError={(event) => { event.currentTarget.src = DEFAULT_AVATAR; }}
                  className="h-7 w-7 rounded-full border border-black/20 object-cover dark:border-white/20"
                />
              ) : <Icon name="user" />}
            </button>
            {authOpen && (
              <div
                id="authDropdown"
                className="absolute right-0 top-full z-[10000] mt-2 max-h-[min(80vh,600px)] min-w-[220px] overflow-y-auto rounded-lg border border-zinc-200 bg-white text-zinc-900 shadow-xl dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                {user ? (
                  <>
                    <div className="border-b border-black/10 px-4 py-3 text-left dark:border-white/10">
                      <div className="text-[15px] font-bold">{displayName}</div>
                      <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{user.email || ""}</div>
                    </div>
                    <button type="button" onClick={handleProfile} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition hover:bg-black/5 dark:hover:bg-white/10"><Icon name="user" className="h-[18px] w-[18px]" />Profil</button>
                    <button type="button" onClick={handleNotifications} className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm transition hover:bg-black/5 dark:hover:bg-white/10"><Icon name="bell" className="h-[18px] w-[18px]" />Notifications</button>
                    <button type="button" onClick={handleMessages} className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm transition hover:bg-black/5 dark:hover:bg-white/10"><Icon name="message" className="h-[18px] w-[18px]" />Direct Messages</button>
                    <a href="/settings" onClick={closeAuth} className="flex items-center gap-2 px-3.5 py-2.5 text-sm text-inherit no-underline transition hover:bg-black/5 dark:hover:bg-white/10"><Icon name="settings" className="h-[18px] w-[18px]" />Settings</a>
                    <hr className="my-1 border-0 border-t border-black/[0.08] dark:border-white/10" />
                    <button type="button" onClick={handleLogout} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-red-600 transition hover:bg-red-500/10"><Icon name="logout" className="h-[18px] w-[18px]" />Logout</button>
                  </>
                ) : (
                  <div className="p-4">
                    <p className="mb-3 text-center text-sm font-semibold text-zinc-900 dark:text-zinc-100">Login with</p>
                    <div className="flex flex-col gap-2">
                      {(
                        [
                          {
                            provider: "email",
                            label: "Email",
                            style: "bg-indigo-600 text-white hover:bg-indigo-500",
                            icon: (
                              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" aria-hidden="true">
                                <rect x="3" y="5" width="18" height="14" rx="2" />
                                <path d="m3 7 9 6 9-6" />
                              </svg>
                            ),
                          },
                          {
                            provider: "google",
                            label: "Google",
                            style: "border border-zinc-300 bg-zinc-50 text-zinc-900 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700",
                            icon: (
                              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                                <path fill="#EA4335" d="M12 10.2v3.6h5.1c-.2 1.2-.9 2.3-1.9 3l3.1 2.4c1.8-1.7 2.9-4.1 2.9-7 0-.7-.1-1.3-.2-1.9H12z" />
                                <path fill="#34A853" d="M6.6 14.3 5.7 15l-2.1 1.6C5.1 19.3 8.3 21.2 12 21.2c2.4 0 4.4-.8 5.9-2.1l-3.1-2.4c-.8.6-1.9.9-2.8.9-2.2 0-4-1.5-4.7-3.5z" />
                                <path fill="#4A90E2" d="M3.6 7.4C2.9 8.8 2.5 10.3 2.5 12s.4 3.2 1.1 4.6l3-2.3c-.2-.6-.3-1.2-.3-1.9s.1-1.3.3-1.9l-3-2.1z" />
                                <path fill="#FBBC05" d="M12 5.4c1.3 0 2.5.5 3.4 1.3l2.5-2.5C16.4 2.7 14.4 1.8 12 1.8 8.3 1.8 5.1 3.7 3.6 6.8l3 2.3C7.9 6.9 9.8 5.4 12 5.4z" />
                              </svg>
                            ),
                          },
                          {
                            provider: "github",
                            label: "GitHub",
                            style: "bg-zinc-800 text-white hover:bg-zinc-700",
                            icon: (
                              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true">
                                <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.78.62-3.37-1.37-3.37-1.37-.46-1.2-1.12-1.52-1.12-1.52-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.9 1.58 2.36 1.12 2.94.86.09-.67.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.28 2.75 1.05A9.3 9.3 0 0 1 12 6.8c.85 0 1.71.12 2.51.35 1.91-1.33 2.75-1.05 2.75-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.95.68 1.92 0 1.38-.01 2.5-.01 2.84 0 .26.18.59.69.48A10.03 10.03 0 0 0 22 12.26C22 6.58 17.52 2 12 2z" />
                              </svg>
                            ),
                          },
                          {
                            provider: "facebook",
                            label: "Facebook",
                            style: "bg-blue-600 text-white hover:bg-blue-500",
                            icon: (
                              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true">
                                <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14C17.17 2.09 16.02 2 14.79 2 12.24 2 10.5 3.66 10.5 6.7V9.5H8v4h2.5V22h3.5v-8.5z" />
                              </svg>
                            ),
                          },
                          {
                            provider: "twitter",
                            label: "X (Twitter)",
                            style: "bg-black text-white hover:bg-zinc-900",
                            icon: (
                              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
                              </svg>
                            ),
                          },
                        ] as const
                      ).map(({ provider, label, style, icon }) => (
                        <button
                          key={provider}
                          type="button"
                          title={label}
                          aria-label={`Login with ${label}`}
                          onClick={() => {
                            closeAuth();
                            void window.triggerLogin?.(provider).catch((error: unknown) => {
                              console.error(`Login ${provider} gagal.`, error);
                            });
                          }}
                          className={`flex w-full items-center justify-center rounded-lg px-3 py-2.5 transition ${style}`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <SiteSidebar
        open={sidebarOpen}
        mobile={mobile}
        canAccessAdminPanels={canAccessAdminPanels}
        logoUrl={LOGO_URL}
        onClose={closeSidebar}
      />
    </>
  );
}

function applyTheme(isDark: boolean): void {
  [document.documentElement, document.body].forEach((root) => {
    root.classList.toggle("dark", isDark);
    root.classList.toggle("light", !isDark);
  });
  document.documentElement.style.setProperty("--mk-page-bg", isDark ? "#0b0b0b" : "#f8f9fa");
  document.documentElement.style.setProperty("--mk-route-text", isDark ? "#ffffff" : "#1e293b");
  document.documentElement.style.setProperty("--mk-bookmark-container", isDark ? "#0f0f1e" : "#ffffff");
  document.documentElement.style.setProperty("--mk-bookmark-text", isDark ? "#ffffff" : "#111827");
  document.documentElement.style.setProperty("--mk-commission-card-bg", isDark ? "#171725" : "#ffffff");
  document.documentElement.style.setProperty("--mk-commission-card-text", isDark ? "#e2e8f0" : "#1e293b");
  document.documentElement.style.setProperty("--mk-footer-bg", "transparent");
  document.documentElement.style.setProperty("--mk-footer-card-bg", isDark ? "rgba(15,15,25,0.32)" : "rgba(255,255,255,0.28)");
  document.documentElement.style.setProperty("--mk-footer-card-border", isDark ? "rgba(255,255,255,.1)" : "rgba(15,23,42,.12)");
  document.documentElement.style.setProperty("--mk-footer-card-text", isDark ? "#d4d4d8" : "#334155");
  document.documentElement.style.setProperty("--mk-footer-link", isDark ? "#ff5757" : "#be123c");
  document.documentElement.style.backgroundColor = isDark ? "#0b0b0b" : "#f8f9fa";
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
}

function readBookmarks(): HeaderBookmark[] {
  try {
    const items = JSON.parse(localStorage.getItem("mangaBookmarks") || "[]") as unknown[];
    const unique = new Map<string, HeaderBookmark>();
    items.forEach((item) => {
      const bookmark = typeof item === "string"
        ? { title: item }
        : item && typeof item === "object"
          ? item as HeaderBookmark
          : null;
      if (bookmark?.title?.trim() && !unique.has(bookmark.title.trim().toLowerCase())) {
        unique.set(bookmark.title.trim().toLowerCase(), bookmark);
      }
    });
    return [...unique.values()].sort(
      (left, right) => (right.updatedAt || right.addedAt || 0) - (left.updatedAt || left.addedAt || 0),
    );
  } catch (error) {
    console.warn("Daftar bookmark lokal tidak valid dan akan diabaikan.", error);
    return [];
  }
}

export default function SiteHeader() {
  const closeAuth = useCallback(() => {}, []);
  return (
    <>
      <HeaderContents />
    </>
  );
}
