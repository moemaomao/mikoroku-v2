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
    <article className="rounded-2xl border border-white/10 bg-[#15151d] p-4 shadow-lg shadow-black/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">{label}</p>
          <p className="mt-2 text-2xl font-bold text-white">{value}</p>
          <p className="mt-1 text-xs text-zinc-500">{detail}</p>
        </div>
        <span aria-hidden="true" className="grid size-9 place-items-center rounded-xl bg-rose-500/10 text-lg text-rose-300">
          {icon}
        </span>
      </div>
    </article>
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
    ? `conic-gradient(#fb7185 0 ${mangaShare}%, #a78bfa ${mangaShare}% 100%)`
    : "conic-gradient(#3f3f46 0 100%)";

  return (
    <article className="rounded-3xl border border-white/10 bg-[#15151d] p-4 shadow-lg shadow-black/10 sm:p-5">
      <h2 className="text-sm font-bold text-white">{title}</h2>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-6 sm:justify-between sm:gap-3">
        <div
          className="grid size-32 shrink-0 place-items-center rounded-full p-3"
          style={{ background: chartBackground }}
          role="img"
          aria-label={`${title}: ${mangaValue} manga and ${novelValue} novels`}
        >
          <div className="grid size-full place-content-center rounded-full bg-[#15151d] text-center">
            <span className="text-lg font-bold text-white">{centerValue}</span>
            <span className="text-[10px] text-zinc-500">{centerLabel}</span>
          </div>
        </div>
        <div className="min-w-[140px] flex-1 space-y-3">
          <div className="flex items-start gap-2 text-xs">
            <span aria-hidden="true" className="mt-0.5 size-2.5 shrink-0 rounded-full bg-rose-400" />
            <span className="min-w-0 flex-1 text-zinc-400">Manga</span>
            <span className="text-right font-semibold text-zinc-200">{mangaDetail}</span>
          </div>
          <div className="flex items-start gap-2 text-xs">
            <span aria-hidden="true" className="mt-0.5 size-2.5 shrink-0 rounded-full bg-violet-400" />
            <span className="min-w-0 flex-1 text-zinc-400">Novels</span>
            <span className="text-right font-semibold text-zinc-200">{novelDetail}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

function ProgressCard({ item }: { item: ReadingProgressItem }) {
  const progress = item.seriesProgress;
  const chapterPosition = item.chapterCount > 0
    ? `${item.chapterPosition} / ${item.chapterCount} chapters`
    : `Chapter ${item.chapter || "—"}`;
  const href = item.chapter
    ? `/${item.kind}/${encodeURIComponent(item.slug)}/${encodeURIComponent(item.chapter)}`
    : `/${item.kind}/${encodeURIComponent(item.slug)}`;

  return (
    <article className="flex min-w-0 gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3 sm:gap-4 sm:p-4">
      <CoverImage
        src={item.cover || "/assets/icons/favicon.ico"}
        alt=""
        nsfw={isNsfwManga(item.slug, item.title)}
        className="h-[92px] w-[66px] shrink-0 rounded-lg border border-white/10 object-cover"
      />
      <div className="min-w-0 flex-1">
        <a
          href={href}
          className="line-clamp-2 text-sm font-bold text-zinc-100 decoration-rose-300 underline-offset-4 hover:text-rose-200 hover:underline"
        >
          {item.title}
        </a>
        <p className="mt-1 truncate text-xs text-zinc-400">{item.chapterTitle || `Chapter ${item.chapter || "—"}`}</p>
        <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-zinc-500">
          <span>{chapterPosition}</span>
          <span>{progress}%</span>
        </div>
        <div
          className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-label={`${item.title} reading progress`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-rose-600 to-amber-300 transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-1.5 text-[10px] text-zinc-500">Updated {formatUpdatedAt(item.updatedAt)}</p>
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
    void loadPublicReadingStats(uid).then((result) => {
      if (active) setStats(result);
    }).catch((loadError: unknown) => {
      console.error("Public reading stats could not be loaded.", loadError);
      if (active) {
        setError(loadError instanceof Error
          ? loadError.message
          : "Reading stats could not be loaded.");
      }
    });
    return () => {
      active = false;
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
  const mangaProgressTotal = mangaProgress.reduce((total, item) => total + item.seriesProgress, 0);
  const novelProgressTotal = novelProgress.reduce((total, item) => total + item.seriesProgress, 0);
  const mangaAverage = mangaProgress.length ? Math.round(mangaProgressTotal / mangaProgress.length) : 0;
  const novelAverage = novelProgress.length ? Math.round(novelProgressTotal / novelProgress.length) : 0;
  const averageProgress = progress.length
    ? Math.round(progress.reduce((total, item) => total + item.seriesProgress, 0) / progress.length)
    : 0;
  const maxActivity = Math.max(1, ...activity.map((day) => day.chapters));
  const commentCount = numberValue(profile.commentCount);

  return (
    <>
      <SiteChrome showFooter={false} />
      <main className="min-h-[calc(100vh-3.5rem)] bg-[var(--mk-page-bg,#0b0b0b)] px-3 pb-12 pt-6 text-zinc-100 sm:px-6">
        <div className="mx-auto max-w-6xl space-y-5">
          <section className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#21151d] via-[#15151d] to-[#111827] p-5 shadow-xl shadow-black/20 sm:p-7">
            <div className="flex flex-wrap items-center gap-4">
              <img
                src={avatar}
                alt=""
                onError={(event) => { event.currentTarget.src = "/assets/icons/favicon.ico"; }}
                className="size-[76px] rounded-2xl border-2 border-rose-400/50 object-cover shadow-lg sm:size-[92px]"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-300">Reader stats</p>
                <h1 className="mt-1 truncate text-2xl font-bold text-white sm:text-3xl">{name}</h1>
                <p className="mt-1 truncate text-sm text-zinc-400">
                  {username ? `@${username.replace(/^@/, "")}` : `Reader ID ${uid}`}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-zinc-300">
                    {commentCount.toLocaleString()} comments
                  </span>
                  {typeof profile.reputation === "number" && (
                    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-zinc-300">
                      {numberValue(profile.reputation).toLocaleString()} reputation
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {error && (
            <section role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-400/30 bg-red-950/30 p-4 text-sm text-red-100">
              <span>Stats gagal dimuat: {error}</span>
              <button
                type="button"
                onClick={() => setRetry((current) => current + 1)}
                className="rounded-lg border border-red-300/30 px-3 py-2 font-semibold transition hover:bg-red-400/10"
              >
                Coba lagi
              </button>
            </section>
          )}

          {!stats && !error && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Loading reader stats">
              {Array.from({ length: 7 }, (_, index) => (
                <div key={index} className="h-28 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]" />
              ))}
            </div>
          )}

          {stats && (
            <>
              <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatsCard label="Series tracked" value={progress.length.toLocaleString()} detail="Manga and novels with saved progress" icon="▤" />
                <StatsCard label="Bookmarks" value={stats.bookmarksCount === null ? "—" : stats.bookmarksCount.toLocaleString()} detail={stats.bookmarksCount === null ? "Not publicly available" : "Saved series"} icon="☆" />
                <StatsCard label="Progress" value={`${averageProgress}%`} detail="Average across tracked series" icon="◔" />
                <StatsCard label="Chapter opens" value={totalWeeklyChapters.toLocaleString()} detail={`${activeDays} active days in the last 7`} icon="↗" />
                <StatsCard label="Manga" value={mangaCount.toLocaleString()} detail="Series with reading progress" icon="▣" />
                <StatsCard label="Novels" value={novelCount.toLocaleString()} detail="Series with reading progress" icon="▥" />
                <StatsCard label="Sources" value={sourceCount.toLocaleString()} detail="Different chapter sources used" icon="⌘" />
              </section>

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
                  centerValue={`${averageProgress}%`}
                  centerLabel="average"
                  mangaDetail={`${mangaAverage}% average`}
                  novelDetail={`${novelAverage}% average`}
                />
              </section>

              <section className="rounded-3xl border border-white/10 bg-[#15151d] p-4 shadow-lg shadow-black/10 sm:p-6">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-bold text-white">Reading activity</h2>
                    <p className="mt-1 text-xs text-zinc-500">Chapter opens per day · last 7 days (UTC)</p>
                  </div>
                  <p className="text-sm font-semibold text-rose-200">{totalWeeklyChapters} chapter opens</p>
                </div>
                <div className="mt-6 grid grid-cols-7 gap-2 sm:gap-4">
                  {activity.map((day) => {
                    const height = day.chapters
                      ? Math.max(8, (day.chapters / maxActivity) * 100)
                      : 3;
                    return (
                      <div key={day.date} className="flex min-w-0 flex-col items-center gap-2" title={`${day.date}: ${day.chapters} chapters`}>
                        <span className="h-4 text-xs font-semibold text-zinc-300">
                          {day.chapters ? day.chapters : ""}
                        </span>
                        <div className="flex h-32 w-full items-end rounded-t-lg border-b border-white/10 bg-black/15 px-1">
                          <div
                            className={`w-full rounded-t-md transition-[height] ${day.chapters ? "bg-gradient-to-t from-rose-700 to-amber-300 shadow-[0_0_16px_rgba(251,113,133,.18)]" : "bg-white/10"}`}
                            style={{ height: `${height}%` }}
                            role="img"
                            aria-label={`${day.chapters} chapters`}
                          />
                        </div>
                        <span className="truncate text-[10px] text-zinc-500 sm:text-xs">
                          {getActivityDayLabel(day.date)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-3xl border border-white/10 bg-[#15151d] p-4 shadow-lg shadow-black/10 sm:p-6">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-bold text-white">Reading progress</h2>
                    <p className="mt-1 text-xs text-zinc-500">Latest saved chapter and estimated series progress</p>
                  </div>
                  <span className="text-xs text-zinc-500">{progress.length} series</span>
                </div>
                {progress.length ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {progress.map((item) => (
                      <ProgressCard key={`${item.kind}:${item.slug}`} item={item} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/15 px-5 py-10 text-center">
                    <p className="font-semibold text-zinc-200">Belum ada progres tersimpan</p>
                    <p className="mt-1 text-sm text-zinc-500">Progres dan grafik aktivitas akan terisi saat pengguna membaca sambil login.</p>
                    <a href="/manga-list" className="mt-4 inline-flex rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500">
                      Jelajahi manga
                    </a>
                  </div>
                )}
                {progress.length > 0 && (
                  <p className="mt-4 text-[11px] text-zinc-500">
                    Progres seri dihitung dari posisi chapter pada daftar chapter yang tersedia saat dibaca.
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
