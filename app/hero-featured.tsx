"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { imageProxyUrl } from "../lib/image-proxy";
import { readGlobalAppearance } from "./lib/global-appearance";
import styles from "./hero-featured.module.css";

type HeroCover = {
  title: string;
  slug: string;
  cover: string;
  subtitle?: string;
};

const FALLBACK_COVERS: HeroCover[] = [
  { title: "Featured Series 1", slug: "#", cover: "https://via.placeholder.com/200x280/1a1028/c9a0ff?text=1", subtitle: "Borderline H" },
  { title: "Featured Series 2", slug: "#", cover: "https://via.placeholder.com/200x280/120818/c9a0ff?text=2", subtitle: "Borderline H" },
  { title: "Featured Series 3", slug: "#", cover: "https://via.placeholder.com/200x280/0f0a1a/c9a0ff?text=3", subtitle: "Borderline H" },
  { title: "Featured Series 4", slug: "#", cover: "https://via.placeholder.com/200x280/180f22/c9a0ff?text=4", subtitle: "Borderline H" },
  { title: "Featured Series 5", slug: "#", cover: "https://via.placeholder.com/200x280/140c1c/c9a0ff?text=5", subtitle: "Borderline H" },
  { title: "Featured Series 6", slug: "#", cover: "https://via.placeholder.com/200x280/1a1028/c9a0ff?text=6", subtitle: "Borderline H" },
];

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function resolveCover(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.trim() === "-") return "";
  const cover = value.replace(/\.$/, "").trim();
  if (/^https?:\/\//i.test(cover)) return cover;
  if (/^\/\//.test(cover)) return `https:${cover}`;
  return `https://raw.githubusercontent.com/moemaomao/mymangadata/main/${cover.replace(/^\//, "")}`;
}

function thumb(url: string, version = 0): string {
  if (!url || url.includes("placeholder.com")) return url;
  try {
    return imageProxyUrl(url, "cover", version) || url;
  } catch {
    return url;
  }
}

function pickFromWindow(limit = 15): HeroCover[] {
  if (typeof window === "undefined") return [];

  const data = window.mangaData;
  const list = window.githubMangaList;
  const pool: HeroCover[] = [];
  const seen = new Set<string>();

  const push = (item: Record<string, unknown>) => {
    if (typeof item.title !== "string" || !item.title) return;
    const key = normalizeTitle(item.title);
    if (seen.has(key)) return;
    const raw = resolveCover(item.cover || item.img);
    if (!raw) return;
    seen.add(key);
    pool.push({
      title: item.title,
      slug: String(item.slug || key),
      cover: thumb(raw, Number(item.updatedAt) || 0),
      subtitle: Array.isArray(item.genres)
        ? (item.genres as string[]).slice(0, 2).join(" · ")
        : "Borderline H",
    });
  };

  if (Array.isArray(list) && list.length) {
    for (const item of list) {
      if (item && typeof item === "object") push(item as Record<string, unknown>);
      if (pool.length >= limit) break;
    }
  } else if (data && typeof data === "object") {
    for (const value of Object.values(data)) {
      if (value && typeof value === "object") push(value as Record<string, unknown>);
      if (pool.length >= limit) break;
    }
  }
  return pool;
}

function seriesHref(slug: string): string {
  if (!slug || slug === "#") return "#";
  return `/series/${encodeURIComponent(slug)}`;
}

function circularOffset(index: number, active: number, n: number): number {
  let d = index - active;
  if (d > n / 2) d -= n;
  if (d < -n / 2) d += n;
  return d;
}

function layoutMetrics(width: number, dual: boolean) {
  let cardW = 128;
  if (width >= 1600) cardW = 142;
  else if (width >= 1400) cardW = 138;
  else if (width >= 1100) cardW = 132;
  else if (width < 768) cardW = 104;

  const scaleMain = dual ? 1.06 : 1.12;
  const mainW = cardW * scaleMain;
  const gap = dual ? Math.max(6, Math.min(14, width * 0.006)) : 0;
  const mainHalf = dual ? mainW / 2 + gap / 2 : 0;

  let step: number;
  if (!dual) {
    step = Math.max(48, cardW * 0.55);
  } else {
    const maxSide = 7;
    const usable = Math.min(width, 1600) * 0.92;
    const remain = Math.max(0, usable / 2 - mainHalf);
    step = Math.max(cardW * 0.42, Math.min(cardW * 0.72, remain / maxSide));
  }

  return { cardW, mainHalf, step, dual };
}

function cardX(offset: number, m: ReturnType<typeof layoutMetrics>): number {
  if (!m.dual) {
    return offset * m.step;
  }
  // dual: 0 = left main, 1 = right main
  if (offset === 0) return -m.mainHalf;
  if (offset === 1) return m.mainHalf;
  if (offset > 1) return m.mainHalf + (offset - 1) * m.step;
  // offset < 0
  return -m.mainHalf + offset * m.step;
}

export default function HeroFeatured() {
  const [covers, setCovers] = useState<HeroCover[]>(FALLBACK_COVERS);
  const [active, setActive] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [vw, setVw] = useState(1200);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const syncHide = () => {
      try {
        setHidden(Boolean(readGlobalAppearance().hideHero));
      } catch {
        setHidden(false);
      }
    };
    syncHide();
    window.addEventListener("storage", syncHide);
    const timer = window.setInterval(syncHide, 1000);
    return () => {
      window.removeEventListener("storage", syncHide);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const sync = () => {
      setVw(window.innerWidth);
      setSidebarOpen(document.body.classList.contains("sidebar-open"));
    };
    sync();
    window.addEventListener("resize", sync);
    const mo = new MutationObserver(sync);
    mo.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    const timer = window.setInterval(sync, 500);
    return () => {
      window.removeEventListener("resize", sync);
      mo.disconnect();
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const apply = () => {
      const picked = pickFromWindow(15);
      if (picked.length >= 9) {
        setCovers(picked);
        setActive(0);
      }
    };
    apply();
    const onReady = () => apply();
    window.addEventListener("mangaDataReady", onReady);
    const timers = [800, 2000, 4000].map((ms) => window.setTimeout(apply, ms));
    return () => {
      window.removeEventListener("mangaDataReady", onReady);
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  useEffect(() => {
    if (covers.length < 2 || hidden) return;
    const timer = window.setInterval(() => {
      setActive((i) => (i + 1) % covers.length);
    }, 4800);
    return () => window.clearInterval(timer);
  }, [covers.length, hidden]);

  const n = covers.length;
  const dual = vw >= 768;
  const contentW = sidebarOpen && dual ? Math.max(320, vw - 240) : vw;
  const metrics = layoutMetrics(contentW, dual);
  const maxAbs = dual ? 8 : 3;

  const goTo = (index: number) => {
    if (index === active) return;
    setActive(index);
  };

  if (hidden) {
    return <section id="heroSection" className={styles.hero} hidden aria-hidden="true" />;
  }

  return (
    <section id="heroSection" className={styles.hero} aria-label="Featured Titles">
      <div className={styles.track}>
        {covers.map((item, index) => {
          const offset = circularOffset(index, active, n);
          const abs = Math.abs(offset);
          if (abs > maxAbs) return null;

          const isMainA = offset === 0;
          const isMainB = dual && offset === 1;
          const isMain = isMainA || isMainB;
          const x = cardX(offset, metrics);

          return (
            <button
              key={`${item.slug}-${index}`}
              type="button"
              className={`${styles.card} ${isMainA ? styles.cardActive : ""} ${isMainB ? styles.cardActiveB : ""}`}
              style={
                {
                  "--x": `${x}px`,
                  "--a": isMain ? 0 : abs,
                  "--rot": isMain ? 0 : offset * (dual ? -10 : -16),
                  zIndex: isMain ? 50 : 40 - abs,
                } as CSSProperties
              }
              onClick={() => {
                if (isMain) {
                  window.location.href = seriesHref(item.slug);
                } else {
                  goTo(index);
                }
              }}
              aria-label={item.title}
              aria-current={isMainA ? "true" : undefined}
            >
              <img
                src={item.cover}
                alt={item.title}
                width={240}
                height={340}
                loading={abs <= 2 || isMain ? "eager" : "lazy"}
                decoding="async"
                draggable={false}
              />
            </button>
          );
        })}
      </div>

      <div className={styles.dots} role="tablist" aria-label="Featured slides">
        {covers.map((item, i) => (
          <button
            key={item.slug + i}
            type="button"
            role="tab"
            aria-selected={i === active}
            className={`${styles.dot} ${i === active ? styles.dotOn : ""}`}
            aria-label={item.title}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
    </section>
  );
}
