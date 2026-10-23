(function () {
  "use strict";

  // ==================== SHARED LOADER ====================
  window.__mangaShared = {
    list: null,
    promise: null,
    loaded: false
  };

  window.loadSharedMangaList = function (force) {
    force = !!force;
    if (window.__mangaShared.loaded && !force && window.__mangaShared.list) {
      return Promise.resolve(window.__mangaShared.list);
    }
    if (window.__mangaShared.promise && !force) {
      return window.__mangaShared.promise;
    }

    window.__mangaShared.promise = fetch(
      "https://raw.githubusercontent.com/moemaomao/mymangadata/main/all-manga.json?t=" + Date.now()
    )
      .then((res) => {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then((list) => {
        if (!Array.isArray(list)) throw new Error("JSON harus array");
        window.__mangaShared.list = list;
        window.__mangaShared.loaded = true;
        return list;
      })
      .catch((err) => {
        console.warn("⚠️ Shared gagal:", err);
        window.__mangaShared.promise = null;
        throw err;
      });

    return window.__mangaShared.promise;
  };

  // ==================================================
  // HERO SECTION
  // ==================================================
  (function () {
    const HERO_COUNT = 9;
    const ROTATE_MS = 5000;
    const GITHUB_RAW = "https://raw.githubusercontent.com/moemaomao/mymangadata/main/";
    const CACHE_KEY = "mk_hero_v2";
    const CACHE_DURATION = 1000 * 60 * 30;

    let heroSection = null;
    let pool = [];
    const mangaMap = {};
    let slides = [];
    let currentPage = 0;
    let timer = null;
    let visibleCount = 3;
    let githubLoaded = false;
    let firestoreProcessed = false;
    let built = false;
    let firestoreTries = 0;
    const MAX_FIRESTORE_TRIES = 40;

    const $ = (id) => document.getElementById(id);

    function normalize(str) {
      return String(str || "").toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-");
    }
    function normalizeKey(str) {
      return String(str || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    }
    function escapeHtml(str) {
      return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }
    function stripHtml(str) {
      return String(str || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/\s+/g, " ").trim();
    }
    function getTimestamp(item) {
      const dates = [item.updatedAt, item.latestUpdate, item.published, item.updated, item.createdAt, item.timestamp, item.lastUpdate, item.date];
      for (let d of dates) {
        if (d) {
          const t = new Date(d).getTime();
          if (t) return t;
        }
      }
      return 0;
    }
    function resolveCover(url) {
      if (!url || String(url).trim() === "" || String(url).trim() === "-") return "";
      url = String(url).replace(/\.$/, "").trim();
      if (!/^https?:\/\//i.test(url)) url = GITHUB_RAW + url.replace(/^\//, "");
      return url;
    }
    function thumb(url) {
      const full = resolveCover(url);
      if (!full) return "";
      if (full.includes("images.weserv.nl")) return full;
      return "https://images.weserv.nl/?url=" + encodeURIComponent(full) + "&w=150&q=70&output=webp";
    }
    function shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }
    function toGenreArray(val) {
      if (!val) return [];
      if (Array.isArray(val)) return val.map((g) => String(g).trim()).filter(Boolean);
      if (typeof val === "string") return val.split(/[,|/]/).map((g) => g.trim()).filter(Boolean);
      return [];
    }
    function updateVisibleCount() {
      if (window.innerWidth <= 767) visibleCount = 1;
      else if (window.innerWidth <= 1199) visibleCount = 2;
      else visibleCount = 3;
    }
    function getCache() {
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.data)) return null;
        if (Date.now() - (parsed.time || 0) > CACHE_DURATION) return null;
        return parsed.data;
      } catch (e) { return null; }
    }
    function setCache(data) {
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ time: Date.now(), data: data })); } catch (e) {}
    }

    function buildFullRow(item, source) {
      const title = item.title || item.name || "";
      if (!title) return null;
      const key = normalizeKey(title);
      if (!key) return null;
      const cover = resolveCover(item.img || item.cover || "");
      if (!cover) return null;
      const genres = toGenreArray(item.genres || item.genre);
      let femaleTags = item.femaleTags || (item.info && item.info.femaleTags) || "";
      let maleTags = item.maleTags || (item.info && item.info.maleTags) || "";

      if (typeof femaleTags === "string") femaleTags = femaleTags.split(",").map((t) => t.trim()).filter(Boolean);
      else if (!Array.isArray(femaleTags)) femaleTags = [];
      if (typeof maleTags === "string") maleTags = maleTags.split(",").map((t) => t.trim()).filter(Boolean);
      else if (!Array.isArray(maleTags)) maleTags = [];

      return {
        key: key,
        slug: item.slug || normalize(title) || key,
        title: title,
        altTitle: item.altTitle || item.alt || item.alternative || item.title_id || item.judul || item.indo || "",
        img: cover, cover: cover,
        desc: stripHtml(item.desc || item.description || ""),
        genres: genres, genre: genres,
        rating: item.rating != null ? item.rating : null,
        status: String(item.status || "unknown").toLowerCase(),
        type: String(item.type || item.tipe || "manga").toLowerCase(),
        author: item.author || item.pengarang || "-",
        artist: item.artist || "-",
        publication: item.publication || "-",
        serialization: item.serialization || "-",
        chapters: item.chapters || item.chapter || item.total_chapter || item.totalChapter || "",
        timestamp: getTimestamp(item),
        source: source,
        femaleTags: femaleTags,
        maleTags: maleTags,
        info: item.info || null
      };
    }

    function upsertManga(item) {
      if (!item || !item.key) return;
      if (mangaMap[item.key]) {
        const old = mangaMap[item.key];
        mangaMap[item.key] = Object.assign({}, old, item, {
          title: item.title || old.title,
          slug: item.slug || old.slug,
          img: item.img || old.img,
          cover: item.cover || item.img || old.cover || old.img,
          desc: item.desc || old.desc,
          altTitle: item.altTitle || old.altTitle,
          genres: (item.genres && item.genres.length) ? item.genres : (old.genres || []),
          genre: (item.genres && item.genres.length) ? item.genres : (old.genre || old.genres || []),
          femaleTags: (item.femaleTags && item.femaleTags.length) ? item.femaleTags : (old.femaleTags || []),
          maleTags: (item.maleTags && item.maleTags.length) ? item.maleTags : (old.maleTags || []),
          info: item.info || old.info || null,
          source: item.source === "firestore" ? "firestore" : old.source,
          rating: item.rating != null ? item.rating : old.rating,
          status: item.status || old.status,
          type: item.type || old.type,
          author: (item.author && item.author !== "-") ? item.author : old.author,
          artist: (item.artist && item.artist !== "-") ? item.artist : old.artist,
          publication: item.publication || old.publication,
          serialization: item.serialization || old.serialization,
          chapters: item.chapters || old.chapters,
          timestamp: Math.max(item.timestamp || 0, old.timestamp || 0)
        });
      } else {
        mangaMap[item.key] = item;
      }
    }

    function rebuildPool() { pool = Object.values(mangaMap); }

    function loadGithub() {
      const cached = getCache();
      if (cached && cached.length) {
        cached.forEach((item) => upsertManga(item));
        rebuildPool();
        githubLoaded = true;
        tryBuild();
      }

      window.loadSharedMangaList().then((list) => {
        const mapped = [];
        list.forEach((item) => {
          const row = buildFullRow(item, "github");
          if (row) {
            mapped.push(row);
            upsertManga(row);
          }
        });
        setCache(mapped);
        rebuildPool();
        githubLoaded = true;
        tryBuild();
      }).catch(() => {
        githubLoaded = true;
        tryBuild();
      });
    }

    function processFirestoreData() {
      if (!window.mangaData || typeof window.mangaData !== "object") return false;

      const values = Object.values(window.mangaData);
      if (!values.length) return false;

      let added = 0;
      values.forEach((m) => {
        if (!m || !m.title) return;
        const isFirestore = m.firestore === true || m.source === "firestore" || m.source === "hybrid" || m.managedByAdmin === true || (m.updatedAt && m.updatedAt > 0);
        if (!isFirestore) return;

        const row = buildFullRow(m, "firestore");
        if (!row) return;
        upsertManga(row);
        added++;
      });

      if (window.fsMangaMeta) {
        Object.keys(window.fsMangaMeta).forEach((slug) => {
          const meta = window.fsMangaMeta[slug];
          if (!meta || meta.isDraft) return;

          let found = null;
          for (let key in window.mangaData) {
            const m = window.mangaData[key];
            if (m && (m.slug === meta.slug || normalizeKey(m.title) === normalizeKey(meta.title))) {
              found = m;
              break;
            }
          }

          if (found) {
            const row = buildFullRow(found, "firestore");
            if (row) {
              upsertManga(row);
              added++;
            }
          }
        });
      }

      if (added > 0) {
        rebuildPool();
        firestoreProcessed = true;
        built = false;
        tryBuild();
      }

      return added > 0;
    }

    function loadFirestore() {
      if (processFirestoreData()) return;

      window.addEventListener("mangaDataReady", () => {
        setTimeout(() => processFirestoreData(), 250);
      });

      const check = setInterval(() => {
        firestoreTries++;
        const success = processFirestoreData();
        if (success || firestoreTries >= MAX_FIRESTORE_TRIES) {
          clearInterval(check);
        }
      }, 400);
    }

    function tryBuild() {
      if (!heroSection || !githubLoaded || built) return;
      buildHero();
    }

    function buildHero() {
      if (!heroSection || built) return;
      built = true;

      updateVisibleCount();
      rebuildPool();

      const valid = pool.filter((item) => item && item.title && item.img);

      if (!valid.length) {
        heroSection.innerHTML = '<div style="padding:40px;text-align:center;opacity:.6;color:#fff;">Belum ada data hero</div>';
        return;
      }

      slides = shuffle(valid).slice(0, Math.max(HERO_COUNT, visibleCount));
      currentPage = 0;
      renderHero();
      bindNavigation();
      restartAuto();
    }

    function renderHero() {
  if (!heroSection || !slides.length) return;

  let html = '<div class="hero-track">';

  slides.forEach((item, i) => {
    const src = thumb(item.img);
    const safeTitle = escapeHtml(item.title);
    const safeKey = escapeHtml(item.key);
    const isEager = i < visibleCount;

    html += `
      <a class="hero-slide" 
         href="/series/${encodeURIComponent(item.slug)}" 
         data-key="${safeKey}" 
         data-index="${i}">
        <div class="hero-bg" style="background-image:url('${src}')"></div>
        <div class="hero-content">
          <img class="hero-cover" 
               src="${src}" 
               alt="${safeTitle}" 
               width="108" 
               height="158"
               loading="${isEager ? 'eager' : 'lazy'}"
               decoding="async"
               ${isEager ? 'fetchpriority="high"' : ''}>
          <div class="hero-info">
            <h2>${safeTitle}</h2>
            ${item.desc ? `<p>${escapeHtml(item.desc.slice(0, 140))}</p>` : ''}
          </div>
        </div>
      </a>`;
  });

  html += '</div>';
  html += `
    <button type="button" class="hero-nav hero-prev" aria-label="Prev">‹</button>
    <button type="button" class="hero-nav hero-next" aria-label="Next">›</button>
  `;

  const totalPages = Math.ceil(slides.length / visibleCount);
  html += '<div class="hero-dots">';
  for (let i = 0; i < totalPages; i++) {
    html += `
      <button type="button" 
              class="hero-dot${i === currentPage ? ' is-active' : ''}" 
              data-go="${i}" 
              aria-label="Slide ${i + 1}">
      </button>`;
  }
  html += '</div>';

  heroSection.innerHTML = html;

  heroSection.querySelectorAll(".hero-slide").forEach((el) => {
    el.addEventListener("click", () => {
      const key = el.getAttribute("data-key");
      const index = parseInt(el.getAttribute("data-index"), 10);
      const m = mangaMap[key] || slides[index];
      if (m) {
        try {
          localStorage.setItem("currentManga", JSON.stringify(m));
        } catch (e) {}
      }
    });
  });

  updatePosition();
}

    function getMaxPage() { return Math.max(0, Math.ceil(slides.length / visibleCount) - 1); }
    function updatePosition() {
      if (!heroSection) return;
      const track = heroSection.querySelector(".hero-track");
      if (!track) return;
      if (currentPage > getMaxPage()) currentPage = 0;
      track.style.transform = "translateX(-" + (currentPage * 100) + "%)";
      heroSection.querySelectorAll(".hero-dot").forEach((dot, i) => {
        dot.classList.toggle("is-active", i === currentPage);
      });
    }
    function goTo(page) {
      const max = getMaxPage();
      if (max <= 0) return;
      if (page > max) page = 0;
      if (page < 0) page = max;
      currentPage = page;
      updatePosition();
    }
    function bindNavigation() {
      if (!heroSection) return;
      const prev = heroSection.querySelector(".hero-prev");
      const next = heroSection.querySelector(".hero-next");
      if (prev) prev.onclick = (e) => { e.preventDefault(); goTo(currentPage - 1); restartAuto(); };
      if (next) next.onclick = (e) => { e.preventDefault(); goTo(currentPage + 1); restartAuto(); };
      heroSection.querySelectorAll(".hero-dot").forEach((dot) => {
        dot.onclick = () => { goTo(parseInt(dot.getAttribute("data-go"), 10)); restartAuto(); };
      });
    }
    function startAuto() {
      stopAuto();
      if (!ROTATE_MS || slides.length <= visibleCount) return;
      timer = setInterval(() => { goTo(currentPage + 1); }, ROTATE_MS);
    }
    function stopAuto() { if (timer) { clearInterval(timer); timer = null; } }
    function restartAuto() { stopAuto(); startAuto(); }

    window.addEventListener("resize", () => {
      clearTimeout(window.__heroResize);
      window.__heroResize = setTimeout(() => {
        const old = visibleCount;
        updateVisibleCount();
        if (old !== visibleCount) {
          currentPage = 0;
          renderHero();
          bindNavigation();
          restartAuto();
        }
      }, 150);
    });

    function initHero() {
      heroSection = $("heroSection");
      if (!heroSection) return;
      loadGithub();
      loadFirestore();
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initHero);
    } else {
      initHero();
    }
  })();

  // ==================================================
  // MAIN CONTENT & LISTING
  // ==================================================
  (function () {
    const CONFIG = {
      GITHUB_RAW: "https://raw.githubusercontent.com/moemaomao/mymangadata/main/",
      CHAPTER_FEED_URL: "https://www.mikodrive.my.id/feeds/posts/default?alt=json-in-script&max-results=500&callback=githubChapterCallback",
      CACHE_DURATION: 1000 * 60 * 60,
      STALE_OK_DURATION: 1000 * 60 * 60 * 24,
      FS_CACHE_DURATION: 1000 * 60 * 10,
      MAX_RESULTS: 24
    };

    window.mangaData = window.mangaData || {};
    window.chapterMap = window.chapterMap || {};
    window.chapterDateMap = window.chapterDateMap || {};
    window.githubMangaList = window.githubMangaList || [];
    window.fsMangaMeta = window.fsMangaMeta || {};

    let loading = false;
    let displayedCount = 0;
    let fullSortedList = [];
    let metaIndex = null;
    let lastRenderedHash = null;
    let currentGithubRaw = CONFIG.GITHUB_RAW;

    function safeGet(key, fallback = {}) {
      try {
        const val = localStorage.getItem(key);
        return val ? JSON.parse(val) : fallback;
      } catch (e) { return fallback; }
    }
    function safeSet(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); }
      catch (e) {
        try {
          localStorage.removeItem("mangaGithubCache");
          localStorage.removeItem("mangaFsMetaCache");
          localStorage.removeItem("mangaGithubLightCache");
        } catch (_) {}
      }
    }

    Object.assign(window.chapterMap, safeGet("chapterMap"));
    Object.assign(window.chapterDateMap, safeGet("chapterDateMap"));

    function normalize(str) { return String(str || "").toLowerCase().replace(/[^a-z0-9]/g, ""); }
    function slugify(text) {
      return String(text || "").toLowerCase().trim().replace(/\s+/g, "-").replace(/[^\w\-]+/g, "").replace(/\-\-+/g, "-");
    }
    function escapeHtml(str) {
      return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }
    function resolveCover(url) {
      if (!url || String(url).trim() === "" || String(url).trim() === "-") return "";
      url = String(url).replace(/\.$/, "").trim();
      if (/^https?:\/\//i.test(url)) return url;
      if (/^\/\//.test(url)) return location.protocol + url;
      return currentGithubRaw + url.replace(/^\//, "");
    }
    function getThumbnail(url) {
      const full = resolveCover(url);
      if (!full) return null;
      return "https://images.weserv.nl/?url=" + encodeURIComponent(full) + "&w=150&q=60&output=webp";
    }
    function toMs(v) {
      if (v == null || v === "") return 0;
      if (typeof v === "number" && !isNaN(v)) return v < 1e12 ? v * 1000 : v;
      if (v && typeof v.toMillis === "function") return v.toMillis();
      if (v && typeof v.seconds === "number") return v.seconds * 1000;
      const n = Number(v);
      if (!isNaN(n) && n > 0) return n < 1e12 ? n * 1000 : n;
      const d = Date.parse(String(v));
      return isNaN(d) ? 0 : d;
    }
    function simpleHash(str) {
      let h = 0;
      for (let i = 0; i < str.length; i++) {
        h = ((h << 5) - h) + str.charCodeAt(i);
        h |= 0;
      }
      return h;
    }

    function showSkeleton(count = 24) {
      const el = document.getElementById("githubManga");
      if (!el) return;
      const isDark = document.documentElement.classList.contains("dark");
      let html = "";
      for (let i = 0; i < count; i++) {
        html += '<div class="card skeleton-card' + (isDark ? " dark" : "") + '"><div class="thumb skeleton-thumb"></div></div>';
      }
      el.innerHTML = html;
    }

    function updateLoadMoreBtn(total) {
      const btn = document.getElementById("loadMoreBtn") || document.getElementById("loadMoreGithub");
      if (!btn) return;
      if (displayedCount >= total) {
        btn.style.display = "none";
        btn.disabled = true;
      } else {
        btn.style.display = "";
        btn.disabled = false;
        btn.textContent = "Load more";
      }
    }

    function waitForFirebase(maxRetry = 40) {
      return new Promise((resolve) => {
        let tries = 0;
        const check = () => {
          if (window.firestore && window.fs) {
            resolve({ db: window.firestore, getDocs: window.fs.getDocs, collection: window.fs.collection, getDoc: window.fs.getDoc, doc: window.fs.doc });
            return;
          }
          tries++;
          if (tries >= maxRetry) {
            resolve(null);
            return;
          }
          setTimeout(check, 150);
        };
        check();
      });
    }

    function metaFromData(slug, data) {
      if (!data) return null;
      const updatedAt = toMs(data.updatedAt) || toMs(data.latestUpdate) || 0;
      return {
        slug: slug,
        title: data.title || slug,
        updatedAt: updatedAt,
        latestUpdate: toMs(data.latestUpdate) || updatedAt,
        lastChapter: data.lastChapter != null ? String(data.lastChapter) : "",
        lastChapterUpdated: data.lastChapterUpdated != null ? String(data.lastChapterUpdated) : "",
        chapterCount: typeof data.chapterCount === "number" ? data.chapterCount : 0,
        managedByAdmin: !!data.managedByAdmin,
        source: data.source || "",
        origin: data.origin || "",
        githubSlug: data.githubSlug || "",
        isDraft: !!data.isDraft,
        status: data.status || "",
        type: data.type || "",
        cover: data.cover || "",
        rating: data.rating
      };
    }

    function buildMetaIndex(map) {
      const index = { bySlug: map, byTitle: Object.create(null) };
      for (let key in map) {
        const meta = map[key];
        if (!meta || meta.isDraft) continue;
        if (meta.title) index.byTitle[normalize(meta.title)] = meta;
      }
      return index;
    }

    function loadFirestoreMeta(force = false) {
      return new Promise(async (resolve) => {
        if (!force) {
          const cached = safeGet("mangaFsMetaCache", null);
          if (cached && cached.data && Date.now() - (cached.time || 0) < CONFIG.FS_CACHE_DURATION) {
            window.fsMangaMeta = cached.data;
            metaIndex = buildMetaIndex(cached.data);
            return resolve(cached.data);
          }
        }

        const fb = await waitForFirebase();
        if (!fb) return resolve(window.fsMangaMeta || {});

        try {
          let map = {};
          let usedSummary = false;

          try {
            const summaryRef = fb.doc(fb.db, "meta", "mangaSummary");
            const summarySnap = await fb.getDoc(summaryRef);

            if (summarySnap.exists()) {
              const list = summarySnap.data().list;
              if (Array.isArray(list) && list.length > 0) {
                list.forEach((entry) => {
                  if (!entry || !entry.slug) return;
                  const meta = metaFromData(entry.slug, entry);
                  if (!meta) return;
                  map[meta.slug] = meta;
                  if (meta.githubSlug) map[meta.githubSlug] = meta;
                });
                usedSummary = true;
              }
            }
          } catch (e) {
            console.warn("Summary doc miss, fallback ke full scan:", e);
          }

          if (!usedSummary || Object.keys(map).length === 0) {
            const snap = await fb.getDocs(fb.collection(fb.db, "manga"));
            map = {};
            snap.forEach((docSnap) => {
              const meta = metaFromData(docSnap.id, docSnap.data());
              if (!meta) return;
              map[meta.slug] = meta;
              if (meta.githubSlug) map[meta.githubSlug] = meta;
            });
          }

          window.fsMangaMeta = map;
          metaIndex = buildMetaIndex(map);
          safeSet("mangaFsMetaCache", { time: Date.now(), data: map });
          resolve(map);
        } catch (err) {
          console.warn("loadFirestoreMeta error:", err);
          resolve(window.fsMangaMeta || {});
        }
      });
    }

    function getFsMetaForItem(item) {
      if (!metaIndex) return null;
      const title = item.title || item.name || "";
      const slug = (item.slug && String(item.slug).trim()) || slugify(title);
      if (metaIndex.bySlug[slug]) return metaIndex.bySlug[slug];
      if (item.githubSlug && metaIndex.bySlug[item.githubSlug]) return metaIndex.bySlug[item.githubSlug];
      const normTitle = normalize(title);
      if (metaIndex.byTitle[normTitle]) return metaIndex.byTitle[normTitle];
      return null;
    }

    function isManaged(meta) {
      if (!meta) return false;
      return !!meta.managedByAdmin || meta.source === "hybrid" || meta.source === "firestore" || meta.origin === "github" || meta.updatedAt > 0;
    }

    function saveLightCache(list) {
      try {
        const lightList = (list || []).map((item) => {
          const meta = getFsMetaForItem(item) || {};
          return {
            title: item.title || item.name || "",
            slug: item.slug || "",
            githubSlug: item.githubSlug || "",
            img: item.img || item.cover || "",
            cover: item.cover || item.img || "",
            status: item.status || meta.status || "",
            type: item.type || meta.type || "manga",
            rating: item.rating != null ? item.rating : (meta.rating != null ? meta.rating : null),
            desc: item.desc || "",
            genres: Array.isArray(item.genres) ? item.genres : [],
            altTitle: item.altTitle || "",
            author: item.author || "-",
            artist: item.artist || "-",
            updatedAt: meta.updatedAt || 0,
            lastChapter: meta.lastChapter || "",
            managedByAdmin: !!meta.managedByAdmin,
            source: meta.source || "",
            origin: meta.origin || ""
          };
        });
        safeSet("mangaGithubLightCache", { time: Date.now(), list: lightList, fullList: list });
      } catch (e) {}
    }

    function loadLightCache() {
      try {
        const cache = safeGet("mangaGithubLightCache", null);
        if (!cache || !cache.fullList) return null;
        const age = Date.now() - (cache.time || 0);
        return {
          data: cache.fullList,
          expired: age > CONFIG.CACHE_DURATION,
          tooOld: age > CONFIG.STALE_OK_DURATION
        };
      } catch (e) { return null; }
    }

    async function loadGithubList(force = false) {
      if (!force) {
        const cached = safeGet("mangaGithubCache", null);
        if (cached && cached.data && Date.now() - (cached.time || 0) < CONFIG.CACHE_DURATION) {
          return cached.data;
        }
      }
      try {
        const list = await window.loadSharedMangaList(force);
        safeSet("mangaGithubCache", { time: Date.now(), data: list });
        return list;
      } catch (err) {
        const cached = safeGet("mangaGithubCache", null);
        if (cached && cached.data) return cached.data;
        throw err;
      }
    }

    function getSortTime(item) {
      const meta = getFsMetaForItem(item);
      if (meta && isManaged(meta) && meta.updatedAt > 0) return meta.updatedAt;
      return 0;
    }

    function getChapterNum(item) {
      const meta = getFsMetaForItem(item);
      let found = false;
      let max = -1;

      const consider = (raw) => {
        if (raw == null || raw === "") return;
        if (typeof raw === "object") return;
        const match = String(raw).match(/[\d.]+/);
        if (!match) return;
        const parsed = parseFloat(match[0]);
        // terima 0 / 00 (parsed >= 0)
        if (isNaN(parsed) || parsed < 0) return;
        if (!found || parsed > max) {
          max = parsed;
          found = true;
        }
      };

      if (meta) {
        consider(meta.lastChapter);
        consider(meta.lastChapterUpdated);
      }

      consider(item.lastChapter);
      consider(item.chapters);
      consider(item.chapter);
      consider(item.total_chapter);
      consider(item.totalChapter);

      return found ? max : -1;
    }

    function createCardHTML(item, isPriority = false) {
      const title = item.title || "Untitled";
      const key = normalize(title);
      const slug = (item.slug && String(item.slug).trim()) || slugify(title);
      const meta = getFsMetaForItem(item);
      const finalSlug = (meta && meta.slug) || slug;
      const coverSrc = (window.getSeriesCoverPreference && window.getSeriesCoverPreference(finalSlug)) ||
        (meta && meta.cover) || item.img || item.cover;
      const thumb = getThumbnail(coverSrc);
      const status = ((meta && meta.status) || item.status || "").toLowerCase();
      const type = ((meta && meta.type) || item.type || "manga").toLowerCase();
      const ch = getChapterNum(item);
      const sortTime = getSortTime(item);
      const UP_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;
      const isRecentUpdate = sortTime > 0 && Date.now() - sortTime <= UP_WINDOW_MS && isManaged(meta);
      const isUp = !!item.isUp || isRecentUpdate;
      const rating = meta && meta.rating != null ? meta.rating : (item.rating != null ? item.rating : "-");
      const isFromFirestore = !!(meta && (
        meta.source === "firestore" ||
        meta.source === "hybrid" ||
        meta.managedByAdmin ||
        meta.updatedAt > 0
      ));

      window.mangaData[key] = {
        slug: finalSlug,
        title: title,
        img: resolveCover(coverSrc || ""),
        desc: item.desc || "",
        genres: Array.isArray(item.genres) ? item.genres : [],
        rating: rating,
        status: status,
        type: type,
        altTitle: item.altTitle || "",
        author: item.author || "-",
        artist: item.artist || "-",
        publication: item.publication || "-",
        serialization: item.serialization || "-",
        demographic: item.demographic || "-",
        updatedAt: sortTime,
        lastChapter: ch,
        managedByAdmin: !!(meta && meta.managedByAdmin),
        info: item,
        firestore: isFromFirestore,
        source: isFromFirestore ? "firestore" : "github"
      };

      const safeTitle = escapeHtml(title);
      const safeSlug = escapeHtml(finalSlug);

      let imgAttrs = 'src="' + thumb + '" alt="' + safeTitle + '" decoding="async" width="150" height="225"';
      if (isPriority) {
        imgAttrs += ' fetchpriority="high"';
      } else {
        imgAttrs += ' loading="lazy"';
      }

      const coverHTML = thumb
        ? "<img " + imgAttrs + " onerror=\"this.parentElement.innerHTML='<div class=\\'no-cover\\'>Cover Not Found</div>'\">"
        : '<div class="no-cover">Cover Not Found</div>';

      return (
        '<a href="/series/' + encodeURIComponent(safeSlug) + '" class="card" data-key="' + escapeHtml(key) + '" data-slug="' + safeSlug + '">' +
          '<div class="thumb">' +
            (status ? '<div class="status-badge ' + escapeHtml(status) + '">' + status.toUpperCase() + "</div>" : "") +
            (isUp ? '<div class="up-badge">UP</div>' : "") +
            (type ? '<div class="type-badge ' + escapeHtml(type) + '">' + type.toUpperCase() + "</div>" : "") +
            (ch >= 0 ? '<div class="ch-badge">Ch. ' + ch + '</div>' : "") +
            coverHTML +
            '<div class="overlay"><div class="title">' + safeTitle + "</div></div>" +
          "</div>" +
        "</a>"
      );
    }

    function renderBatch(items, isPriority = false) {
  const el = document.getElementById("githubManga");
  if (!el) return;
  const fragment = document.createDocumentFragment();
  const temp = document.createElement("div");

  items.forEach((item, i) => {
    temp.innerHTML = createCardHTML(item, isPriority).trim();
    if (temp.firstChild) {
      temp.firstChild.style.animationDelay = (i * 0.04) + "s";
      fragment.appendChild(temp.firstChild);
    }
  });

  el.appendChild(fragment);
  displayedCount += items.length;
  updateLoadMoreBtn(fullSortedList.length);
}

    function renderList(list, isFromCache = false) {
      const el = document.getElementById("githubManga");
      if (!el) return;

      el.innerHTML = "";
      displayedCount = 0;

      fullSortedList = (list || []).slice().sort((a, b) => getSortTime(b) - getSortTime(a));

      const initialBatch = fullSortedList.slice(0, CONFIG.MAX_RESULTS);
      renderBatch(initialBatch, true);

      bindCardClickEvents();
    }

    function loadMore() {
      if (displayedCount >= fullSortedList.length) return;
      const nextBatch = fullSortedList.slice(displayedCount, displayedCount + CONFIG.MAX_RESULTS);
      renderBatch(nextBatch, false);
      bindCardClickEvents();
    }

    function bindCardClickEvents() {
      const el = document.getElementById("githubManga");
      if (!el) return;
      el.querySelectorAll(".card:not([data-bound])").forEach((card) => {
        card.setAttribute("data-bound", "true");
        card.addEventListener("click", () => {
          const key = card.getAttribute("data-key");
          if (key && window.mangaData[key]) {
            try {
              localStorage.setItem("currentManga", JSON.stringify(window.mangaData[key]));
            } catch (e) {}
          }
        });
      });
    }

    async function loadManga(forceFs, forceGithub) {
      if (loading) return;
      loading = true;

      const el = document.getElementById("githubManga");
      if (!el) { loading = false; return; }

      const light = loadLightCache();
      let renderedFromCache = false;

      if (light && light.data && !light.tooOld) {
        const fsCached = safeGet("mangaFsMetaCache", null);
        if (fsCached && fsCached.data) {
          window.fsMangaMeta = fsCached.data;
          metaIndex = buildMetaIndex(fsCached.data);
        }
        window.githubMangaList = light.data;
        renderList(light.data, true);
        renderedFromCache = true;
      } else {
        showSkeleton();
      }

      try {
        const fsMetaPromise = loadFirestoreMeta(forceFs);
        const list = await loadGithubList(forceGithub);

        window.githubMangaList = list || [];
        if (!renderedFromCache) {
          renderList(window.githubMangaList, false);
        }

        const fsMeta = await fsMetaPromise;
        if (!metaIndex && fsMeta) metaIndex = buildMetaIndex(fsMeta);

        const newHash = simpleHash(JSON.stringify(list) + JSON.stringify(
          Object.keys(fsMeta || {}).map((k) => {
            return { s: k, u: (fsMeta[k] && fsMeta[k].updatedAt) || 0 };
          })
        ));

        if (!(lastRenderedHash === newHash && renderedFromCache)) {
          renderList(list, false);
          lastRenderedHash = newHash;
        }
        saveLightCache(list);

        window.dispatchEvent(new Event("mangaDataReady"));
      } catch (err) {
        if (!renderedFromCache) {
          el.innerHTML = '<p style="text-align:center;padding:40px;color:#f66;">Gagal memuat manga<br><button onclick="window.refreshGithubManga()" style="margin-top:12px;padding:8px 16px;cursor:pointer;">Coba Lagi</button></p>';
        }
      } finally {
        loading = false;
      }
    }

    window.refreshGithubManga = function () {
      loadManga(true, true);
    };

    function initMain() {
      const btn = document.getElementById("loadMoreBtn") || document.getElementById("loadMoreGithub");
      if (btn) {
        btn.addEventListener("click", loadMore);
      }
      loadManga(false, false);
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initMain);
    } else {
      initMain();
    }
  })();
})();