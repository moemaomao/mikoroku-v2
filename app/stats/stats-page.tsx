"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import "./stats-animations.css";
import {
  loadPublicReadingStats,
  type CommentHistoryItem,
  type PublicReadingStats,
  type ReadingProgressItem,
} from "../../lib/reading-stats";
import {
  getCachedReadingStats,
  setCachedReadingStats,
  getUnlockedMedals,
  setUnlockedMedals,
} from "../lib/reading-stats-cache";
import SiteChrome from "../site-chrome";
import { CoverImage } from "../lib/cover-image";
import { isNsfwManga } from "../lib/nsfw";

type MedalSymbol = "spark" | "book" | "flame" | "crown" | "laurel" | "comet" | "gem" | "infinity";

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
  firebase?: ProfileBannerFirebase;
};

const IMGBB_API_KEY = "751e8d146b32b8a00499aef04f568e30";

const readingMedals: Array<{
  chapters: number;
  name: string;
  description: string;
  color: string;
  gradient: string;
  symbol: MedalSymbol;
  unlockMessage: string;
}> = [
  {
    chapters: 10,
    name: "First Spark",
    description: "Started the reading journey",
    color: "#b7791f",
    gradient: "linear-gradient(135deg, #fef3c7 0%, #fde68a 40%, #f59e0b 100%)",
    symbol: "spark",
    unlockMessage: "The journey begins. Keep turning those pages!",
  },
  {
    chapters: 25,
    name: "Page Scout",
    description: "Explored the first stories",
    color: "#64748b",
    gradient: "linear-gradient(135deg, #e2e8f0 0%, #94a3b8 45%, #64748b 100%)",
    symbol: "book",
    unlockMessage: "You're officially exploring the library.",
  },
  {
    chapters: 50,
    name: "Story Seeker",
    description: "Kept turning the pages",
    color: "#c2410c",
    gradient: "linear-gradient(135deg, #ffedd5 0%, #fdba74 40%, #ea580c 100%)",
    symbol: "flame",
    unlockMessage: "Stories are calling. You're answering.",
  },
  {
    chapters: 100,
    name: "Chapter Champion",
    description: "Reached a century of chapters",
    color: "#2563eb",
    gradient: "linear-gradient(135deg, #dbeafe 0%, #60a5fa 40%, #2563eb 100%)",
    symbol: "crown",
    unlockMessage: "100 chapters! True champion energy.",
  },
  {
    chapters: 250,
    name: "Lore Keeper",
    description: "Collected stories across series",
    color: "#7c3aed",
    gradient: "linear-gradient(135deg, #ede9fe 0%, #a78bfa 40%, #7c3aed 100%)",
    symbol: "laurel",
    unlockMessage: "Lore is safe with you. Keep collecting.",
  },
  {
    chapters: 500,
    name: "Story Sage",
    description: "A seasoned reader",
    color: "#c026d3",
    gradient: "linear-gradient(135deg, #fae8ff 0%, #e879f9 35%, #c026d3 70%, #86198f 100%)",
    symbol: "comet",
    unlockMessage: "Seasoned. Wise. Still hungry for more.",
  },
  {
    chapters: 1000,
    name: "Eternal Reader",
    description: "Master of a thousand chapters",
    color: "#d97706",
    gradient: "linear-gradient(135deg, #fef3c7 0%, #fbbf24 30%, #f59e0b 55%, #ea580c 80%, #c2410c 100%)",
    symbol: "gem",
    unlockMessage: "A thousand chapters. You are legend.",
  },
  {
    chapters: 1500,
    name: "Infinity Archive",
    description: "Beyond the final page",
    color: "#06b6d4",
    gradient: "linear-gradient(135deg, #a5f3fc 0%, #22d3ee 20%, #a78bfa 45%, #f472b6 70%, #fbbf24 100%)",
    symbol: "infinity",
    unlockMessage: "1500 chapters. The archive has no end — and neither do you.",
  },
];

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

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
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

async function uploadProfileBanner(file: File): Promise<string> {
  const compressedImage = await compressProfileBanner(file);
  const formData = new FormData();
  formData.append("image", compressedImage, "profile-banner.webp");
  const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: "POST",
    body: formData,
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

function MedalLogo({ symbol, color, locked = false }: {
  symbol: MedalSymbol;
  color: string;
  locked?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 48 64"
      aria-hidden="true"
      className={`size-12 transition ${locked ? "grayscale opacity-40" : "drop-shadow-sm"}`}
    >
      <path d="m15 38-3 21 12-7 12 7-3-21" fill={color} opacity=".78" />
      <circle cx="24" cy="24" r="20" fill={color} />
      <circle cx="24" cy="24" r="16" fill="none" stroke="white" strokeOpacity=".65" strokeWidth="1.5" />
      {symbol === "spark" && (
        <path d="m24 12 3.2 7.1 7.8.8-5.8 5.2 1.6 7.6-6.8-3.9-6.8 3.9 1.6-7.6-5.8-5.2 7.8-.8L24 12Z" fill="white" />
      )}
      {symbol === "book" && (
        <path d="M13 16.5c4.2-.8 7.9.2 11 2.4v15c-3.1-2.2-6.8-3.2-11-2.4v-15Zm22 0c-4.2-.8-7.9.2-11 2.4v15c3.1-2.2 6.8-3.2 11-2.4v-15Z" fill="white" stroke={color} strokeLinejoin="round" strokeWidth="1.4" />
      )}
      {symbol === "flame" && (
        <path d="M25 11c2.2 7-3.5 8.5-.8 13.2 1.1 1.9 3.1 2.5 4.5 1 .8-.9 1.1-2.1.7-3.5 4.6 3.1 7.1 7.4 5.2 12.2a11.2 11.2 0 0 1-21.1-1.6c-1.3-5.6 2.5-10.4 6.9-14.2-.3 4.6.4 6.2 2.1 6.1 2.1-.1 2.4-3.5 2.5-13.2Z" fill="white" />
      )}
      {symbol === "crown" && (
        <path d="m12 18 7 5 5-10 5 10 7-5-2.7 16H14.7L12 18Zm3 19h18v2H15v-2Z" fill="white" stroke={color} strokeLinejoin="round" strokeWidth="1.2" />
      )}
      {symbol === "laurel" && (
        <g fill="none" stroke="white" strokeLinecap="round" strokeWidth="2">
          <path d="M17 33c-5-5-5-12-2-17 5 3 7 7 6 12m10 5c5-5 5-12 2-17-5 3-7 7-6 12M18 29l-4-1m6-4-3-3m11 8 4-1m-6-4 3-3M20 35c2 2 6 2 8 0" />
        </g>
      )}
      {symbol === "comet" && (
        <path d="m28 12 2.3 7.7L38 22l-7.7 2.3L28 32l-2.3-7.7L18 22l7.7-2.3L28 12Zm-10 14 1.5 4.5L24 32l-4.5 1.5L18 38l-1.5-4.5L12 32l4.5-1.5L18 26Zm17-14 1.1 3.4L39 16.5l-3.9 1.1L34 21l-1.1-3.4-3.4-1.1 3.4-1.1L34 12Z" fill="white" />
      )}
      {symbol === "gem" && (
        <path d="m15 17 5-4h8l5 4-9 19-9-19Zm0 0h18m-13-4 4 23m8-23-4 23m-9-19 9 19 9-19" fill="none" stroke="white" strokeLinejoin="round" strokeWidth="1.8" />
      )}
      {symbol === "infinity" && (
        <path
          d="M12 24c0-4 3.2-7 7-7 2.6 0 4.6 1.3 6 3.2C26.4 18.3 28.4 17 31 17c3.8 0 7 3 7 7s-3.2 7-7 7c-2.6 0-4.6-1.3-6-3.2C23.6 29.7 21.6 31 19 31c-3.8 0-7-3-7-7Zm7-4.5c-2.4 0-4.2 1.9-4.2 4.5s1.8 4.5 4.2 4.5c1.6 0 2.9-.8 3.9-2.3l.6-.9.6.9c1 1.5 2.3 2.3 3.9 2.3 2.4 0 4.2-1.9 4.2-4.5s-1.8-4.5-4.2-4.5c-1.6 0-2.9.8-3.9 2.3l-.6.9-.6-.9c-1-1.5-2.3-2.3-3.9-2.3Z"
          fill="white"
        />
      )}
    </svg>
  );
}
function MedalUnlockModal({
  medal,
  onClose,
}: {
  medal: (typeof readingMedals)[number];
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [entered, setEntered] = useState(false);
  const medalThemeStyle: CSSProperties & { "--stats-medal-color": string } = {
    "--stats-medal-color": medal.color,
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    dialogRef.current?.focus();
    // entrance animation
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
    >
      <div
        className="stats-medal-backdrop absolute inset-0 transition-opacity duration-300"
        style={{ ...medalThemeStyle, opacity: entered ? 1 : 0 }}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        tabIndex={-1}
        className="stats-gradient-card stats-medal-modal relative z-10 w-full max-w-sm overflow-hidden rounded-3xl border border-black/10 shadow-2xl outline-none transition-opacity duration-300 dark:border-white/15"
        style={{
          ...medalThemeStyle,
          boxShadow: `0 0 0 1px ${medal.color}44, 0 0 80px ${medal.color}33, 0 25px 50px -12px rgba(0,0,0,.35)`,
          opacity: entered ? 1 : 0,
        }}
      >
        <div
          className="relative aspect-[5/4] w-full overflow-hidden"
          style={medalThemeStyle}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="stats-gradient-card relative rounded-full p-2"
              style={{
                ...medalThemeStyle,
                background: `linear-gradient(145deg, ${medal.color}aa, ${medal.color}44)`,
                boxShadow: `0 0 40px ${medal.color}88, 0 8px 24px rgba(0,0,0,.35)`,
              }}
            >
                <div className="rounded-full bg-white/90 p-2 dark:bg-[#12121a]/90">
                  <MedalLogo symbol={medal.symbol} color={medal.color} />
                </div>
            </div>
          </div>

        </div>

        {/* Content */}
        <div className="relative px-6 pb-6 pt-1 text-center">
          <p
            className="text-[11px] font-bold uppercase tracking-[0.22em]"
            style={{ color: medal.color }}
          >
            Medal Unlocked
          </p>
          <h2
            id="medal-unlock-title"
            className="mt-2 text-2xl font-bold text-slate-900 dark:text-white"
            style={{ textShadow: `0 0 28px ${medal.color}66` }}
          >
            {medal.name}
          </h2>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-zinc-400">
            {medal.chapters.toLocaleString()} chapters
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-zinc-300">
            {medal.unlockMessage}
          </p>

          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full rounded-xl px-4 py-3 text-sm font-bold text-white transition hover:brightness-110 active:scale-[0.98]"
            style={{
              background: `linear-gradient(135deg, ${medal.color}, ${medal.color}cc)`,
              boxShadow: `0 8px 24px ${medal.color}44`,
            }}
          >
            Nice!
          </button>
        </div>
      </div>

    </div>
  );
}

function ReadingMedals({ totalChaptersRead }: { totalChaptersRead: number }) {
  const unlockedCount = readingMedals.filter((medal) => totalChaptersRead >= medal.chapters).length;
  const nextMedal = readingMedals.find((medal) => totalChaptersRead < medal.chapters);
  const previousMilestone = nextMedal
    ? readingMedals[readingMedals.indexOf(nextMedal) - 1]?.chapters || 0
    : 0;
  const progressToNext = nextMedal
    ? Math.max(0, Math.min(100, ((totalChaptersRead - previousMilestone) / (nextMedal.chapters - previousMilestone)) * 100))
    : 100;

  const [queue, setQueue] = useState<Array<(typeof readingMedals)[number]>>([]);
  const [current, setCurrent] = useState<(typeof readingMedals)[number] | null>(null);

  useEffect(() => {
    if (totalChaptersRead <= 0) return;
    let cancelled = false;
    void (async () => {
      const newly = await detectNewMedalUnlocks(totalChaptersRead);
      if (cancelled || newly.length === 0) return;
      const sorted = [...newly].sort((a, b) => b.chapters - a.chapters);
      setQueue((prev) => [...prev, ...sorted]);
    })();
    return () => {
      cancelled = true;
    };
  }, [totalChaptersRead]);

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
              {totalChaptersRead.toLocaleString()} chapters read across manga and novels
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
              <span>{Math.max(0, nextMedal.chapters - totalChaptersRead).toLocaleString()} to go</span>
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
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {readingMedals.map((medal) => {
            const unlocked = totalChaptersRead >= medal.chapters;
            const medalTileStyle: CSSProperties & { "--stats-medal-color": string } = {
              "--stats-medal-color": medal.color,
              background: medal.gradient,
            };
            return (
              <article
                key={medal.chapters}
                role={unlocked ? "button" : undefined}
                tabIndex={unlocked ? 0 : undefined}
                onClick={() => {
                  if (unlocked) setCurrent(medal);
                }}
                onKeyDown={(event) => {
                  if (!unlocked) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setCurrent(medal);
                  }
                }}
                className={`flex min-w-0 items-center gap-3 rounded-2xl border p-3 transition ${
                  unlocked
                    ? "stats-gradient-card cursor-pointer border-black/10 shadow-md hover:brightness-105 hover:shadow-lg active:scale-[0.98] dark:border-white/15"
                    : "border-black/10 bg-slate-100/80 dark:border-white/10 dark:bg-black/20"
                }`}
                style={unlocked ? medalTileStyle : undefined}
                aria-label={`${medal.name}, ${medal.chapters} chapters, ${unlocked ? "unlocked, click to view celebration" : "locked"}`}
                title={unlocked ? "Click to view celebration" : undefined}
              >
                <MedalLogo symbol={medal.symbol} color={medal.color} locked={!unlocked} />
                <div className="min-w-0">
                  <p className={`truncate text-xs font-bold ${unlocked ? "text-slate-900 drop-shadow-sm" : "text-slate-900 dark:text-white"}`}>
                    {medal.name}
                  </p>
                  <p className={`mt-0.5 text-[10px] ${unlocked ? "text-slate-800/80" : "text-slate-600 dark:text-zinc-400"}`}>
                    {medal.chapters.toLocaleString()} chapters
                  </p>
                  <p className={`mt-1 text-[10px] font-semibold ${unlocked ? "text-slate-900/90" : "text-slate-500 dark:text-zinc-500"}`}>
                    {unlocked ? "Unlocked · view" : medal.description}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
      {current && <MedalUnlockModal medal={current} onClose={() => setCurrent(null)} />}
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
    <article className="rounded-3xl border border-black/10 bg-white/80 p-4 shadow-lg shadow-slate-900/5 backdrop-blur-sm dark:border-white/10 dark:bg-[#15151d]/85 dark:shadow-black/10 sm:p-5">
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
  const hasSeriesProgress = item.chapterCount > 0 && item.chapterPosition > 0;
  const progress = hasSeriesProgress ? item.seriesProgress : item.chapterProgress;
  const chapterPosition = hasSeriesProgress
    ? `${item.chapterPosition} / ${item.chapterCount} chapters`
    : `Chapter ${item.chapter || "—"}`;
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
        <p className="mt-1 truncate text-xs text-slate-600 dark:text-zinc-400">{item.chapterTitle || `Chapter ${item.chapter || "—"}`}</p>
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
}: {
  comments: CommentHistoryItem[];
  error: string;
}) {
  const [visibleCount, setVisibleCount] = useState(10);
  const visibleComments = comments.slice(0, visibleCount);

  return (
    <section className="rounded-3xl border border-black/10 bg-white/80 p-4 shadow-lg shadow-slate-900/5 backdrop-blur-sm dark:border-white/10 dark:bg-[#15151d]/85 dark:shadow-black/10 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Comment history</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
            Showing {visibleComments.length} of {comments.length} comments · newest first
          </p>
        </div>
      </div>
      {error ? (
        <p role="status" className="mt-4 rounded-xl border border-amber-300/50 bg-amber-100/70 p-3 text-sm text-amber-900 dark:border-amber-300/20 dark:bg-amber-950/30 dark:text-amber-100">
          Comment history could not be loaded: {error}
        </p>
      ) : comments.length ? (
        <div className="mt-4 space-y-3">
          {visibleComments.map((comment) => (
            <article
              key={`${comment.threadUrl}:${comment.id}`}
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
              {comment.threadUrl && (
                <a
                  href={comment.threadUrl}
                  className="mt-3 inline-flex text-xs font-semibold text-[var(--mikoroku-accent)] underline-offset-4 hover:underline"
                >
                  {comment.linkTitle}
                </a>
              )}
            </article>
          ))}
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

export default function ReadingStatsPage({ uid }: { uid: string }) {
  const [stats, setStats] = useState<PublicReadingStats | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [visibleProgressCount, setVisibleProgressCount] = useState(10);
  const [isOwner, setIsOwner] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerError, setBannerError] = useState("");
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    setVisibleProgressCount(10);
    setError("");

    const applyFresh = async (forceNetwork = false) => {
      try {
        const result = await loadPublicReadingStats(uid);
        if (!active) return;
        setStats(result);
        setError("");
        void setCachedReadingStats(uid, result);
      } catch (loadError: unknown) {
        console.error("Public reading stats could not be loaded.", loadError);
        if (!active) return;
        // Keep showing cache if we already have it; only surface error when empty
        setStats((current) => {
          if (current) return current;
          setError(loadError instanceof Error
            ? loadError.message
            : "Reading stats could not be loaded.");
          return current;
        });
      }
    };

    const loadStats = async () => {
      // 1) paint from IndexedDB immediately
      const cached = await getCachedReadingStats(uid);
      if (!active) return;
      if (cached?.data) {
        setStats(cached.data);
      } else {
        setStats(null);
      }
      // 2) always revalidate from network
      await applyFresh();
    };

    const onStatsUpdated = () => { void applyFresh(true); };
    void loadStats();
    window.addEventListener("mikoroku:reading-stats-updated", onStatsUpdated);
    return () => {
      active = false;
      window.removeEventListener("mikoroku:reading-stats-updated", onStatsUpdated);
    };
  }, [retry, uid]);

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
      const firestore = firebase?.firestore?.();
      if (!user || user.uid !== uid || !firestore) {
        throw new Error("Sign in as the profile owner to upload a banner.");
      }

      const imageUrl = await uploadProfileBanner(file);
      if (firebase.auth?.().currentUser?.uid !== uid) {
        throw new Error("The signed-in account changed before the banner was saved. Please try again.");
      }
      await firestore.collection("userStats").doc(uid).set({ profileBanner: imageUrl }, { merge: true });
      setStats((current) => current
        ? { ...current, profile: { ...current.profile, profileBanner: imageUrl } }
        : current);
      setBannerError("");
      window.dispatchEvent(new Event("mikoroku:reading-stats-updated"));
    } catch (uploadError) {
      console.error("Profile banner upload failed.", uploadError);
      setBannerError(uploadError instanceof Error
        ? uploadError.message
        : "Banner upload failed. Please try again.");
    } finally {
      setBannerUploading(false);
      if (bannerInputRef.current) bannerInputRef.current.value = "";
    }
  }

  const profile = stats?.profile || {};
  const name = stringValue(profile.displayName) || stringValue(profile.username) || "Reader";
  const username = stringValue(profile.username);
  const avatar = stringValue(profile.avatar) || "/assets/icons/favicon.ico";
  const profileBanner = stringValue(profile.profileBanner);
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
  const mangaWithSeriesProgress = mangaProgress.filter((item) => item.chapterCount > 0 && item.chapterPosition > 0);
  const novelWithSeriesProgress = novelProgress.filter((item) => item.chapterCount > 0 && item.chapterPosition > 0);
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
  const reputationBadgeTone = reputation < 0
    ? "border-rose-200 bg-rose-100/90 text-rose-800 dark:border-rose-300/20 dark:bg-rose-500/15 dark:text-rose-200"
    : "border-emerald-200 bg-emerald-100/90 text-emerald-800 dark:border-emerald-300/20 dark:bg-emerald-500/15 dark:text-emerald-200";

  return (
    <>
      <SiteChrome showFooter={false} />
      <main className="route-page-background min-h-[calc(100vh-3.5rem)] px-3 pb-12 pt-6 text-slate-900 dark:text-zinc-100 sm:px-6">
        <div className="mx-auto max-w-6xl space-y-5">
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
                  onClick={() => bannerInputRef.current?.click()}
                  disabled={bannerUploading}
                  aria-label={bannerUploading ? "Uploading profile banner" : profileBanner ? "Change profile banner" : "Add profile banner"}
                  title={profileBanner ? "Change banner" : "Add banner"}
                  className="absolute right-3 top-3 z-20 grid size-9 place-items-center rounded-lg border border-black/15 bg-white/85 text-slate-800 shadow-sm backdrop-blur transition hover:bg-white disabled:cursor-wait disabled:opacity-70 dark:border-white/20 dark:bg-black/50 dark:text-white dark:hover:bg-black/70"
                >
                  {bannerUploading ? (
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-4 animate-spin">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
                      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
                    </svg>
                  ) : (
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-4">
                      <path d="m16 5 3 3M4 20l4.5-1 11-11a2.12 2.12 0 0 0-3-3l-11 11L4 20Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                    </svg>
                  )}
                </button>
              </>
            )}
            <div className={`relative z-10 flex items-start gap-3 sm:items-center sm:gap-4 ${isOwner ? "pt-9 pr-1 sm:pt-0 sm:pr-24" : ""}`}>
              <img
                src={avatar}
                alt=""
                onError={(event) => { event.currentTarget.src = "/assets/icons/favicon.ico"; }}
                className="size-14 shrink-0 rounded-xl border-2 border-[var(--mikoroku-accent)] object-cover shadow-lg sm:size-[76px] sm:rounded-2xl lg:size-[92px]"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--mikoroku-accent)] sm:text-xs sm:tracking-[0.2em]">Reader stats</p>
                <h1 className="mt-0.5 truncate text-lg font-bold leading-tight text-slate-900 dark:text-white sm:mt-1 sm:text-3xl">{name}</h1>
                <p className="mt-1 truncate text-[11px] text-slate-600 dark:text-zinc-400 sm:text-sm">
                  {username ? `@${username.replace(/^@/, "")}` : `Reader ID ${uid}`}
                </p>
                <div className="mt-2 grid max-w-[360px] grid-cols-2 gap-1.5 text-[10px] sm:mt-3 sm:flex sm:max-w-none sm:flex-wrap sm:gap-2 sm:text-xs">
                  <span className="rounded-lg border border-violet-200 bg-violet-100/90 px-2 py-1.5 font-semibold text-violet-800 dark:border-violet-300/20 dark:bg-violet-500/15 dark:text-violet-200 sm:rounded-full sm:px-3 sm:py-1">
                    Level {level}
                  </span>
                  <span className="rounded-lg border border-amber-200 bg-amber-100/90 px-2 py-1.5 font-semibold text-amber-800 dark:border-amber-300/20 dark:bg-amber-500/15 dark:text-amber-200 sm:rounded-full sm:px-3 sm:py-1">
                    {points.toLocaleString()} pts
                  </span>
                  <span className="rounded-lg border border-sky-200 bg-sky-100/90 px-2 py-1.5 font-semibold text-sky-800 dark:border-sky-300/20 dark:bg-sky-500/15 dark:text-sky-200 sm:rounded-full sm:px-3 sm:py-1">
                    {commentCount.toLocaleString()} comments
                  </span>
                  {typeof profile.reputation === "number" && (
                    <span className={`rounded-lg border px-2 py-1.5 font-semibold sm:rounded-full sm:px-3 sm:py-1 ${reputationBadgeTone}`}>
                      {reputation.toLocaleString()} reputation
                    </span>
                  )}
                </div>
                {customBadges.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:mt-2.5">
                    <span className="mr-0.5 text-[10px] font-semibold text-slate-600 dark:text-zinc-300 sm:text-xs">Badges</span>
                    {customBadges.map((badge) => (
                      <span
                        key={badge}
                        className={`settings-badge-option profile-custom-badge stats-custom-badge badge-${badge}`}
                      >
                        {formatCustomBadgeLabel(badge)}
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
            {isOwner && bannerError && (
              <p role="alert" className="relative z-10 mt-3 rounded-lg bg-red-100/90 px-3 py-2 text-xs text-red-800 dark:bg-red-950/80 dark:text-red-100">
                {bannerError}
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

          {!stats && !error && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Loading reader stats">
              {Array.from({ length: 7 }, (_, index) => (
                <div key={index} className="h-28 rounded-2xl border border-black/10 bg-white/70 dark:border-white/10 dark:bg-white/[0.04]" />
              ))}
            </div>
          )}

          {stats && (
            <>
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

              <ReadingMedals totalChaptersRead={stats.totalChaptersRead} />

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
                              ...(day.chapters ? { backgroundColor: "var(--mikoroku-accent)" } : {}),
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

              <CommentHistorySection
                key={uid}
                comments={stats.commentHistory}
                error={stats.commentHistoryError}
              />
            </>
          )}
        </div>
      </main>
    </>
  );
}
