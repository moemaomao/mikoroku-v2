"use client";

import { useEffect, useState } from "react";
import {
  loadPublicReadingStats,
  type PublicReadingStats,
  type ReadingProgressItem,
} from "../../lib/reading-stats";
import SiteChrome from "../site-chrome";
import { CoverImage } from "../lib/cover-image";
import { isNsfwManga } from "../lib/nsfw";

type MedalSymbol = "spark" | "book" | "flame" | "crown" | "laurel" | "comet" | "gem";

const readingMedals: Array<{
  chapters: number;
  name: string;
  description: string;
  color: string;
  symbol: MedalSymbol;
}> = [
  { chapters: 10, name: "First Spark", description: "Started the reading journey", color: "#b7791f", symbol: "spark" },
  { chapters: 25, name: "Page Scout", description: "Explored the first stories", color: "#64748b", symbol: "book" },
  { chapters: 50, name: "Story Seeker", description: "Kept turning the pages", color: "#c2410c", symbol: "flame" },
  { chapters: 100, name: "Chapter Champion", description: "Reached a century of chapters", color: "#2563eb", symbol: "crown" },
  { chapters: 250, name: "Lore Keeper", description: "Collected stories across series", color: "#7c3aed", symbol: "laurel" },
  { chapters: 500, name: "Story Sage", description: "A seasoned reader", color: "#c026d3", symbol: "comet" },
  { chapters: 1000, name: "Eternal Reader", description: "Master of a thousand chapters", color: "#d97706", symbol: "gem" },
];

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
}

function formatUpdatedAt(timestamp: number): string {
  if (!timestamp) return "Recently read";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(timestamp);
}

function getActivityDayLabel(date: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function StatsCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: string;
}) {
  return (
    <article className="rounded-2xl border border-black/10 bg-white/80 p-4 shadow-lg shadow-slate-900/5 backdrop-blur-sm dark:border-white/10 dark:bg-[#15151d]/85 dark:shadow-black/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-zinc-400">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">{detail}</p>
        </div>
        <span aria-hidden="true" className="grid size-9 place-items-center rounded-xl bg-[var(--mikoroku-accent-soft)] text-lg text-[var(--mikoroku-accent)]">
          {icon}
        </span>
      </div>
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
    </svg>
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

  return (
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
          return (
            <article
              key={medal.chapters}
              className={`flex min-w-0 items-center gap-3 rounded-2xl border p-3 ${
                unlocked
                  ? "border-[var(--mikoroku-accent-border)] bg-[var(--mikoroku-accent-soft)]"
                  : "border-black/10 bg-slate-50/70 dark:border-white/10 dark:bg-black/10"
              }`}
              aria-label={`${medal.name}, ${medal.chapters} chapters, ${unlocked ? "unlocked" : "locked"}`}
            >
              <MedalLogo symbol={medal.symbol} color={medal.color} locked={!unlocked} />
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-slate-900 dark:text-white">{medal.name}</p>
                <p className="mt-0.5 text-[10px] text-slate-600 dark:text-zinc-400">{medal.chapters.toLocaleString()} chapters</p>
                <p className={`mt-1 text-[10px] font-semibold ${unlocked ? "text-[var(--mikoroku-accent)]" : "text-slate-500 dark:text-zinc-500"}`}>
                  {unlocked ? "Unlocked" : medal.description}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
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

export default function ReadingStatsPage({ uid }: { uid: string }) {
  const [stats, setStats] = useState<PublicReadingStats | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setError("");
    setStats(null);
    const loadStats = () => loadPublicReadingStats(uid).then((result) => {
      if (active) setStats(result);
    }).catch((loadError: unknown) => {
      console.error("Public reading stats could not be loaded.", loadError);
      if (active) {
        setError(loadError instanceof Error
          ? loadError.message
          : "Reading stats could not be loaded.");
      }
    });
    const onStatsUpdated = () => { void loadStats(); };
    void loadStats();
    window.addEventListener("mikoroku:reading-stats-updated", onStatsUpdated);
    return () => {
      active = false;
      window.removeEventListener("mikoroku:reading-stats-updated", onStatsUpdated);
    };
  }, [retry, uid]);

  const profile = stats?.profile || {};
  const name = stringValue(profile.displayName) || stringValue(profile.username) || "Reader";
  const username = stringValue(profile.username);
  const avatar = stringValue(profile.avatar) || "/assets/icons/favicon.ico";
  const progress = stats?.progress || [];
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
  const points = numberValue(profile.points);

  return (
    <>
      <SiteChrome showFooter={false} />
      <main className="route-page-background min-h-[calc(100vh-3.5rem)] px-3 pb-12 pt-6 text-slate-900 dark:text-zinc-100 sm:px-6">
        <div className="mx-auto max-w-6xl space-y-5">
          <section className="overflow-hidden rounded-3xl border border-black/10 bg-white/80 p-5 shadow-xl shadow-slate-900/10 backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/80 dark:shadow-black/20 sm:p-7">
            <div className="flex flex-wrap items-center gap-4">
              <img
                src={avatar}
                alt=""
                onError={(event) => { event.currentTarget.src = "/assets/icons/favicon.ico"; }}
                className="size-[76px] rounded-2xl border-2 border-[var(--mikoroku-accent)] object-cover shadow-lg sm:size-[92px]"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--mikoroku-accent)]">Reader stats</p>
                <h1 className="mt-1 truncate text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">{name}</h1>
                <p className="mt-1 truncate text-sm text-slate-600 dark:text-zinc-400">
                  {username ? `@${username.replace(/^@/, "")}` : `Reader ID ${uid}`}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-black/10 bg-white/60 px-3 py-1 text-slate-700 dark:border-white/10 dark:bg-black/20 dark:text-zinc-300">
                    Level {level}
                  </span>
                  <span className="rounded-full border border-black/10 bg-white/60 px-3 py-1 text-slate-700 dark:border-white/10 dark:bg-black/20 dark:text-zinc-300">
                    {points.toLocaleString()} pts
                  </span>
                  <span className="rounded-full border border-black/10 bg-white/60 px-3 py-1 text-slate-700 dark:border-white/10 dark:bg-black/20 dark:text-zinc-300">
                    {commentCount.toLocaleString()} comments
                  </span>
                  {typeof profile.reputation === "number" && (
                    <span className="rounded-full border border-black/10 bg-white/60 px-3 py-1 text-slate-700 dark:border-white/10 dark:bg-black/20 dark:text-zinc-300">
                      {numberValue(profile.reputation).toLocaleString()} reputation
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {error && (
            <section role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-400/30 dark:bg-red-950/30 dark:text-red-100">
              <span>Stats gagal dimuat: {error}</span>
              <button
                type="button"
                onClick={() => setRetry((current) => current + 1)}
                className="rounded-lg border border-red-400/50 px-3 py-2 font-semibold transition hover:bg-red-400/10 dark:border-red-300/30"
              >
                Coba lagi
              </button>
            </section>
          )}

          {!stats && !error && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Loading reader stats">
              {Array.from({ length: 7 }, (_, index) => (
                <div key={index} className="h-28 animate-pulse rounded-2xl border border-black/10 bg-white/70 dark:border-white/10 dark:bg-white/[0.04]" />
              ))}
            </div>
          )}

          {stats && (
            <>
              <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatsCard label="Series tracked" value={progress.length.toLocaleString()} detail="Manga and novels with saved progress" icon="▤" />
                <StatsCard label="Chapters read" value={stats.totalChaptersRead.toLocaleString()} detail="Lifetime total across all series" icon="▣" />
                <StatsCard label="Bookmarks" value={stats.bookmarksCount === null ? "—" : stats.bookmarksCount.toLocaleString()} detail={stats.bookmarksCount === null ? "Not publicly available" : "Saved series"} icon="☆" />
                <StatsCard label="Progress" value={averageProgress === null ? "—" : `${averageProgress}%`} detail={`${knownSeriesProgress.length} series with chapter data`} icon="◔" />
                <StatsCard label="Chapter opens" value={totalWeeklyChapters.toLocaleString()} detail={`${activeDays} active days in the last 7`} icon="↗" />
                <StatsCard label="Manga" value={mangaCount.toLocaleString()} detail="Series with reading progress" icon="▣" />
                <StatsCard label="Novels" value={novelCount.toLocaleString()} detail="Series with reading progress" icon="▥" />
                <StatsCard label="Sources" value={sourceCount.toLocaleString()} detail="Different chapter sources used" icon="⌘" />
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
                  <span className="text-xs text-slate-500 dark:text-zinc-500">{progress.length} series</span>
                </div>
                {progress.length ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {progress.map((item) => (
                      <ProgressCard key={`${item.kind}:${item.slug}`} item={item} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-black/20 px-5 py-10 text-center dark:border-white/15">
                    <p className="font-semibold text-slate-800 dark:text-zinc-200">Belum ada progres tersimpan</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-zinc-500">Progres dan grafik aktivitas akan terisi saat pengguna membaca sambil login.</p>
                    <a href="/manga-list" className="mt-4 inline-flex rounded-xl bg-[var(--mikoroku-accent-surface)] px-4 py-2 text-sm font-semibold text-[var(--mikoroku-accent-foreground)] transition hover:opacity-90">
                      Jelajahi manga
                    </a>
                  </div>
                )}
                {progress.length > 0 && (
                  <p className="mt-4 text-[11px] text-slate-500 dark:text-zinc-500">
                    Progres seri dihitung dari daftar chapter saat dibaca. History lama tanpa data daftar chapter menampilkan progres chapter saja.
                  </p>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </>
  );
}
