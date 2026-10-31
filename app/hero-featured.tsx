"use client";

import { useEffect, useState, useRef, type CSSProperties } from "react";
import { useRouter } from "nextjs-toploader/app";
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
  const githubPool: HeroCover[] = [];
  const firestorePool: HeroCover[] = [];
  const seen = new Set<string>();

  const push = (item: Record<string, unknown>, target: HeroCover[]) => {
    if (typeof item.title !== "string" || !item.title) return;
    const key = normalizeTitle(item.title);
    if (seen.has(key)) return;
    const raw = resolveCover(item.cover || item.img);
    if (!raw) return;
    seen.add(key);
    target.push({
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
      if (item && typeof item === "object") push(item as Record<string, unknown>, githubPool);
    }
  }

  if (data && typeof data === "object") {
    for (const value of Object.values(data)) {
      if (!value || typeof value !== "object") continue;
      const item = value as Record<string, unknown>;
      if (typeof item.title === "string" && seen.has(normalizeTitle(item.title))) continue;
      const isFs = item.firestore === true || item.github !== true;
      if (isFs) push(item, firestorePool);
      else push(item, githubPool);
    }
  }

  const pool: HeroCover[] = [];
  const fsCap = Math.max(2, Math.floor(limit * 0.3));
  const ghCap = limit - fsCap;

  for (let i = 0; i < githubPool.length && pool.length < ghCap; i++) {
    pool.push(githubPool[i]);
  }

  for (let i = 0; i < firestorePool.length && pool.length < limit && i < fsCap; i++) {
    pool.push(firestorePool[i]);
  }

  const ghPart = pool.slice(0, Math.min(pool.length, ghCap));
  const fsPart = pool.slice(ghPart.length);
  const mixed: HeroCover[] = [];
  const maxLen = Math.max(ghPart.length, fsPart.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < ghPart.length) mixed.push(ghPart[i]);
    if (i < fsPart.length) mixed.push(fsPart[i]);
  }

  if (mixed.length < limit) {
    for (const item of [...githubPool, ...firestorePool]) {
      if (mixed.length >= limit) break;
      if (!mixed.some((p) => normalizeTitle(p.title) === normalizeTitle(item.title))) {
        mixed.push(item);
      }
    }
  }

  return mixed.slice(0, limit);
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

  if (offset === 0) return -m.mainHalf;
  if (offset === 1) return m.mainHalf;
  if (offset > 1) return m.mainHalf + (offset - 1) * m.step;

  return -m.mainHalf + offset * m.step;
}

export default function HeroFeatured() {
  const router = useRouter();
  const [covers, setCovers] = useState<HeroCover[]>(FALLBACK_COVERS);
  const [active, setActive] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [vw, setVw] = useState(1200);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [displayTitle, setDisplayTitle] = useState<HeroCover | null>(null);
  const [titlePhase, setTitlePhase] = useState<"in" | "out">("in");
  const titleToken = useRef(0);

  useEffect(() => {
    const id = "mikoroku-cyber-font";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Orbitron:wght@500;600;700&family=Rajdhani:wght@600;700&display=swap";
    document.head.appendChild(link);
  }, []);


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

  useEffect(() => {
    if (!displayTitle && covers[active]) {
      setDisplayTitle(covers[active]);
      setTitlePhase("in");
    }
  }, [covers, active, displayTitle]);

  useEffect(() => {
    const next = covers[active];
    if (!next) return;
    if (displayTitle && next.slug === displayTitle.slug && next.title === displayTitle.title) return;
    if (!displayTitle) {
      setDisplayTitle(next);
      setTitlePhase("in");
      return;
    }

    const token = ++titleToken.current;
    setTitlePhase("out");
    const t = window.setTimeout(() => {
      if (titleToken.current !== token) return;
      setDisplayTitle(next);
      setTitlePhase("in");
    }, 480);
    return () => window.clearTimeout(t);
  }, [active, covers, displayTitle]);


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
                  router.push(seriesHref(item.slug));
                } else {
                  goTo(index);
                }
              }}
              aria-label={item.title}
              aria-current={isMainA ? "true" : undefined}
            >
              <img
                className={styles.glow}
                src={item.cover}
                alt=""
                aria-hidden="true"
                width={240}
                height={340}
                loading={abs <= 2 || isMain ? "eager" : "lazy"}
                decoding="async"
                draggable={false}
              />
              <img
                className={styles.cover}
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

      <div className={styles.titleStage} aria-live="polite">
        {displayTitle && <div className={styles.titleStrip} aria-hidden="true" />}
        {displayTitle && (
          <div
            key={`${displayTitle.slug}-${titlePhase}`}
            className={`${styles.titleCard} ${titlePhase === "out" ? styles.titleCardOut : styles.titleCardIn}`}
          >
            <h2 className={styles.titleText}>{displayTitle.title}</h2>
            <p className={styles.titleGenre}>{displayTitle.subtitle || "Borderline H"}</p>
          </div>
        )}
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
