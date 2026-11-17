"use client";

import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import "./stats-animations.css";
import {
  getLocalReadMarksCount,
  getLocalBookmarkCount,
  getLocalChapterTotal,
  getLocalChapterTotalStorageKey,
  getLocalReadingProgressStorageKey,
  hasFreshLocalBookmarks,
  loadPublicReadingStats,
  mergeLocalReadingProgress,
  mergeLocalReadingActivity,
  preserveLifetimeChapterCount,
  setLocalChapterTotal,
  setLocalReadingActivityBaseline,
  getLocalReadingActivityStorageKey,
  COMMENT_HISTORY_LIMIT,
  type CommentHistoryItem,
  type PublicReadingStats,
  type ReadingProgressItem,
} from "../../lib/reading-stats";
import {
  mergeReadingProgressFromHistory,
  readReadingHistory,
} from "../../lib/reading-history";
import {
  cacheFollowingUids,
  getCachedFollowingUids,
  loadFollowingUids,
  setUserFollowing,
} from "../../lib/user-following";
import {
  cacheUserStatsProfile,
  getCachedUserStatsProfile,
  USER_STATS_PROFILE_UPDATED_EVENT,
  type UserStatsProfileUpdatedDetail,
} from "../../lib/user-stats-cache";
import {
  getPendingProfileBanner,
  PROFILE_BANNER_SYNCED_EVENT,
  queueProfileBanner,
} from "../../lib/profile-banner-sync";
import {
  getCachedReadingStats,
  READING_STATS_CACHE_TTL_MS,
  setCachedReadingStats,
  getUnlockedMedals,
  setUnlockedMedals,
  getUnlockedCommentMedals,
  setUnlockedCommentMedals,
} from "../lib/reading-stats-cache";
import SiteChrome from "../site-chrome";
import { CoverImage } from "../lib/cover-image";
import { isNsfwManga } from "../lib/nsfw";

type MedalSymbol = "spark" | "book" | "flame" | "crown" | "laurel" | "comet" | "gem" | "infinity";

/* ------------------------------------------------------------------ */
/*  3D Card Shift (inspired by CodePen "Card Shift: 3D-ish")          */
/* ------------------------------------------------------------------ */
type MedalAchievementData = {
  name: string;
  description: string;
  color: string;
  darkColor: string;
  gradient: string;
  symbol: MedalSymbol;
  unlockMessage: string;
};

type ReadingMedalData = MedalAchievementData & { chapters: number };
type CommentMedalData = MedalAchievementData & { comments: number };

function MedalCard({
  medal,
  count,
  countLabel,
  unlocked,
  imageSrc,
  onOpen,
}: {
  medal: MedalAchievementData;
  count: number;
  countLabel: "chapters" | "comments";
  unlocked: boolean;
  imageSrc: string;
  onOpen?: () => void;
}) {
  const cardRef = useRef<HTMLElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });
  const [active, setActive] = useState(false);

  const handleMove = (e: MouseEvent<HTMLElement>) => {
    if (!unlocked || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    // "Tidur" pose: stronger rotateX so card lays further back
    setTilt({
      rx: 54 + (0.5 - py) * 8,
      ry: (px - 0.5) * 12,
    });
    setGlare({ x: px * 100, y: py * 100, opacity: 0.7 });
    setActive(true);
  };

  const handleLeave = () => {
    setTilt({ rx: 0, ry: 0 });
    setGlare((g) => ({ ...g, opacity: 0 }));
    setActive(false);
  };

  return (
    <div
      className="relative aspect-[3/4] min-w-0 sm:aspect-[3/4]"
      style={{ perspective: "1100px" }}
    >
      {/* Floating medal image – leaves the card on hover (like Pikachu) */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-center"
        style={{
          height: "68%",
          transform: unlocked && active
            ? "translateY(-12%) scale(1.16)"
            : "translateY(0) scale(1)",
          transition: "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)",
          filter: unlocked
            ? `drop-shadow(0 10px 22px ${medal.color}aa) drop-shadow(0 0 14px ${medal.color}66)`
            : undefined,
        }}
      >
        <img
          src={imageSrc}
          alt=""
          draggable={false}
          className={`size-[3.4rem] object-contain sm:size-[5.5rem] lg:size-[6rem] ${
            unlocked ? "" : "grayscale opacity-45 dark:opacity-35"
          }`}
        />
      </div>

      {/* The actual card plane that tilts underneath */}
      <article
        ref={cardRef}
        role={unlocked ? "button" : undefined}
        tabIndex={unlocked ? 0 : undefined}
        onClick={() => unlocked && onOpen?.()}
        onKeyDown={(e) => {
          if (!unlocked) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen?.();
          }
        }}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        className={`relative flex h-full w-full flex-col items-center justify-end overflow-hidden rounded-2xl border text-center ${
          unlocked
            ? "cursor-pointer border-black/8 bg-white/70 dark:border-white/12 dark:bg-white/[0.04]"
            : "border-black/10 bg-slate-100/90 dark:border-white/5 dark:bg-black/25"
        } reading-medal-card ${unlocked ? "is-unlocked" : ""}`}
        style={{
          ["--medal-light-text" as string]: medal.color,
          ["--medal-dark-text" as string]: medal.darkColor,
          backgroundImage: unlocked
            ? `linear-gradient(165deg, color-mix(in srgb, ${medal.color} 18%, transparent) 0%, color-mix(in srgb, ${medal.color} 10%, transparent) 50%, color-mix(in srgb, ${medal.color} 5%, transparent) 100%)`
            : undefined,
          boxShadow: unlocked
            ? active
              ? `0 18px 36px -10px ${medal.color}77, 0 8px 18px rgba(0,0,0,0.28)`
              : `0 8px 22px -8px ${medal.color}55, 0 4px 12px rgba(0,0,0,0.18)`
            : "0 2px 8px rgba(0,0,0,0.06)",
          transform: unlocked
            ? `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`
            : undefined,
          transition: unlocked
            ? "transform 220ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 220ms ease"
            : undefined,
          transformStyle: "preserve-3d",
          transformOrigin: "center bottom",
        }}
        aria-label={`${medal.name}, ${count} ${countLabel}, ${unlocked ? "unlocked, click to view" : "locked"}`}
        title={unlocked ? "Click to view celebration" : undefined}
      >
        {/* Mirror / ghost of medal that stays on the card when image lifts */}
        {unlocked && (
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-center"
            style={{ height: "68%" }}
            aria-hidden
          >
            <img
              src={imageSrc}
              alt=""
              draggable={false}
              className="size-[3.4rem] object-contain sm:size-[5.5rem] lg:size-[6rem]"
              style={{
                filter: `grayscale(0.25) brightness(1.05) contrast(1.05) drop-shadow(0 0 12px ${medal.color}aa)`,
                opacity: active ? 0.48 : 0,
                transition: "opacity 280ms ease",
              }}
            />
          </div>
        )}

        {/* Chapter count top-left */}
        <span
          className={`absolute left-2 top-1.5 z-20 text-[8px] font-bold tracking-wider sm:left-2.5 sm:top-2 sm:text-[10px] ${
            unlocked ? "" : "text-slate-400 dark:text-white/30"
          } reading-medal-count`}
        >
          {count}
        </span>

        {/* Bottom labels */}
        <div className="relative z-10 w-full px-1.5 pb-2 pt-0.5 sm:px-2.5 sm:pb-3 sm:pt-1">
          <p
            className={`truncate text-[10px] font-bold leading-tight tracking-wide sm:text-[13px] ${
              unlocked ? "drop-shadow-sm" : "text-slate-500 dark:text-white/45"
            } reading-medal-label`}
          >
            {medal.name}
          </p>
          <p
            className={`mt-0.5 text-[7px] font-semibold uppercase tracking-[0.12em] sm:text-[10px] sm:tracking-[0.14em] ${
              unlocked ? "" : "text-slate-400 dark:text-white/30"
            } reading-medal-detail`}
          >
            {unlocked ? "Unlocked · view" : medal.description}
          </p>
        </div>

        {/* Bottom accent */}
        {unlocked && (
          <div
            className="absolute bottom-0 left-0 right-0 h-[2px]"
            style={{
              background: `linear-gradient(90deg, transparent 5%, ${medal.color} 50%, transparent 95%)`,
              opacity: active ? 1 : 0.5,
              transition: "opacity 200ms ease",
            }}
            aria-hidden
          />
        )}

        {/* Inner border */}
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{
            boxShadow: unlocked
              ? "inset 0 0 0 1px rgba(255,255,255,0.35)"
              : undefined,
          }}
          aria-hidden
        />
      </article>
    </div>
  );
}

type ProfileBannerUser = { uid: string } | null;
type ProfileBannerFirebase = {
  auth?: () => {
    currentUser: ProfileBannerUser;
    onAuthStateChanged: (callback: (user: ProfileBannerUser) => void) => () => void;
  };
  firestore?: () => {
    collection: (name: string) => {
      doc: (id: string) => {
        set: (data: Record<string, unknown>, options?: { merge?: boolean }) => Promise<void>;
      };
    };
  };
};
type ProfileBannerWindow = Window & {
  currentUser?: ProfileBannerUser;
  firebase?: ProfileBannerFirebase;
  openDmToUser?: (uid: string, name?: string, avatar?: string) => void;
  openMikorokuDmToUser?: (uid: string, name?: string, avatar?: string) => void;
};

const IMGBB_API_KEY = "751e8d146b32b8a00499aef04f568e30";

const readingMedals: Array<{
  chapters: number;
  name: string;
  description: string;
  color: string;
  darkColor: string;
  gradient: string;
  symbol: MedalSymbol;
  unlockMessage: string;
}> = [
  {
    chapters: 10,
    name: "First Spark",
    description: "Started the reading journey",
    color: "#b7791f",
    darkColor: "#fcd34d",
    gradient: "linear-gradient(135deg, #fef3c7 0%, #fde68a 40%, #f59e0b 100%)",
    symbol: "spark",
    unlockMessage: "The journey begins. Keep turning those pages!",
  },
  {
    chapters: 25,
    name: "Page Scout",
    description: "Explored the first stories",
    color: "#64748b",
    darkColor: "#cbd5e1",
    gradient: "linear-gradient(135deg, #e2e8f0 0%, #94a3b8 45%, #64748b 100%)",
    symbol: "book",
    unlockMessage: "You're officially exploring the library.",
  },
  {
    chapters: 50,
    name: "Story Seeker",
    description: "Kept turning the pages",
    color: "#c2410c",
    darkColor: "#fdba74",
    gradient: "linear-gradient(135deg, #ffedd5 0%, #fdba74 40%, #ea580c 100%)",
    symbol: "flame",
    unlockMessage: "Stories are calling. You're answering.",
  },
  {
    chapters: 100,
    name: "Chapter Champion",
    description: "Reached a century of chapters",
    color: "#7c3aed",
    darkColor: "#c4b5fd",
    gradient: "linear-gradient(135deg, #ede9fe 0%, #a78bfa 40%, #7c3aed 100%)",
    symbol: "crown",
    unlockMessage: "100 chapters! True champion energy.",
  },
  {
    chapters: 250,
    name: "Lore Keeper",
    description: "Collected stories across series",
    color: "#16a34a",
    darkColor: "#86efac",
    gradient: "linear-gradient(135deg, #dcfce7 0%, #86efac 40%, #16a34a 100%)",
    symbol: "laurel",
    unlockMessage: "Lore is safe with you. Keep collecting.",
  },
  {
    chapters: 500,
    name: "Story Sage",
    description: "A seasoned reader",
    color: "#c026d3",
    darkColor: "#f0abfc",
    gradient: "linear-gradient(135deg, #fae8ff 0%, #e879f9 35%, #c026d3 70%, #86198f 100%)",
    symbol: "comet",
    unlockMessage: "Seasoned. Wise. Still hungry for more.",
  },
  {
    chapters: 1000,
    name: "Eternal Reader",
    description: "Master of a thousand chapters",
    color: "#d97706",
    darkColor: "#fcd34d",
    gradient: "linear-gradient(135deg, #fef3c7 0%, #fbbf24 30%, #f59e0b 55%, #ea580c 80%, #c2410c 100%)",
    symbol: "gem",
    unlockMessage: "A thousand chapters. You are legend.",
  },
  {
    chapters: 1500,
    name: "Infinity Archive",
    description: "Beyond the final page",
    color: "#06b6d4",
    darkColor: "#67e8f9",
    gradient: "linear-gradient(135deg, #a5f3fc 0%, #22d3ee 20%, #a78bfa 45%, #f472b6 70%, #fbbf24 100%)",
    symbol: "infinity",
    unlockMessage: "1500 chapters. The archive has no end — and neither do you.",
  },
];

const medalImageMap: Record<MedalSymbol, string> = {
  spark: "/assets/medals/1.webp",
  book: "/assets/medals/2.webp",
  flame: "/assets/medals/3.webp",
  crown: "/assets/medals/4.webp",
  laurel: "/assets/medals/5.webp",
  comet: "/assets/medals/6.webp",
  gem: "/assets/medals/7.webp",
  infinity: "/assets/medals/8.webp",
};

const commentMedals: CommentMedalData[] = [
  { comments: 10, name: "First Voice", description: "Started joining the conversation", color: "#b7791f", darkColor: "#fcd34d", gradient: "linear-gradient(135deg, #fef3c7 0%, #fde68a 40%, #f59e0b 100%)", symbol: "spark", unlockMessage: "Your voice is part of the community now." },
  { comments: 25, name: "Conversation Starter", description: "Shared your thoughts", color: "#64748b", darkColor: "#cbd5e1", gradient: "linear-gradient(135deg, #e2e8f0 0%, #94a3b8 45%, #64748b 100%)", symbol: "book", unlockMessage: "You always have something worth saying." },
  { comments: 50, name: "Regular Voice", description: "Became a familiar face", color: "#c2410c", darkColor: "#fdba74", gradient: "linear-gradient(135deg, #ffedd5 0%, #fdba74 40%, #ea580c 100%)", symbol: "flame", unlockMessage: "The discussions are better with you in them." },
  { comments: 100, name: "Discussion Champion", description: "Reached 100 comments", color: "#7c3aed", darkColor: "#c4b5fd", gradient: "linear-gradient(135deg, #ede9fe 0%, #a78bfa 40%, #7c3aed 100%)", symbol: "crown", unlockMessage: "A hundred contributions. What a champion." },
  { comments: 250, name: "Community Voice", description: "Helped bring the community together", color: "#16a34a", darkColor: "#86efac", gradient: "linear-gradient(135deg, #dcfce7 0%, #86efac 40%, #16a34a 100%)", symbol: "laurel", unlockMessage: "Your words have become part of the community." },
  { comments: 500, name: "Comment Sage", description: "A seasoned conversation keeper", color: "#c026d3", darkColor: "#f0abfc", gradient: "linear-gradient(135deg, #fae8ff 0%, #e879f9 35%, #c026d3 70%, #86198f 100%)", symbol: "comet", unlockMessage: "Five hundred comments of wisdom and fun." },
  { comments: 1000, name: "Community Legend", description: "A thousand contributions", color: "#d97706", darkColor: "#fcd34d", gradient: "linear-gradient(135deg, #fef3c7 0%, #fbbf24 30%, #f59e0b 55%, #ea580c 80%, #c2410c 100%)", symbol: "gem", unlockMessage: "Your presence has left a lasting mark." },
  { comments: 1500, name: "Infinite Conversationalist", description: "Never out of things to say", color: "#06b6d4", darkColor: "#67e8f9", gradient: "linear-gradient(135deg, #a5f3fc 0%, #22d3ee 20%, #a78bfa 45%, #f472b6 70%, #fbbf24 100%)", symbol: "infinity", unlockMessage: "The conversation goes on, and so do you." },
];

const commentMedalImageMap: Record<MedalSymbol, string> = {
  spark: "/assets/comment-medals/1.webp",
  book: "/assets/comment-medals/2.webp",
  flame: "/assets/comment-medals/3.webp",
  crown: "/assets/comment-medals/4.webp",
  laurel: "/assets/comment-medals/5.webp",
  comet: "/assets/comment-medals/6.webp",
  gem: "/assets/comment-medals/7.webp",
  infinity: "/assets/comment-medals/8.webp",
};

const statsSectionSettings = [
  {
    id: "stat-cards",
    label: "Overview cards",
    description: "Series, chapters, bookmarks, progress, activity, manga, novels, and sources.",
  },
  {
    id: "medals",
    label: "Reading medals",
    description: "Milestones and unlocked medals.",
  },
  {
    id: "comment-medals",
    label: "Comment medals",
    description: "Comment milestones and earned medals.",
  },
  {
    id: "reading-charts",
    label: "Reading charts",
    description: "Series mix and reading progress charts.",
  },
  {
    id: "reading-activity",
    label: "Reading activity",
    description: "Chapter activity for the last seven days.",
  },
  {
    id: "reading-progress",
    label: "Reading progress",
    description: "Recently saved manga and novel progress.",
  },
  {
    id: "comment-history",
    label: "Comment history",
    description: "Recent comments and links to their discussion threads.",
  },
] as const;

type StatsSectionId = (typeof statsSectionSettings)[number]["id"];

const statsSectionIds = new Set<string>(statsSectionSettings.map(({ id }) => id));

function getHiddenStatsSections(value: unknown): StatsSectionId[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(
    (section): section is StatsSectionId => typeof section === "string" && statsSectionIds.has(section),
  ))];
}

function getMedalBadgeId(prefix: "medal" | "comment-medal", name: string): string {
  return `${prefix}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

async function detectNewMedalUnlocks(totalChaptersRead: number) {
  const previously = new Set(await getUnlockedMedals());
  const newly = readingMedals.filter(
    (medal) => totalChaptersRead >= medal.chapters && !previously.has(medal.chapters),
  );
  if (newly.length > 0) {
    await setUnlockedMedals(
      readingMedals.filter((m) => totalChaptersRead >= m.chapters).map((m) => m.chapters),
    );
  }
  return newly;
}

async function detectNewCommentMedalUnlocks(commentCount: number) {
  const previously = new Set(await getUnlockedCommentMedals());
  const newly = commentMedals.filter(
    (medal) => commentCount >= medal.comments && !previously.has(medal.comments),
  );
  if (newly.length > 0) {
    await setUnlockedCommentMedals(
      commentMedals.filter((medal) => commentCount >= medal.comments).map((medal) => medal.comments),
    );
  }
  return newly;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function dateValue(value: unknown): Date | null {
  let timestamp: number;
  if (typeof value === "number") {
    timestamp = value;
  } else if (typeof value === "string") {
    timestamp = Date.parse(value);
  } else if (value && typeof value === "object") {
    const dateLike = value as { toDate?: () => Date; toMillis?: () => number; seconds?: number };
    if (typeof dateLike.toDate === "function") {
      const date = dateLike.toDate();
      return Number.isNaN(date.getTime()) ? null : date;
    }
    if (typeof dateLike.toMillis === "function") {
      timestamp = dateLike.toMillis();
    } else if (typeof dateLike.seconds === "number") {
      timestamp = dateLike.seconds * 1000;
    } else {
      return null;
    }
  } else {
    return null;
  }
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : date;
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
}

function formatCustomBadgeLabel(id: string): string {
  const knownLabels: Record<string, string> = {
    "ara-ara-collector": "Ara Ara Collector",
    "ara-ara-enjoyer": "Ara Ara Enjoyer",
    achaaan: "Nyaa~",
    "anime-ending-destroyed-me": "Ending Destroyed Me",
    "anime-ost-addict": "OST Addict",
    "brain-not-found": "404 Brain Not Found",
    "cute-girls-doing-things": "CGDCT Enjoyer",
    "egirl-hunter": "E-girl Hunter",
    "fourchan-refugee": "4chan Refugee",
    horny: "Team Horny",
    "isekai-truck-victim": "Truck-kun Victim",
    "last-online-3am": "Last Online 3AM",
    "light-novel-degen": "Light Novel Degenerate",
    milf: "Milf Lover",
    "npc-dialogue-skipper": "Dialogue Skipper",
    npc: "NPC",
    "ntr-enjoyer": "NTR Enjoyer",
    "onee-san-hunter": "Onee-san Hunter",
    "onii-chan-protector": "Onii-chan Protector",
    "paradox-simp": "Paradoxical Simp",
    "ratio-touch-grass": "Ratio + Touch Grass",
    "school-uniform-lover": "Uniform Aesthetic",
    "trash-taste": "Trash Taste Enjoyer",
    "two-d-only": "2D Only",
    "voice-actor-enjoyer": "Seiyuu Enjoyer",
    "vtuber-rabbit-hole": "VTuber Rabbit Hole",
    "wifi-warrior": "WiFi Warrior",
  };
  return knownLabels[id] || id.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function compressProfileBanner(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    createImageBitmap(file).then((bitmap) => {
      const targetWidth = 1600;
      const targetHeight = 500;
      const targetRatio = targetWidth / targetHeight;
      const sourceRatio = bitmap.width / bitmap.height;
      let sourceX = 0;
      let sourceY = 0;
      let sourceWidth = bitmap.width;
      let sourceHeight = bitmap.height;

      if (sourceRatio > targetRatio) {
        sourceWidth = bitmap.height * targetRatio;
        sourceX = (bitmap.width - sourceWidth) / 2;
      } else {
        sourceHeight = bitmap.width / targetRatio;
        sourceY = (bitmap.height - sourceHeight) / 2;
      }

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const context = canvas.getContext("2d");
      if (!context) {
        bitmap.close();
        reject(new Error("Browser image processing is unavailable."));
        return;
      }

      context.drawImage(
        bitmap,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        targetWidth,
        targetHeight,
      );
      bitmap.close();
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("The banner image could not be compressed."));
      }, "image/webp", 0.78);
    }).catch((error: unknown) => {
      reject(error instanceof Error ? error : new Error("The banner image could not be processed."));
    });
  });
}

function withTimeout<T>(promise: Promise<T>, milliseconds: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(message)), milliseconds);
    promise.then(
      (value) => {
        window.clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

async function uploadProfileBanner(
  file: File,
  onStageChange: (stage: string) => void,
): Promise<string> {
  const compressedImage = await withTimeout(
    compressProfileBanner(file),
    30000,
    "Banner image processing timed out. Try a smaller or different image.",
  );
  onStageChange("Uploading image...");
  const formData = new FormData();
  formData.append("image", compressedImage, "profile-banner.webp");
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 60000);
  try {
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
    const result: {
      success?: boolean;
      data?: { url?: string };
      error?: { message?: string };
    } = await response.json();
    if (!response.ok || !result.success || !result.data?.url) {
      throw new Error(result.error?.message || `Banner upload failed (${response.status}).`);
    }
    return result.data.url;
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error("Banner upload timed out after 60 seconds. Check your connection and try again.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

function formatUpdatedAt(timestamp: number): string {
  if (!timestamp) return "Recently read";
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(timestamp);
}

function formatCommentDate(timestamp: number): string {
  if (!timestamp) return "Date unavailable";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
}

function getActivityDayLabel(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function StatsCard({
  label,
  value,
  detail,
  icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: string;
  tone: "rose" | "amber" | "violet" | "blue" | "cyan" | "emerald" | "orange" | "pink";
}) {
  const toneClass = {
    rose: "from-rose-100 via-white to-orange-100 dark:from-rose-950/70 dark:via-[#15151d] dark:to-orange-950/45",
    amber: "from-amber-100 via-white to-yellow-100 dark:from-amber-950/65 dark:via-[#15151d] dark:to-yellow-950/40",
    violet: "from-violet-100 via-white to-fuchsia-100 dark:from-violet-950/65 dark:via-[#15151d] dark:to-fuchsia-950/40",
    blue: "from-blue-100 via-white to-indigo-100 dark:from-blue-950/65 dark:via-[#15151d] dark:to-indigo-950/40",
    cyan: "from-cyan-100 via-white to-sky-100 dark:from-cyan-950/65 dark:via-[#15151d] dark:to-sky-950/40",
    emerald: "from-emerald-100 via-white to-teal-100 dark:from-emerald-950/65 dark:via-[#15151d] dark:to-teal-950/40",
    orange: "from-orange-100 via-white to-amber-100 dark:from-orange-950/65 dark:via-[#15151d] dark:to-amber-950/40",
    pink: "from-pink-100 via-white to-purple-100 dark:from-pink-950/65 dark:via-[#15151d] dark:to-purple-950/40",
  }[tone];

  return (
    <article className={`flex min-h-[108px] flex-col justify-between rounded-2xl border border-black/10 bg-gradient-to-br ${toneClass} p-2.5 shadow-lg shadow-slate-900/5 backdrop-blur-sm dark:border-white/10 dark:shadow-black/10 sm:min-h-[112px] sm:p-4`}>
      <div className="flex min-w-0 items-center justify-between gap-2">
        <p className="line-clamp-2 min-w-0 text-[10px] font-bold leading-4 text-slate-600 dark:text-zinc-400 sm:text-[11px]">{label}</p>
        <span aria-hidden="true" className="hidden size-8 shrink-0 place-items-center rounded-lg bg-[var(--mikoroku-accent-soft)] text-sm text-[var(--mikoroku-accent)] sm:grid">
          {icon}
        </span>
      </div>
      <p className="mt-1 text-xl font-bold leading-none text-slate-900 dark:text-white sm:text-2xl">{value}</p>
      <p className="mt-1.5 line-clamp-2 min-h-7 text-[10px] leading-3.5 text-slate-600 dark:text-zinc-400 sm:mt-2 sm:text-xs sm:leading-4">{detail}</p>
    </article>
  );
}

function MedalUnlockModal({
  medal,
  count,
  countLabel,
  imageSrc,
  onClose,
}: {
  medal: MedalAchievementData;
  count: number;
  countLabel: "chapters" | "comments";
  imageSrc: string;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    dialogRef.current?.focus();
    const t = window.setTimeout(() => setEntered(true), 20);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="medal-unlock-title"
      style={{
        ["--stats-medal-color" as string]: medal.color,
        ["--medal-light-text" as string]: medal.color,
        ["--medal-dark-text" as string]: medal.darkColor,
      }}
      data-medal-kind={countLabel === "comments" ? "comment" : "reading"}
    >
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          background: "rgba(0, 0, 0, 0.82)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          opacity: entered ? 1 : 0,
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative z-10 w-full max-w-sm outline-none"
        style={{ opacity: entered ? 1 : 0 }}
      >
        <div className="relative mx-auto w-[min(100%,280px)]">
  <div className="medal-fireflies" data-medal={medal.symbol} aria-hidden="true">
    {[
      { top: "8%", left: "18%", x: "28px", y: "-36px", delay: "0s" },
      { top: "14%", left: "72%", x: "-24px", y: "-28px", delay: "0.4s" },
      { top: "38%", left: "6%", x: "36px", y: "18px", delay: "0.8s" },
      { top: "42%", left: "88%", x: "-32px", y: "12px", delay: "1.1s" },
      { top: "68%", left: "16%", x: "22px", y: "-20px", delay: "1.5s" },
      { top: "72%", left: "78%", x: "-26px", y: "-16px", delay: "1.9s" },
      { top: "22%", left: "48%", x: "14px", y: "-42px", delay: "0.2s" },
      { top: "58%", left: "52%", x: "-12px", y: "30px", delay: "1.3s" },
      { top: "4%", left: "40%", x: "8px", y: "24px", delay: "0.6s" },
      { top: "86%", left: "44%", x: "-10px", y: "-22px", delay: "2.1s" },
    ].map((p, i) => (
      <span
        key={i}
        className="medal-firefly"
        style={
          {
            top: p.top,
            left: p.left,
            ["--ff-x" as string]: p.x,
            ["--ff-y" as string]: p.y,
            ["--ff-delay" as string]: p.delay,
          } as CSSProperties
        }
      />
    ))}
  </div>
  <img
    src={imageSrc}
    alt={medal.name}
    className={`relative z-[1] h-auto w-full object-contain ${entered ? "medal-img-enter" : "opacity-0"}`}
    draggable={false}
  />
</div>

        <div className="mt-4 px-2 text-center">
          <p
            className={`medal-unlock-text text-[11px] font-bold uppercase tracking-[0.22em] ${entered ? "medal-text-enter" : "opacity-0"}`}
            style={{ animationDelay: "0.35s" }}
          >
            Medal Unlocked
          </p>
          <h2
            id="medal-unlock-title"
            className={`medal-unlock-text mt-2 text-2xl font-bold ${entered ? "medal-text-enter" : "opacity-0"}`}
            style={{
              textShadow: `0 0 28px ${medal.color}88`,
              animationDelay: "0.45s",
            }}
          >
            {medal.name}
          </h2>
          <p
            className={`medal-unlock-text medal-unlock-subtext mt-1 text-xs font-medium ${entered ? "medal-text-enter" : "opacity-0"}`}
            style={{ animationDelay: "0.55s" }}
          >
            {count.toLocaleString()} {countLabel}
          </p>
          <p
            className={`medal-unlock-text medal-unlock-subtext mt-3 text-sm leading-relaxed ${entered ? "medal-text-enter" : "opacity-0"}`}
            style={{ animationDelay: "0.65s" }}
          >
            {medal.unlockMessage}
          </p>

          <button
            type="button"
            onClick={onClose}
            className={`mt-6 w-full max-w-xs rounded-xl px-4 py-3 text-sm font-bold text-white transition hover:brightness-110 active:scale-[0.98] ${entered ? "medal-btn-enter" : "opacity-0"}`}
            style={{
              background: `linear-gradient(135deg, ${medal.color}, ${medal.color}cc)`,
              boxShadow: `0 8px 24px ${medal.color}44`,
              animationDelay: "0.8s",
            }}
          >
            Nice!
          </button>
        </div>
      </div>
    </div>
  );
}

function ReadingMedals({
  totalChaptersRead,
  isOwner,
}: {
  totalChaptersRead: number;
  isOwner: boolean;
}) {
  const [persistedUnlocks, setPersistedUnlocks] = useState<number[]>([]);
  const earnedTotal = Math.max(totalChaptersRead, ...(isOwner ? persistedUnlocks : []));
  const unlockedCount = readingMedals.filter((medal) => earnedTotal >= medal.chapters).length;
  const nextMedal = readingMedals.find((medal) => earnedTotal < medal.chapters);
  const previousMilestone = nextMedal
    ? readingMedals[readingMedals.indexOf(nextMedal) - 1]?.chapters || 0
    : 0;
  const progressToNext = nextMedal
    ? Math.max(0, Math.min(100, ((earnedTotal - previousMilestone) / (nextMedal.chapters - previousMilestone)) * 100))
    : 100;

  const [queue, setQueue] = useState<ReadingMedalData[]>([]);
  const [current, setCurrent] = useState<ReadingMedalData | null>(null);

  useEffect(() => {
    if (!isOwner) {
      setPersistedUnlocks([]);
      return;
    }
    let cancelled = false;
    void getUnlockedMedals().then((unlocked) => {
      if (!cancelled) setPersistedUnlocks(unlocked);
    });
    return () => {
      cancelled = true;
    };
  }, [isOwner]);

  useEffect(() => {
    if (!isOwner || totalChaptersRead <= 0) return;
    let cancelled = false;
    void (async () => {
      const newly = await detectNewMedalUnlocks(totalChaptersRead);
      const unlocked = await getUnlockedMedals();
      if (cancelled) return;
      setPersistedUnlocks((currentUnlocks) => [
        ...new Set([...currentUnlocks, ...unlocked]),
      ]);
      if (newly.length > 0) {
        const sorted = [...newly].sort((a, b) => b.chapters - a.chapters);
        setQueue((prev) => [...prev, ...sorted]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOwner, totalChaptersRead]);

  useEffect(() => {
    if (current || queue.length === 0) return;
    const [next, ...rest] = queue;
    setCurrent(next);
    setQueue(rest);
  }, [current, queue]);

  return (
    <>
      <section className="rounded-3xl border border-black/10 bg-white/80 p-4 shadow-lg shadow-slate-900/5 backdrop-blur-sm dark:border-white/10 dark:bg-[#15151d]/85 dark:shadow-black/10 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Reading Medals</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
              {earnedTotal.toLocaleString()} chapters read across manga and novels
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
            {unlockedCount} / {readingMedals.length} unlocked
          </span>
        </div>
        {nextMedal ? (
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between gap-3 text-xs text-slate-600 dark:text-zinc-400">
              <span>Next: {nextMedal.name}</span>
              <span>{Math.max(0, nextMedal.chapters - earnedTotal).toLocaleString()} to go</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
              <div
                className="h-full rounded-full transition-[width]"
                style={{ width: `${progressToNext}%`, backgroundColor: "var(--mikoroku-accent)" }}
              />
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm font-semibold text-[var(--mikoroku-accent)]">All reading medals earned!</p>
        )}
        <div className="mt-5 grid grid-cols-3 gap-1.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-6 lg:grid-cols-6">
          {readingMedals.map((medal) => {
            const unlocked = earnedTotal >= medal.chapters;
            return (
              <MedalCard
                key={medal.chapters}
                medal={medal}
                count={medal.chapters}
                countLabel="chapters"
                unlocked={unlocked}
                imageSrc={medalImageMap[medal.symbol]}
                onOpen={() => setCurrent(medal)}
              />
            );
          })}
        </div>
      </section>
      {current && (
        <MedalUnlockModal
          medal={current}
          count={current.chapters}
          countLabel="chapters"
          imageSrc={medalImageMap[current.symbol]}
          onClose={() => setCurrent(null)}
        />
      )}
    </>
  );
}

function CommentMedals({
  commentCount,
  isOwner,
}: {
  commentCount: number;
  isOwner: boolean;
}) {
  const [persistedUnlocks, setPersistedUnlocks] = useState<number[]>([]);
  const earnedTotal = Math.max(commentCount, ...(isOwner ? persistedUnlocks : []));
  const unlockedCount = commentMedals.filter((medal) => earnedTotal >= medal.comments).length;
  const nextMedal = commentMedals.find((medal) => earnedTotal < medal.comments);
  const previousMilestone = nextMedal
    ? commentMedals[commentMedals.indexOf(nextMedal) - 1]?.comments || 0
    : 0;
  const progressToNext = nextMedal
    ? Math.max(0, Math.min(100, ((earnedTotal - previousMilestone) / (nextMedal.comments - previousMilestone)) * 100))
    : 100;
  const [queue, setQueue] = useState<CommentMedalData[]>([]);
  const [current, setCurrent] = useState<CommentMedalData | null>(null);

  useEffect(() => {
    if (!isOwner) {
      setPersistedUnlocks([]);
      return;
    }
    let cancelled = false;
    void getUnlockedCommentMedals().then((unlocked) => {
      if (!cancelled) setPersistedUnlocks(unlocked);
    });
    return () => {
      cancelled = true;
    };
  }, [isOwner]);

  useEffect(() => {
    if (!isOwner || commentCount <= 0) return;
    let cancelled = false;
    void (async () => {
      const newly = await detectNewCommentMedalUnlocks(commentCount);
      const unlocked = await getUnlockedCommentMedals();
      if (cancelled) return;
      setPersistedUnlocks((currentUnlocks) => [...new Set([...currentUnlocks, ...unlocked])]);
      if (newly.length > 0) {
        setQueue((previous) => [...previous, ...newly.sort((left, right) => right.comments - left.comments)]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [commentCount, isOwner]);

  useEffect(() => {
    if (current || queue.length === 0) return;
    const [next, ...rest] = queue;
    setCurrent(next);
    setQueue(rest);
  }, [current, queue]);

  return (
    <>
      <section className="rounded-3xl border border-black/10 bg-white/80 p-4 shadow-lg shadow-slate-900/5 backdrop-blur-sm dark:border-white/10 dark:bg-[#15151d]/85 dark:shadow-black/10 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Comment Medals</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
              {earnedTotal.toLocaleString()} comments posted
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
            {unlockedCount} / {commentMedals.length} unlocked
          </span>
        </div>
        {nextMedal ? (
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between gap-3 text-xs text-slate-600 dark:text-zinc-400">
              <span>Next: {nextMedal.name}</span>
              <span>{Math.max(0, nextMedal.comments - earnedTotal).toLocaleString()} to go</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
              <div
                className="h-full rounded-full transition-[width]"
                style={{ width: `${progressToNext}%`, backgroundColor: "var(--mikoroku-accent)" }}
              />
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm font-semibold text-[var(--mikoroku-accent)]">All comment medals earned!</p>
        )}
        <div className="mt-5 grid grid-cols-3 gap-1.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-6 lg:grid-cols-6">
          {commentMedals.map((medal) => {
            const unlocked = earnedTotal >= medal.comments;
            return (
              <MedalCard
                key={medal.comments}
                medal={medal}
                count={medal.comments}
                countLabel="comments"
                unlocked={unlocked}
                imageSrc={commentMedalImageMap[medal.symbol]}
                onOpen={() => setCurrent(medal)}
              />
            );
          })}
        </div>
      </section>
      {current && (
        <MedalUnlockModal
          medal={current}
          count={current.comments}
          countLabel="comments"
          imageSrc={commentMedalImageMap[current.symbol]}
          onClose={() => setCurrent(null)}
        />
      )}
    </>
  );
}

function DonutCard({
  title,
  mangaValue,
  novelValue,
  centerValue,
  centerLabel,
  mangaDetail,
  novelDetail,
}: {
  title: string;
  mangaValue: number;
  novelValue: number;
  centerValue: string;
  centerLabel: string;
  mangaDetail: string;
  novelDetail: string;
}) {
  const total = mangaValue + novelValue;
  const mangaShare = total ? (mangaValue / total) * 100 : 50;
  const chartBackground = total
    ? `conic-gradient(var(--mikoroku-accent) 0 ${mangaShare}%, #8b5cf6 ${mangaShare}% 100%)`
    : "conic-gradient(color-mix(in srgb, currentColor 14%, transparent) 0 100%)";

  return (
    <article className="rounded-3xl border border-black/10 bg-gradient-to-br from-red-500/10 via-transparent to-violet-500/10 bg-white/80 p-4 shadow-lg shadow-slate-900/5 backdrop-blur-sm dark:border-white/10 dark:from-red-500/15 dark:via-transparent dark:to-violet-500/15 dark:bg-[#15151d]/85 dark:shadow-black/10 sm:p-5">
      <h2 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h2>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-6 sm:justify-between sm:gap-3">
        <div
          className="grid size-32 shrink-0 place-items-center rounded-full p-3"
          style={{ background: chartBackground }}
          role="img"
          aria-label={`${title}: ${mangaValue} manga and ${novelValue} novels`}
        >
          <div className="grid size-full place-content-center rounded-full bg-white text-center dark:bg-[#15151d]">
            <span className="text-lg font-bold text-slate-900 dark:text-white">{centerValue}</span>
            <span className="text-[10px] text-slate-500 dark:text-zinc-500">{centerLabel}</span>
          </div>
        </div>
        <div className="min-w-[140px] flex-1 space-y-3">
          <div className="flex items-start gap-2 text-xs">
            <span aria-hidden="true" className="mt-0.5 size-2.5 shrink-0 rounded-full bg-[var(--mikoroku-accent)]" />
            <span className="min-w-0 flex-1 text-slate-600 dark:text-zinc-400">Manga</span>
            <span className="text-right font-semibold text-slate-800 dark:text-zinc-200">{mangaDetail}</span>
          </div>
          <div className="flex items-start gap-2 text-xs">
            <span aria-hidden="true" className="mt-0.5 size-2.5 shrink-0 rounded-full bg-violet-500" />
            <span className="min-w-0 flex-1 text-slate-600 dark:text-zinc-400">Novels</span>
            <span className="text-right font-semibold text-slate-800 dark:text-zinc-200">{novelDetail}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

function ProgressCard({ item }: { item: ReadingProgressItem }) {
  const hasSeriesProgress = item.chapterCount > 0;
  const progress = hasSeriesProgress ? item.seriesProgress : item.chapterProgress;
  const chapterPosition = hasSeriesProgress
    ? `${Math.max(0, item.chapterPosition)} / ${item.chapterCount} chapters`
    : item.chapter
      ? `Chapter ${item.chapter}`
      : "Not started";
  const href = item.chapter
    ? `/${item.kind}/${encodeURIComponent(item.slug)}/${encodeURIComponent(item.chapter)}`
    : `/${item.kind}/${encodeURIComponent(item.slug)}`;

  return (
    <article className="flex min-w-0 gap-3 rounded-2xl border border-black/10 bg-white/65 p-3 dark:border-white/10 dark:bg-white/[0.035] sm:gap-4 sm:p-4">
      <CoverImage
        src={item.cover || "/assets/icons/favicon.ico"}
        alt=""
        nsfw={isNsfwManga(item.slug, item.title)}
        className="h-[92px] w-[66px] shrink-0 rounded-lg border border-black/10 object-cover dark:border-white/10"
      />
      <div className="min-w-0 flex-1">
        <a
          href={href}
          className="line-clamp-2 text-sm font-bold text-slate-900 decoration-[var(--mikoroku-accent)] underline-offset-4 hover:text-[var(--mikoroku-accent)] hover:underline dark:text-zinc-100"
        >
          {item.title}
        </a>
        <p className="mt-1 truncate text-xs text-slate-600 dark:text-zinc-400">{item.chapterTitle || (item.chapter ? `Chapter ${item.chapter}` : "Not started")}</p>
        <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-zinc-500">
          <span>{chapterPosition}</span>
          <span>{progress}%{hasSeriesProgress ? "" : " chapter"}</span>
        </div>
        <div
          className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10"
          role="progressbar"
          aria-label={`${item.title} ${hasSeriesProgress ? "series" : "chapter"} reading progress`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <div
            className="h-full rounded-full transition-[width]"
            style={{ width: `${progress}%`, backgroundColor: "var(--mikoroku-accent)" }}
          />
        </div>
        <p className="mt-1.5 text-[10px] text-slate-500 dark:text-zinc-500">Updated {formatUpdatedAt(item.updatedAt)}</p>
      </div>
    </article>
  );
}

function CommentHistorySection({
  comments,
  error,
  limitReached,
}: {
  comments: CommentHistoryItem[];
  error: string;
  limitReached: boolean;
}) {
  const [visibleCount, setVisibleCount] = useState(10);
  const [visibleImages, setVisibleImages] = useState<Set<string>>(() => new Set());
  const visibleComments = comments.slice(0, visibleCount);

  const toggleImageVisibility = (id: string) => {
    setVisibleImages((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section className="rounded-3xl border border-black/10 bg-white/80 p-4 shadow-lg shadow-slate-900/5 backdrop-blur-sm dark:border-white/10 dark:bg-[#15151d]/85 dark:shadow-black/10 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Comment history</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
            Showing {visibleComments.length} of {comments.length} loaded comments · sorted newest first
          </p>
          {limitReached && (
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
              Showing a sample of up to {COMMENT_HISTORY_LIMIT} matching comments to keep Stats responsive.
            </p>
          )}
        </div>
      </div>
      {error ? (
        <p role="status" className="mt-4 rounded-xl border border-amber-300/50 bg-amber-100/70 p-3 text-sm text-amber-900 dark:border-amber-300/20 dark:bg-amber-950/30 dark:text-amber-100">
          Comment history could not be loaded: {error}
        </p>
      ) : comments.length ? (
        <div className="mt-4 space-y-3">
          {visibleComments.map((comment) => {
            const imageKey = `${comment.threadUrl}:${comment.id}`;
            const imageVisible = visibleImages.has(imageKey);
            return (
              <article
                key={imageKey}
                className="rounded-2xl border border-black/10 bg-white/60 p-3 dark:border-white/10 dark:bg-black/15 sm:p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {comment.isReply && (
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-800 dark:bg-violet-400/15 dark:text-violet-200">
                      Reply
                    </span>
                  )}
                  <time className="ml-auto text-[11px] text-slate-500 dark:text-zinc-500">
                    {formatCommentDate(comment.createdAt)}
                  </time>
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800 dark:text-zinc-200">
                  {comment.text || (comment.hasImage ? "Image comment." : "Empty comment.")}
                </p>
                {comment.imageUrl && (
                  <>
                    <button
                      type="button"
                      aria-expanded={imageVisible}
                      onClick={() => toggleImageVisibility(imageKey)}
                      className="mt-2 inline-flex text-xs font-semibold text-[var(--mikoroku-accent)] underline-offset-4 hover:underline"
                    >
                      {imageVisible ? "Hide images" : "Show images"}
                    </button>
                    {imageVisible && (
                      <img
                        src={comment.imageUrl}
                        alt="Comment attachment"
                        loading="lazy"
                        decoding="async"
                        className="mt-3 max-h-[28rem] max-w-full rounded-xl border border-black/10 object-contain dark:border-white/10"
                      />
                    )}
                  </>
                )}
                {comment.threadUrl && (
                  <a
                    href={comment.threadUrl}
                    className="mt-3 inline-flex text-xs font-semibold text-[var(--mikoroku-accent)] underline-offset-4 hover:underline"
                  >
                    {comment.linkTitle}
                  </a>
                )}
              </article>
            );
          })}
          {visibleCount < comments.length && (
            <button
              type="button"
              onClick={() => setVisibleCount((count) => Math.min(count + 10, comments.length))}
              className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-black/5 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/5"
            >
              Load more comments
            </button>
          )}
        </div>
      ) : (
        <p className="mt-4 rounded-2xl border border-dashed border-black/20 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/15 dark:text-zinc-500">
          No comment history to display yet.
        </p>
      )}
    </section>
  );
}

function ProfileFollowControls({
  uid,
  followersCount,
  isOwner,
  displayName,
  avatar,
}: {
  uid: string;
  followersCount: number | null;
  isOwner: boolean;
  displayName: string;
  avatar: string;
}) {
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState<number | null>(
    typeof followersCount === "number" ? followersCount : null,
  );
  const [viewerUid, setViewerUid] = useState("");
  const [followError, setFollowError] = useState("");
  const [messageError, setMessageError] = useState("");
  const operationRevision = useRef(0);

  useEffect(() => {
    let active = true;
    const firebase = (window as ProfileBannerWindow).firebase;
    const auth = firebase?.auth?.();
    const updateViewer = (currentUid: string) => {
      const revision = ++operationRevision.current;
      setViewerUid(currentUid);
      setFollowerCount(typeof followersCount === "number" ? followersCount : null);
      setFollowError("");
      setMessageError("");

      if (!currentUid || currentUid === uid) {
        setFollowing(false);
        return;
      }

      setFollowing(getCachedFollowingUids(currentUid).includes(uid));
      void loadFollowingUids(currentUid)
        .then((followingUids) => {
          if (active && operationRevision.current === revision) {
            setFollowing(followingUids.includes(uid));
          }
        })
        .catch((error: unknown) => {
          console.error("Could not load follow status.", error);
          if (active && operationRevision.current === revision) {
            setFollowError("Could not load follow status.");
          }
        });
    };

    updateViewer(auth?.currentUser?.uid || (window as ProfileBannerWindow).currentUser?.uid || "");
    const unsubscribe = auth?.onAuthStateChanged((user) => updateViewer(user?.uid || ""));
    return () => {
      active = false;
      unsubscribe?.();
      operationRevision.current += 1;
    };
  }, [followersCount, uid]);

  const handleFollow = () => {
    if (!viewerUid || viewerUid === uid) return;

    const nextFollowing = !following;
    const updatedFollowing = new Set(getCachedFollowingUids(viewerUid));
    if (nextFollowing) updatedFollowing.add(uid);
    else updatedFollowing.delete(uid);
    cacheFollowingUids(viewerUid, [...updatedFollowing], false);

    const revision = ++operationRevision.current;
    setFollowing(nextFollowing);
    setFollowerCount((count) => (
      count === null ? null : Math.max(0, count + (nextFollowing ? 1 : -1))
    ));
    setFollowError("");

    void setUserFollowing(viewerUid, uid, nextFollowing).catch((error: unknown) => {
      console.error("Could not synchronize follow status.", error);
      if (operationRevision.current === revision) {
        setFollowError("Follow could not be synchronized. Try again later.");
      }
    });
  };

  const handleMessage = () => {
    if (!viewerUid || viewerUid === uid) return;
    const appWindow = window as ProfileBannerWindow;
    const openDm = appWindow.openMikorokuDmToUser || appWindow.openDmToUser;
    if (!openDm) {
      console.error("Direct messaging is unavailable on this page.");
      setMessageError("Messaging is unavailable.");
      return;
    }

    setMessageError("");
    openDm(uid, displayName, avatar);
  };

  const isSelf = isOwner || viewerUid === uid;

  return (
    <div className="flex w-full flex-col items-center gap-1">
      <span className="text-center text-xs font-semibold text-slate-700 dark:text-zinc-200">
        {followerCount === null ? "Followers —" : `${followerCount.toLocaleString()} followers`}
      </span>
      <button
        type="button"
        onClick={handleFollow}
        disabled={isSelf || !viewerUid}
        className={`w-full rounded-lg border px-3 py-1 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
          following
            ? "border-violet-600 bg-violet-600 text-white hover:bg-violet-700"
            : "border-violet-500 text-violet-700 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-500/10"
        }`}
      >
        {isSelf ? "You" : following ? "Following" : "Follow"}
      </button>
      <button
        type="button"
        onClick={handleMessage}
        disabled={isSelf || !viewerUid}
        className="w-full rounded-lg border border-slate-400 px-3 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-500 dark:text-zinc-200 dark:hover:bg-white/10"
      >
        Message
      </button>
      {followError && (
        <span role="alert" className="w-full text-center text-xs text-red-700 dark:text-red-300">
          {followError}
        </span>
      )}
      {messageError && (
        <span role="alert" className="w-full text-center text-xs text-red-700 dark:text-red-300">
          {messageError}
        </span>
      )}
    </div>
  );
}

function StatsLoadingSkeleton() {
  const shimmer = "animate-pulse rounded bg-slate-200 dark:bg-white/10";
  const panel = "rounded-3xl border border-black/10 bg-white/80 p-4 shadow-lg shadow-slate-900/5 dark:border-white/10 dark:bg-[#15151d]/85 sm:p-6";

  return (
    <div role="status" aria-label="Loading reader stats" aria-busy="true" className="space-y-5">
      <span className="sr-only">Loading reader stats...</span>

      <section className={`${panel} flex min-h-40 items-start gap-4 sm:p-7`}>
        <div className={`${shimmer} size-16 shrink-0 rounded-2xl sm:size-20`} />
        <div className="min-w-0 flex-1 space-y-3">
          <div className={`${shimmer} h-3 w-24`} />
          <div className={`${shimmer} h-7 w-48 max-w-3/4`} />
          <div className={`${shimmer} h-3 w-36 max-w-2/3`} />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className={`${shimmer} h-6 w-16`} />
            ))}
          </div>
          <div className={`${shimmer} h-2 w-full`} />
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-4" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className={`${panel} min-h-24 space-y-3`}>
            <div className={`${shimmer} h-3 w-2/3`} />
            <div className={`${shimmer} h-6 w-1/2`} />
            <div className={`${shimmer} h-3 w-3/4`} />
          </div>
        ))}
      </section>

      {[0, 1].map((section) => (
        <section key={section} className={panel} aria-hidden="true">
          <div className={`${shimmer} h-5 w-40`} />
          <div className={`${shimmer} mt-2 h-3 w-56 max-w-full`} />
          <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className={`${shimmer} aspect-[3/4] rounded-2xl`} />
            ))}
          </div>
        </section>
      ))}

      <section className="grid gap-3 md:grid-cols-2" aria-hidden="true">
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className={`${panel} flex min-h-64 flex-col items-center`}>
            <div className={`${shimmer} mr-auto h-5 w-44`} />
            <div className={`${shimmer} mt-6 size-36 rounded-full`} />
            <div className={`${shimmer} mt-5 h-3 w-40`} />
          </div>
        ))}
      </section>

      <section className={panel} aria-hidden="true">
        <div className={`${shimmer} h-5 w-40`} />
        <div className="mt-6 grid h-44 grid-cols-7 items-end gap-2 sm:gap-4">
          {[35, 65, 45, 80, 55, 30, 70].map((height, index) => (
            <div key={index} className="flex h-full flex-col items-center justify-end gap-2">
              <div className={`${shimmer} w-full rounded-t-md`} style={{ height: `${height}%` }} />
              <div className={`${shimmer} h-3 w-full`} />
            </div>
          ))}
        </div>
      </section>

      {[0, 1].map((section) => (
        <section key={section} className={panel} aria-hidden="true">
          <div className={`${shimmer} h-5 w-44`} />
          <div className={`${shimmer} mt-2 h-3 w-64 max-w-full`} />
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="flex items-center gap-3 rounded-2xl border border-black/10 p-3 dark:border-white/10">
                <div className={`${shimmer} size-14 shrink-0 rounded-xl`} />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className={`${shimmer} h-4 w-3/4`} />
                  <div className={`${shimmer} h-3 w-1/2`} />
                  <div className={`${shimmer} h-2 w-full`} />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function ReadingStatsPage({ uid }: { uid: string }) {
  const [stats, setStats] = useState<PublicReadingStats | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [visibleProgressCount, setVisibleProgressCount] = useState(10);
  const [isOwner, setIsOwner] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerUploadStage, setBannerUploadStage] = useState("");
  const [bannerError, setBannerError] = useState("");
  const [bannerSyncPending, setBannerSyncPending] = useState(false);
  const [statsSettingsOpen, setStatsSettingsOpen] = useState(false);
  const [hiddenStatsDraft, setHiddenStatsDraft] = useState<StatsSectionId[]>([]);
  const [statsSettingsError, setStatsSettingsError] = useState("");
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const statsSettingsDialogRef = useRef<HTMLDivElement>(null);
  const statsSettingsSaveIdRef = useRef(0);
  const lifetimeChapterHighWaterRef = useRef({ uid, total: 0 });
  const statsRef = useRef<PublicReadingStats | null>(stats);
  const lastHandledRetryRef = useRef(retry);
  statsRef.current = stats;
  if (lifetimeChapterHighWaterRef.current.uid !== uid) {
    lifetimeChapterHighWaterRef.current = { uid, total: 0 };
  }

  useEffect(() => {
    let active = true;
    let refreshing = false;
    let refreshTimer: number | undefined;
    let lastSyncedAt = 0;
    const forceRefresh = retry !== lastHandledRetryRef.current;
    lastHandledRetryRef.current = retry;
    setVisibleProgressCount(10);
    setError("");

    const scheduleRefresh = (delay: number) => {
      if (!active || document.visibilityState === "hidden") return;
      if (refreshTimer !== undefined) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        refreshTimer = undefined;
        void refreshStats();
      }, Math.max(0, delay));
    };

    const refreshStats = async () => {
      if (!active || refreshing || document.visibilityState === "hidden") return;
      refreshing = true;
      try {
        const [loadedResult, unlockedMedals, localHistory] = await Promise.all([
          loadPublicReadingStats(uid),
          getUnlockedMedals(),
          isOwner ? readReadingHistory() : Promise.resolve([]),
        ]);
        const pendingBanner = isOwner ? getPendingProfileBanner(uid) : null;
        const result = pendingBanner
          ? {
            ...loadedResult,
            profile: { ...loadedResult.profile, profileBanner: pendingBanner.url },
          }
          : loadedResult;
        if (!active) return;
        const localReadMarks = isOwner ? getLocalReadMarksCount() : 0;
        const localChapterTotal = isOwner ? getLocalChapterTotal(uid) : 0;
        const totalChaptersRead = Math.max(
          result.totalChaptersRead,
          localReadMarks,
          localChapterTotal,
          lifetimeChapterHighWaterRef.current.total,
          ...(isOwner ? unlockedMedals.filter(Number.isFinite) : []),
        );
        if (isOwner) setLocalChapterTotal(uid, totalChaptersRead);
        if (isOwner) setLocalReadingActivityBaseline(uid, result.activity);
        const activity = isOwner ? mergeLocalReadingActivity(uid, result.activity) : result.activity;
        const preservedResult = {
          ...result,
          progress: isOwner
            ? mergeReadingProgressFromHistory(
              mergeLocalReadingProgress(uid, result.progress),
              localHistory,
            )
            : result.progress,
          activity,
          totalChaptersRead,
          bookmarksCount: (isOwner && hasFreshLocalBookmarks() ? getLocalBookmarkCount() : null)
            ?? result.bookmarksCount
            ?? (isOwner ? getLocalBookmarkCount() : null)
            ?? statsRef.current?.bookmarksCount
            ?? null,
        };
        lifetimeChapterHighWaterRef.current = { uid, total: totalChaptersRead };
        if (isOwner && totalChaptersRead > result.totalChaptersRead) {
          try {
            await preserveLifetimeChapterCount(uid, totalChaptersRead);
          } catch (recoveryError) {
            console.warn("The lifetime chapter count could not be restored to Firestore.", recoveryError);
          }
        }
        if (!active) return;
        setStats(preservedResult);
        setError("");
        await setCachedReadingStats(uid, {
          ...preservedResult,
          activity: result.activity,
        });
        lastSyncedAt = Date.now();
      } catch (loadError: unknown) {
        console.error("Public reading stats could not be loaded.", loadError);
        if (!active) return;
        const freshStatsError = loadError instanceof Error
          ? loadError.message
          : "Reading stats could not be loaded.";
        setStats((current) => {
          if (current) return current;
          setError(freshStatsError);
          return current;
        });
      } finally {
        refreshing = false;
        if (active) scheduleRefresh(READING_STATS_CACHE_TTL_MS);
      }
    };

    const refreshWhenDue = () => {
      if (!active || document.visibilityState === "hidden") return;
      const timeUntilRefresh = READING_STATS_CACHE_TTL_MS - (Date.now() - lastSyncedAt);
      if (timeUntilRefresh <= 0) {
        void refreshStats();
      } else {
        scheduleRefresh(timeUntilRefresh);
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (refreshTimer !== undefined) window.clearTimeout(refreshTimer);
        refreshTimer = undefined;
        return;
      }
      refreshWhenDue();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    const loadCachedStats = async () => {
      try {
        const [cached, unlockedMedals, cachedProfile, localHistory] = await Promise.all([
          getCachedReadingStats(uid),
          getUnlockedMedals(),
          Promise.resolve(getCachedUserStatsProfile(uid)),
          isOwner ? readReadingHistory() : Promise.resolve([]),
        ]);
        if (!active) return;
        const localReadMarks = isOwner ? getLocalReadMarksCount() : 0;
        const pendingBanner = isOwner ? getPendingProfileBanner(uid) : null;
        const freshProfile = {
          ...(cachedProfile?.version === 2 && !cachedProfile.stale ? cachedProfile.data : {}),
          ...(pendingBanner ? { profileBanner: pendingBanner.url } : {}),
        };
        const cachedStats = cached?.data
          ? {
            ...cached.data,
            profile: { ...cached.data.profile, ...freshProfile },
          }
          : null;
        if (cached && cachedStats) {
          const cachedHistoryProgress = mergeReadingProgressFromHistory(
            cachedStats.progress,
            cached.data.profile.readingHistory,
          );
          const progress = isOwner
            ? mergeReadingProgressFromHistory(
              mergeLocalReadingProgress(uid, cachedHistoryProgress),
              localHistory,
            )
            : cachedHistoryProgress;
          const localChapterTotal = isOwner ? getLocalChapterTotal(uid) : 0;
          const totalChaptersRead = Math.max(
            cachedStats.totalChaptersRead,
            localReadMarks,
            localChapterTotal,
            lifetimeChapterHighWaterRef.current.total,
            ...(isOwner ? unlockedMedals.filter(Number.isFinite) : []),
          );
          if (isOwner) setLocalChapterTotal(uid, totalChaptersRead);
          if (isOwner) setLocalReadingActivityBaseline(uid, cachedStats.activity);
          const activity = isOwner
            ? mergeLocalReadingActivity(uid, cachedStats.activity)
            : cachedStats.activity;
          lifetimeChapterHighWaterRef.current = { uid, total: totalChaptersRead };
          setStats({
            ...cachedStats,
            progress,
            activity,
            totalChaptersRead,
            bookmarksCount: isOwner
              ? (hasFreshLocalBookmarks() ? getLocalBookmarkCount() : null)
                ?? cachedStats.bookmarksCount
                ?? getLocalBookmarkCount()
              : cachedStats.bookmarksCount,
          });
          setError("");
          lastSyncedAt = cached.savedAt;
          if (forceRefresh || cached.stale) {
            void refreshStats();
          } else {
            scheduleRefresh(READING_STATS_CACHE_TTL_MS - (Date.now() - cached.savedAt));
          }
          return;
        }

        setStats(null);
        lastSyncedAt = 0;
        void refreshStats();
      } catch (cacheError: unknown) {
        console.warn("Cached reading stats could not be loaded.", cacheError);
        if (!active) return;
        setStats(null);
        void refreshStats();
      }
    };

    void loadCachedStats();
    return () => {
      active = false;
      if (refreshTimer !== undefined) window.clearTimeout(refreshTimer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [isOwner, retry, uid]);

  useEffect(() => {
    const onUserStatsProfileUpdated = (event: Event) => {
      const { uid: updatedUid, profile } =
        (event as CustomEvent<UserStatsProfileUpdatedDetail>).detail;
      if (updatedUid !== uid) return;
      setStats((current) => current
        ? { ...current, profile: { ...current.profile, ...profile } }
        : current);
    };

    window.addEventListener(USER_STATS_PROFILE_UPDATED_EVENT, onUserStatsProfileUpdated);
    const onBannerSynced = (event: Event) => {
      const { uid: syncedUid } = (event as CustomEvent<{ uid: string }>).detail;
      if (syncedUid === uid) setBannerSyncPending(false);
    };
    window.addEventListener(PROFILE_BANNER_SYNCED_EVENT, onBannerSynced);
    setBannerSyncPending(Boolean(getPendingProfileBanner(uid)));
    return () => {
      window.removeEventListener(USER_STATS_PROFILE_UPDATED_EVENT, onUserStatsProfileUpdated);
      window.removeEventListener(PROFILE_BANNER_SYNCED_EVENT, onBannerSynced);
    };
  }, [uid]);

  useEffect(() => {
    if (!isOwner) return;
    const updateLocalHistoryProgress = () => {
      void readReadingHistory().then((history) => {
        setStats((current) => {
          if (!current) return current;
          const progress = mergeReadingProgressFromHistory(
            mergeLocalReadingProgress(uid, current.progress),
            history,
          );
          const progressChanged = progress.length !== current.progress.length ||
            progress.some((item, index) =>
              item.slug !== current.progress[index]?.slug ||
              item.updatedAt !== current.progress[index]?.updatedAt,
            );
          return progressChanged ? { ...current, progress } : current;
        });
      }).catch((historyError: unknown) => {
        console.warn("Local reading history could not be merged into Stats progress.", historyError);
      });
    };
    const updateLocalChapterCount = () => {
      const localTotal = getLocalChapterTotal(uid);
      setStats((current) => {
        if (!current) return current;
        const totalChaptersRead = Math.max(current.totalChaptersRead, localTotal);
        const activity = mergeLocalReadingActivity(uid, current.activity);
        const progress = mergeLocalReadingProgress(uid, current.progress);
        const progressChanged = progress.length !== current.progress.length ||
          progress.some((item, index) =>
            item.slug !== current.progress[index]?.slug ||
            item.updatedAt !== current.progress[index]?.updatedAt,
          );
        return totalChaptersRead === current.totalChaptersRead
          && activity.every((day, index) => day.chapters === current.activity[index]?.chapters)
          && !progressChanged
          ? current
          : { ...current, totalChaptersRead, activity, progress };
      });
    };
    const onStorage = (event: StorageEvent) => {
      if (
        event.key === getLocalChapterTotalStorageKey(uid)
        || event.key === getLocalReadingActivityStorageKey(uid)
        || event.key === getLocalReadingProgressStorageKey(uid)
      ) updateLocalChapterCount();
      if (event.key === "readingHistory") updateLocalHistoryProgress();
    };
    window.addEventListener("mikoroku:reading-stats-local-updated", updateLocalChapterCount);
    window.addEventListener("mikoroku:reading-history-updated", updateLocalHistoryProgress);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("mikoroku:reading-stats-local-updated", updateLocalChapterCount);
      window.removeEventListener("mikoroku:reading-history-updated", updateLocalHistoryProgress);
      window.removeEventListener("storage", onStorage);
    };
  }, [isOwner, uid]);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    const attachAuthListener = () => {
      if (unsubscribe) return true;
      const firebase = (window as ProfileBannerWindow).firebase;
      if (typeof firebase?.auth !== "function") return false;
      try {
        const auth = firebase.auth();
        setIsOwner(auth.currentUser?.uid === uid);
        unsubscribe = auth.onAuthStateChanged((user) => {
          if (active) setIsOwner(user?.uid === uid);
        });
        return true;
      } catch (authError) {
        console.error("Profile banner ownership could not be verified.", authError);
        return false;
      }
    };
    const onFirebaseReady = () => { attachAuthListener(); };
    attachAuthListener();
    window.addEventListener("firebaseCompatReady", onFirebaseReady);
    return () => {
      active = false;
      unsubscribe?.();
      window.removeEventListener("firebaseCompatReady", onFirebaseReady);
    };
  }, [uid]);

  useEffect(() => {
    if (!statsSettingsOpen || !isOwner) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setStatsSettingsOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    statsSettingsDialogRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOwner, statsSettingsOpen]);

  async function handleBannerFile(file?: File) {
    setBannerError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setBannerError("Choose an image file for the banner.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setBannerError("The image must be no larger than 15 MB before compression.");
      return;
    }

    setBannerUploading(true);
    try {
      const firebase = (window as ProfileBannerWindow).firebase;
      const user = firebase?.auth?.().currentUser;
      if (!user || user.uid !== uid) {
        throw new Error("Sign in as the profile owner to upload a banner.");
      }

      setBannerUploadStage("Compressing image...");
      const imageUrl = await uploadProfileBanner(file, setBannerUploadStage);
      if (firebase.auth?.().currentUser?.uid !== uid) {
        throw new Error("The signed-in account changed before the banner was saved. Please try again.");
      }
      setBannerUploadStage("Saving locally...");
      queueProfileBanner(uid, imageUrl);
      cacheUserStatsProfile(uid, { profileBanner: imageUrl });
      setStats((current) => {
        if (!current) return current;
        const updatedStats = {
          ...current,
          profile: { ...current.profile, profileBanner: imageUrl },
        };
        statsRef.current = updatedStats;
        void setCachedReadingStats(uid, updatedStats, false);
        return updatedStats;
      });
      setBannerSyncPending(true);
      setBannerError("");
      window.dispatchEvent(new Event("mikoroku:reading-stats-updated"));
    } catch (uploadError) {
      console.error("Profile banner upload failed.", uploadError);
      setBannerError(uploadError instanceof Error
        ? uploadError.message
        : "Banner upload failed. Please try again.");
    } finally {
      setBannerUploading(false);
      setBannerUploadStage("");
      if (bannerInputRef.current) bannerInputRef.current.value = "";
    }
  }

  function saveStatsSettings() {
    setStatsSettingsError("");
    try {
      const firebase = (window as ProfileBannerWindow).firebase;
      const user = firebase?.auth?.().currentUser;
      const firestore = firebase?.firestore?.();
      if (!user || user.uid !== uid || !firestore) {
        throw new Error("Sign in as the profile owner to update stats settings.");
      }

      const hiddenStatsSections = getHiddenStatsSections(hiddenStatsDraft);
      const saveId = ++statsSettingsSaveIdRef.current;
      const savePromise = firestore.collection("userStats").doc(uid).set({ hiddenStatsSections }, { merge: true });
      const currentStats = statsRef.current;
      if (currentStats) {
        const updatedStats = {
          ...currentStats,
          profile: { ...currentStats.profile, hiddenStatsSections },
        };
        statsRef.current = updatedStats;
        setStats(updatedStats);
        void setCachedReadingStats(uid, updatedStats, false);
        cacheUserStatsProfile(uid, updatedStats.profile);
      }
      setStatsSettingsOpen(false);
      window.dispatchEvent(new Event("mikoroku:reading-stats-updated"));
      void savePromise.catch((saveError: unknown) => {
        console.error("Stats settings could not be synced to Firestore.", saveError);
        if (saveId !== statsSettingsSaveIdRef.current) return;
        const detail = saveError instanceof Error ? ` ${saveError.message}` : "";
        setStatsSettingsError(`Settings were applied here but could not be synced to Firestore.${detail}`);
      });
    } catch (saveError) {
      console.error("Stats settings could not be saved.", saveError);
      setStatsSettingsError(saveError instanceof Error
        ? saveError.message
        : "Stats settings could not be saved. Please try again.");
    }
  }

  const profile = stats?.profile || {};
  const name = stringValue(profile.displayName) || stringValue(profile.username) || "Reader";
  const username = stringValue(profile.username);
  const joinedAt = dateValue(profile.joinedAt) || dateValue(profile.createdAt);
  const avatar = stringValue(profile.avatar) || "/assets/icons/favicon.ico";
  const profileBanner = stringValue(profile.profileBanner);
  const hiddenStatsSections = getHiddenStatsSections(profile.hiddenStatsSections);
  const progress = stats?.progress || [];
  const visibleProgress = progress.slice(0, visibleProgressCount);
  const activity = stats?.activity || [];
  const totalWeeklyChapters = activity.reduce((total, day) => total + day.chapters, 0);
  const activeDays = activity.filter((day) => day.chapters > 0).length;
  const mangaCount = progress.filter((item) => item.kind === "manga").length;
  const novelCount = progress.filter((item) => item.kind === "novel").length;
  const sourceCount = new Set(progress.map((item) => item.source).filter(Boolean)).size;
  const mangaProgress = progress.filter((item) => item.kind === "manga");
  const novelProgress = progress.filter((item) => item.kind === "novel");
  const mangaWithSeriesProgress = mangaProgress.filter((item) => item.chapterCount > 0);
  const novelWithSeriesProgress = novelProgress.filter((item) => item.chapterCount > 0);
  const knownSeriesProgress = [...mangaWithSeriesProgress, ...novelWithSeriesProgress];
  const mangaProgressTotal = mangaWithSeriesProgress.reduce((total, item) => total + item.seriesProgress, 0);
  const novelProgressTotal = novelWithSeriesProgress.reduce((total, item) => total + item.seriesProgress, 0);
  const mangaAverage = mangaWithSeriesProgress.length
    ? Math.round(mangaProgressTotal / mangaWithSeriesProgress.length)
    : null;
  const novelAverage = novelWithSeriesProgress.length
    ? Math.round(novelProgressTotal / novelWithSeriesProgress.length)
    : null;
  const averageProgress = knownSeriesProgress.length
    ? Math.round(knownSeriesProgress.reduce((total, item) => total + item.seriesProgress, 0) / knownSeriesProgress.length)
    : null;
  const maxActivity = Math.max(1, ...activity.map((day) => day.chapters));
  const commentCount = numberValue(profile.commentCount);
  const level = Math.floor(commentCount / 5) + 1;
  const expToNextLevel = commentCount % 5;
  const expProgress = (expToNextLevel / 5) * 100;
  const points = numberValue(profile.points);
  const reputation = numberValue(profile.reputation);
  const customBadges = [...new Set([
    ...(Array.isArray(profile.customBadges) ? profile.customBadges : []),
    profile.customBadge,
  ]
    .filter((badge): badge is string => typeof badge === "string" && badge.trim().length > 0)
    .map((badge) => badge.trim()))];
  const selectedMedals = new Set(
    Array.isArray(profile.achievementBadges)
      ? profile.achievementBadges.filter((badge): badge is string => typeof badge === "string")
      : [],
  );
  const readingStats = profile.readingStats
    && typeof profile.readingStats === "object"
    && !Array.isArray(profile.readingStats)
    ? profile.readingStats as Record<string, unknown>
    : {};
  const readingChaptersValue = readingStats.totalChaptersRead;
  const readingChapters = numberValue(
    typeof readingChaptersValue === "number" ? readingChaptersValue : profile.totalChaptersRead,
  );
  const selectedReadingMedal = readingMedals.find((medal) =>
    selectedMedals.has(getMedalBadgeId("medal", medal.name))
    && readingChapters >= medal.chapters);
  const selectedCommentMedal = commentMedals.find((medal) =>
    selectedMedals.has(getMedalBadgeId("comment-medal", medal.name))
    && commentCount >= medal.comments);
  const profileBadges = [
    ...customBadges.map((badge) => ({
      id: badge,
      label: formatCustomBadgeLabel(badge),
      style: undefined,
    })),
    ...(selectedReadingMedal ? [{
      id: getMedalBadgeId("medal", selectedReadingMedal.name),
      label: selectedReadingMedal.name,
      style: {
        background: selectedReadingMedal.gradient,
        color: selectedReadingMedal.color,
      },
    }] : []),
    ...(selectedCommentMedal ? [{
      id: getMedalBadgeId("comment-medal", selectedCommentMedal.name),
      label: selectedCommentMedal.name,
      style: {
        background: selectedCommentMedal.gradient,
        color: selectedCommentMedal.color,
      },
    }] : []),
  ];
  const reputationBadgeTone = reputation < 0
    ? "border-rose-200 bg-rose-100/90 text-rose-800 dark:border-rose-300/20 dark:bg-rose-500/15 dark:text-rose-200"
    : "border-emerald-200 bg-emerald-100/90 text-emerald-800 dark:border-emerald-300/20 dark:bg-emerald-500/15 dark:text-emerald-200";

  return (
    <>
      <SiteChrome showFooter={false} />
      <main className="route-page-background min-h-[calc(100vh-3.5rem)] px-3 pb-12 pt-6 text-slate-900 dark:text-zinc-100 sm:px-6">
        <div className="mx-auto max-w-6xl space-y-5">
          {!stats && !error ? (
            <StatsLoadingSkeleton />
          ) : (
            <>
          <section className="relative isolate overflow-hidden rounded-3xl border border-black/10 bg-white/80 p-3 shadow-xl shadow-slate-900/10 backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/80 dark:shadow-black/20 sm:p-7">
            {profileBanner && (
              <>
                <img
                  src={profileBanner}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 size-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/85 to-white/65 dark:from-slate-950/95 dark:via-slate-950/80 dark:to-slate-950/60" />
              </>
            )}
            {isOwner && (
              <>
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  aria-label="Choose profile banner image"
                  onChange={(event) => void handleBannerFile(event.target.files?.[0])}
                />
                <button
                  type="button"
                  onClick={() => {
                    setHiddenStatsDraft(getHiddenStatsSections(profile.hiddenStatsSections));
                    setStatsSettingsError("");
                    setStatsSettingsOpen(true);
                  }}
                  aria-label="Open stats settings"
                  title="Stats settings"
                  className="absolute right-3 top-3 z-20 grid size-9 place-items-center rounded-lg border border-black/15 bg-white/85 text-slate-800 shadow-sm backdrop-blur transition hover:bg-white disabled:cursor-wait disabled:opacity-70 dark:border-white/20 dark:bg-black/50 dark:text-white dark:hover:bg-black/70"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-4">
                    <path d="M4 7h10m4 0h2M4 17h2m4 0h10M4 12h2m4 0h10" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
                    <circle cx="16" cy="7" r="2" fill="currentColor" />
                    <circle cx="8" cy="12" r="2" fill="currentColor" />
                    <circle cx="8" cy="17" r="2" fill="currentColor" />
                  </svg>
                </button>
              </>
            )}
            <div className={`relative z-10 flex items-start gap-3 sm:gap-4 ${isOwner ? "pr-1 sm:pr-24" : ""}`}>
              <div className="flex w-24 shrink-0 flex-col items-center gap-2">
                <img
                  src={avatar}
                  alt=""
                  onError={(event) => { event.currentTarget.src = "/assets/icons/favicon.ico"; }}
                  className="size-14 rounded-xl border-2 border-[var(--mikoroku-accent)] object-cover shadow-lg sm:size-[76px] sm:rounded-2xl lg:size-[92px]"
                />
                <ProfileFollowControls
                  uid={uid}
                  followersCount={stats?.followersCount ?? null}
                  isOwner={isOwner}
                  displayName={name}
                  avatar={avatar}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--mikoroku-accent)] sm:text-xs sm:tracking-[0.2em]">Reader stats</p>
                <h1 className="mt-0.5 truncate text-lg font-bold leading-tight text-slate-900 dark:text-white sm:mt-1 sm:text-3xl">{name}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600 dark:text-zinc-400 sm:text-sm">
                  <span className="truncate">{username ? `@${username.replace(/^@/, "")}` : `Reader ID ${uid}`}</span>
                  {joinedAt && (
                    <time
                      dateTime={joinedAt.toISOString()}
                      title={`Joined ${joinedAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`}
                      className="inline-flex shrink-0 items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-800 dark:border-emerald-300/20 dark:bg-emerald-500/10 dark:text-emerald-200 sm:text-[10px]"
                    >
                      Joined {joinedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </time>
                  )}
                </div>
                <div className="mt-2 grid max-w-[360px] grid-cols-2 gap-1.5 text-[10px] sm:mt-3 sm:flex sm:max-w-none sm:flex-wrap sm:gap-2 sm:text-xs">
                  <span className="profile-stat-badge border border-violet-200 bg-violet-100/90 font-semibold text-violet-800 dark:border-violet-300/20 dark:bg-violet-500/15 dark:text-violet-200">
                    Level {level}
                  </span>
                  <span className="profile-stat-badge border border-amber-200 bg-amber-100/90 font-semibold text-amber-800 dark:border-amber-300/20 dark:bg-amber-500/15 dark:text-amber-200">
                    {points.toLocaleString()} pts
                  </span>
                  <span className="profile-stat-badge border border-sky-200 bg-sky-100/90 font-semibold text-sky-800 dark:border-sky-300/20 dark:bg-sky-500/15 dark:text-sky-200">
                    {commentCount.toLocaleString()} comments
                  </span>
                  {typeof profile.reputation === "number" && (
                    <span className={`profile-stat-badge border font-semibold ${reputationBadgeTone}`}>
                      {reputation.toLocaleString()} reputation
                    </span>
                  )}
                </div>
                {profileBadges.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:mt-2.5">
                    <span className="mr-0.5 text-[10px] font-semibold text-slate-600 dark:text-zinc-300 sm:text-xs">Badges</span>
                    {profileBadges.map((badge) => (
                      <span
                        key={badge.id}
                        className={`settings-badge-option profile-custom-badge stats-custom-badge badge-${badge.id}`}
                        style={badge.style}
                      >
                        {badge.label}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-2.5 sm:mt-3">
                  <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-medium text-slate-600 dark:text-zinc-300 sm:text-xs">
                    <span>EXP to Level {level + 1}</span>
                    <span>{expToNextLevel} / 5 EXP</span>
                  </div>
                  <div
                    className="h-1.5 overflow-hidden rounded-full bg-slate-200/90 dark:bg-white/15 sm:h-2"
                    role="progressbar"
                    aria-label={`EXP progress to level ${level + 1}`}
                    aria-valuemin={0}
                    aria-valuemax={5}
                    aria-valuenow={expToNextLevel}
                  >
                    <div
                      className="h-full rounded-full bg-[var(--mikoroku-accent)] transition-[width]"
                      style={{ width: `${expProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
            {isOwner && bannerError && !statsSettingsOpen && (
              <p role="alert" className="relative z-10 mt-3 rounded-lg bg-red-100/90 px-3 py-2 text-xs text-red-800 dark:bg-red-950/80 dark:text-red-100">
                {bannerError}
              </p>
            )}
            {isOwner && statsSettingsError && !statsSettingsOpen && (
              <p role="alert" className="relative z-10 mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-red-100/90 px-3 py-2 text-xs text-red-800 dark:bg-red-950/80 dark:text-red-100">
                <span>{statsSettingsError}</span>
                <button
                  type="button"
                  onClick={() => {
                    setHiddenStatsDraft(getHiddenStatsSections(profile.hiddenStatsSections));
                    setStatsSettingsError("");
                    setStatsSettingsOpen(true);
                  }}
                  className="font-bold underline"
                >
                  Retry
                </button>
              </p>
            )}
          </section>

          {error && (
            <section role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-400/30 dark:bg-red-950/30 dark:text-red-100">
              <span>Stats could not be loaded: {error}</span>
              <button
                type="button"
                onClick={() => setRetry((current) => current + 1)}
                className="rounded-lg border border-red-400/50 px-3 py-2 font-semibold transition hover:bg-red-400/10 dark:border-red-300/30"
              >
                Retry
              </button>
            </section>
          )}

          {stats && (
            <>
              {!hiddenStatsSections.includes("stat-cards") && (
                <section className="grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-4">
                  <StatsCard label="Series tracked" value={progress.length.toLocaleString()} detail="Tracked manga + novels" icon="▤" tone="rose" />
                  <StatsCard label="Chapters read" value={stats.totalChaptersRead.toLocaleString()} detail="Lifetime chapter total" icon="▣" tone="amber" />
                  <StatsCard label="Bookmarks" value={stats.bookmarksCount === null ? "—" : stats.bookmarksCount.toLocaleString()} detail={stats.bookmarksCount === null ? "Not publicly available" : "Saved series"} icon="☆" tone="violet" />
                  <StatsCard label="Progress" value={averageProgress === null ? "—" : `${averageProgress}%`} detail={`${knownSeriesProgress.length} series with data`} icon="◔" tone="blue" />
                  <StatsCard label="Chapter opens" value={totalWeeklyChapters.toLocaleString()} detail={`${activeDays} active days this week`} icon="↗" tone="cyan" />
                  <StatsCard label="Manga" value={mangaCount.toLocaleString()} detail="Manga with progress" icon="▣" tone="emerald" />
                  <StatsCard label="Novels" value={novelCount.toLocaleString()} detail="Novels with progress" icon="▥" tone="orange" />
                  <StatsCard label="Sources" value={sourceCount.toLocaleString()} detail="Source types used" icon="⌘" tone="pink" />
                </section>
              )}

              {!hiddenStatsSections.includes("medals") && (
                <ReadingMedals totalChaptersRead={stats.totalChaptersRead} isOwner={isOwner} />
              )}

              {!hiddenStatsSections.includes("comment-medals") && (
                <CommentMedals commentCount={commentCount} isOwner={isOwner} />
              )}

              {!hiddenStatsSections.includes("reading-charts") && (
                <section className="grid gap-3 md:grid-cols-2">
                  <DonutCard
                    title="Series mix: Manga vs Novel"
                    mangaValue={mangaCount}
                    novelValue={novelCount}
                    centerValue={progress.length.toLocaleString()}
                    centerLabel="series"
                    mangaDetail={`${mangaCount.toLocaleString()} (${progress.length ? Math.round((mangaCount / progress.length) * 100) : 0}%)`}
                    novelDetail={`${novelCount.toLocaleString()} (${progress.length ? Math.round((novelCount / progress.length) * 100) : 0}%)`}
                  />
                  <DonutCard
                    title="Reading progress by format"
                    mangaValue={mangaProgressTotal}
                    novelValue={novelProgressTotal}
                    centerValue={averageProgress === null ? "—" : `${averageProgress}%`}
                    centerLabel="average"
                    mangaDetail={mangaAverage === null ? "— average" : `${mangaAverage}% average`}
                    novelDetail={novelAverage === null ? "— average" : `${novelAverage}% average`}
                  />
                </section>
              )}

              {!hiddenStatsSections.includes("reading-activity") && (
                <section className="rounded-3xl border border-black/10 bg-white/80 p-4 shadow-lg shadow-slate-900/5 backdrop-blur-sm dark:border-white/10 dark:bg-[#15151d]/85 dark:shadow-black/10 sm:p-6">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Reading activity</h2>
                      <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">Chapter opens and saved history · last 7 days (UTC)</p>
                    </div>
                    <p className="text-sm font-semibold text-[var(--mikoroku-accent)]">{totalWeeklyChapters} chapter opens</p>
                  </div>
                  <div className="mt-6 grid grid-cols-7 gap-2 sm:gap-4">
                    {activity.map((day) => {
                      const height = day.chapters
                        ? Math.max(8, (day.chapters / maxActivity) * 100)
                        : 3;
                      const intensity = day.chapters && maxActivity > 1
                        ? (day.chapters - 1) / (maxActivity - 1)
                        : day.chapters ? 0 : null;
                      const color = intensity === null
                        ? undefined
                        : intensity <= 0.5
                          ? `rgb(${Math.round(34 + (234 - 34) * (intensity * 2))} ${Math.round(197 + (179 - 197) * (intensity * 2))} ${Math.round(94 + (8 - 94) * (intensity * 2))})`
                          : `rgb(${Math.round(234 + (239 - 234) * ((intensity - 0.5) * 2))} ${Math.round(179 + (68 - 179) * ((intensity - 0.5) * 2))} ${Math.round(8 + (68 - 8) * ((intensity - 0.5) * 2))})`;
                      return (
                        <div key={day.date} className="flex min-w-0 flex-col items-center gap-2" title={`${day.date}: ${day.chapters} chapters`}>
                          <span className="h-4 text-xs font-semibold text-slate-700 dark:text-zinc-300">
                            {day.chapters ? day.chapters : ""}
                          </span>
                          <div className="flex h-32 w-full items-end rounded-t-lg border-b border-black/10 bg-slate-100/70 px-1 dark:border-white/10 dark:bg-black/15">
                            <div
                              className={`w-full rounded-t-md transition-[height] ${day.chapters ? "shadow-[0_0_16px_color-mix(in_srgb,var(--mikoroku-accent)_20%,transparent)]" : "bg-slate-300 dark:bg-white/10"}`}
                              style={{
                                height: `${height}%`,
                                ...(color ? { backgroundColor: color } : {}),
                              }}
                              role="img"
                              aria-label={`${day.chapters} chapters`}
                            />
                          </div>
                          <span className="truncate text-[10px] text-slate-500 dark:text-zinc-500 sm:text-xs">
                            {getActivityDayLabel(day.date)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {!hiddenStatsSections.includes("reading-progress") && (
                <section className="rounded-3xl border border-black/10 bg-white/80 p-4 shadow-lg shadow-slate-900/5 backdrop-blur-sm dark:border-white/10 dark:bg-[#15151d]/85 dark:shadow-black/10 sm:p-6">
                  <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Reading progress</h2>
                      <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">Latest saved chapter, chapter progress, and estimated series progress</p>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-zinc-500">
                      Showing {visibleProgress.length} of {progress.length} series
                    </span>
                  </div>
                  {progress.length ? (
                    <>
                      <div className="grid gap-3 md:grid-cols-2">
                        {visibleProgress.map((item) => (
                          <ProgressCard key={`${item.kind}:${item.slug}`} item={item} />
                        ))}
                      </div>
                      {visibleProgress.length < progress.length && (
                        <button
                          type="button"
                          onClick={() => setVisibleProgressCount((count) => Math.min(count + 10, progress.length))}
                          className="mt-4 w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-black/5 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/5"
                        >
                          Load more series
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-black/20 px-5 py-10 text-center dark:border-white/15">
                      <p className="font-semibold text-slate-800 dark:text-zinc-200">No saved reading progress yet</p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-zinc-500">Progress and activity charts will appear as the user reads while signed in.</p>
                      <a href="/manga-list" className="mt-4 inline-flex rounded-xl bg-[var(--mikoroku-accent-surface)] px-4 py-2 text-sm font-semibold text-[var(--mikoroku-accent-foreground)] transition hover:opacity-90">
                        Explore manga
                      </a>
                    </div>
                  )}
                  {progress.length > 0 && (
                    <p className="mt-4 text-[11px] text-slate-500 dark:text-zinc-500">
                      Series progress is calculated from the chapter list available while reading. Older history without chapter-list data shows chapter progress only.
                    </p>
                  )}
                </section>
              )}

              {!hiddenStatsSections.includes("comment-history") && (
                <CommentHistorySection
                  key={uid}
                  comments={stats.commentHistory}
                  error={stats.commentHistoryError}
                  limitReached={stats.commentHistoryLimitReached}
                />
              )}
            </>
          )}
            </>
          )}
        </div>
      </main>
      {isOwner && statsSettingsOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-2 backdrop-blur-md sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setStatsSettingsOpen(false);
          }}
        >
          <div
            ref={statsSettingsDialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="stats-settings-title"
            className="flex max-h-[70dvh] w-[86vw] max-w-[22rem] flex-col overflow-hidden rounded-xl border border-black/10 bg-white shadow-2xl outline-none dark:border-white/15 dark:bg-[#15151d] sm:max-h-[85vh] sm:w-full sm:max-w-md sm:rounded-2xl"
          >
            <div className="flex items-start justify-between gap-2 border-b border-black/10 px-3 py-2.5 dark:border-white/10 sm:gap-3 sm:px-4 sm:py-3">
              <div>
                <h2 id="stats-settings-title" className="text-sm font-bold text-slate-900 dark:text-white sm:text-base">
                  Stats Settings
                </h2>
                <p className="mt-1 text-[10px] text-slate-500 dark:text-zinc-400 sm:text-[11px]">
                  Manage your banner and choose which stats visitors can see.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStatsSettingsOpen(false)}
                aria-label="Close stats settings"
                className="grid size-7 shrink-0 place-items-center rounded-md border border-black/10 text-slate-600 transition hover:bg-black/5 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5 sm:size-8 sm:rounded-lg"
              >
                <span aria-hidden="true" className="text-base leading-none sm:text-lg">×</span>
              </button>
            </div>

            <div className="overflow-y-auto px-3 py-3 sm:px-4 sm:py-4">
              <section className="rounded-lg border border-black/10 bg-slate-50 p-2.5 dark:border-white/10 dark:bg-white/[0.035] sm:rounded-xl sm:p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-2.5">
                  <div>
                    <h3 className="text-[11px] font-bold text-slate-900 dark:text-white sm:text-xs">Profile banner</h3>
                    <p className="mt-1 text-[10px] text-slate-500 dark:text-zinc-400 sm:text-[11px]">
                      {profileBanner ? "A banner is currently set." : "No banner has been added."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => bannerInputRef.current?.click()}
                    disabled={bannerUploading}
                    className="inline-flex items-center gap-1 rounded-md bg-[var(--mikoroku-accent)] px-2.5 py-1.5 text-[10px] font-bold text-white transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70 sm:gap-1.5 sm:rounded-lg sm:px-3 sm:py-2 sm:text-[11px]"
                  >
                    {bannerUploading && (
                      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-3 animate-spin sm:size-3.5">
                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
                        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
                      </svg>
                    )}
                    {bannerUploading ? bannerUploadStage || "Uploading..." : profileBanner ? "Change banner" : "Add banner"}
                  </button>
                </div>
                {bannerError && (
                  <p role="alert" className="mt-3 rounded-lg bg-red-100 px-3 py-2 text-xs text-red-800 dark:bg-red-950/70 dark:text-red-100">
                    {bannerError}
                  </p>
                )}
                {bannerSyncPending && (
                  <p role="status" aria-live="polite" className="mt-3 rounded-lg bg-amber-100 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
                    Banner saved on this device. Syncing in the background when Firestore is available.
                  </p>
                )}
              </section>

              <section className="mt-3 sm:mt-4">
                <h3 className="text-[11px] font-bold text-slate-900 dark:text-white sm:text-xs">Public stats visibility</h3>
                <p className="mt-1 text-[10px] leading-[1.35] text-slate-500 dark:text-zinc-400 sm:text-[11px] sm:leading-4">
                  Select sections to hide from everyone. Your profile header and banner remain visible.
                </p>
                <div className="mt-2 space-y-1 sm:mt-2.5 sm:space-y-1.5">
                  {statsSectionSettings.map((section) => {
                    const hidden = hiddenStatsDraft.includes(section.id);
                    return (
                      <label
                        key={section.id}
                        className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-black/10 bg-white px-2.5 py-1.5 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.025] dark:hover:bg-white/[0.05] sm:gap-3 sm:rounded-xl sm:px-3 sm:py-2"
                      >
                        <span className="min-w-0">
                          <span className="block text-[11px] font-semibold text-slate-800 dark:text-zinc-100 sm:text-xs">
                            {section.label}
                          </span>
                          <span className="mt-0.5 block text-[10px] leading-[1.3] text-slate-500 dark:text-zinc-400 sm:text-[11px] sm:leading-4">
                            {section.description}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                          <span className="text-[8px] font-semibold text-slate-500 dark:text-zinc-400 sm:text-[9px]">
                            {hidden ? "Hidden" : "Visible"}
                          </span>
                          <input
                            type="checkbox"
                            checked={hidden}
                            onChange={(event) => {
                              setHiddenStatsDraft((current) => event.target.checked
                                ? [...current, section.id]
                                : current.filter((id) => id !== section.id));
                            }}
                            aria-label={`Hide ${section.label} from public stats`}
                            className="size-3 accent-[var(--mikoroku-accent)] sm:size-3.5"
                          />
                        </span>
                      </label>
                    );
                  })}
                </div>
              </section>

              {statsSettingsError && (
                <p role="alert" className="mt-3 rounded-lg bg-red-100 px-3 py-2 text-[10px] text-red-800 dark:bg-red-950/70 dark:text-red-100 sm:text-[11px]">
                  {statsSettingsError}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-black/10 px-3 py-2.5 dark:border-white/10 sm:px-4 sm:py-3">
              <button
                type="button"
                onClick={() => setStatsSettingsOpen(false)}
                className="rounded-md border border-black/10 px-2.5 py-1.5 text-[10px] font-semibold text-slate-700 transition hover:bg-black/5 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/5 sm:rounded-lg sm:px-3 sm:py-2 sm:text-[11px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveStatsSettings()}
                className="rounded-md bg-[var(--mikoroku-accent)] px-2.5 py-1.5 text-[10px] font-bold text-white transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70 sm:rounded-lg sm:px-3 sm:py-2 sm:text-[11px]"
              >
                Save settings
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
