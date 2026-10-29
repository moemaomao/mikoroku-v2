"use client";

import { useEffect, useState } from "react";
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

/** Compress via site image proxy (weserv webp ~200px) */
function thumb(url: string, version = 0): string {
  if (!url || url.includes("placeholder.com")) return url;
  try {
    return imageProxyUrl(url, "cover", version) || url;
  } catch {
    return url;
  }
}

function pickFromWindow(limit = 6): HeroCover[] {
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
      slug: String(item.slug || normalizeTitle(item.title)),
      cover: thumb(raw, Number(item.updatedAt || 0)),
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

  if (pool.length < 6) return [];

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, limit);
}

function seriesHref(slug: string): string {
  if (!slug || slug === "#") return "/manga-list";
  return `/series/${encodeURIComponent(slug)}`;
}

export default function HeroFeatured() {
  const [covers, setCovers] = useState<HeroCover[]>(FALLBACK_COVERS);
  const [active, setActive] = useState(0);
  const [hidden, setHidden] = useState(false);

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
    const apply = () => {
      const picked = pickFromWindow(6);
      if (picked.length >= 6) {
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
    if (covers.length < 2) return;
    const timer = window.setInterval(() => {
      setActive((i) => (i + 1) % covers.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [covers.length]);

  const featured = covers[active] || covers[0];

  if (hidden) {
    return <section id="heroSection" className={styles.hero} hidden aria-hidden="true" />;
  }

  return (
    <section id="heroSection" className={styles.hero} aria-label="Featured Titles">
      <div className={styles.covers}>
        {covers.map((item, index) => (
          <button
            key={`${item.slug}-${index}`}
            type="button"
            className={`${styles.card} ${styles[`pos${index + 1}` as keyof typeof styles]} ${
              index === active ? styles.cardActive : ""
            }`}
            onClick={() => setActive(index)}
            aria-label={item.title}
            aria-current={index === active ? "true" : undefined}
          >
            <img
              src={item.cover}
              alt={item.title}
              width={200}
              height={280}
              loading={index < 3 ? "eager" : "lazy"}
              decoding="async"
            />
            <div className={styles.cardInfo}>
              <h3>{item.title}</h3>
              {item.subtitle ? <p>{item.subtitle}</p> : null}
            </div>
          </button>
        ))}
      </div>

      <div className={styles.panel}>
        <a href={seriesHref(featured.slug)} className={styles.panelLink}>
          <div className={styles.panelCoverWrap}>
            <img
              key={featured.slug + String(active)}
              src={featured.cover}
              alt={featured.title}
              className={styles.panelCover}
              width={72}
              height={100}
              loading="eager"
              decoding="async"
            />
          </div>
          <div className={styles.ornament}>✦</div>
          <h2 className={styles.panelTitle}>{featured.title}</h2>
          <p className={styles.sub}>{featured.subtitle || "Borderline H Scans"}</p>
          <span className={styles.btn}>READ NOW</span>
        </a>

        <div className={styles.dots} aria-label="Pilih featured">
          {covers.map((item, i) => (
            <button
              key={item.slug + i}
              type="button"
              className={`${styles.dot} ${i === active ? styles.dotActive : ""}`}
              aria-label={item.title}
              onClick={() => setActive(i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
