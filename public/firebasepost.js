// ==================== CONFIG CACHE ====================
window.POST_CACHE_KEY = window.POST_CACHE_KEY || "manga_cache_v5";
window.POST_CACHE_TIME = window.POST_CACHE_TIME || 1000 * 60 * 60 * 1;

function parseChapterNum(val) {
  if (val == null || val === "") return 0;
  const n = parseFloat(String(val).replace(/[^\d.]/g, ""));
  return isNaN(n) ? 0 : n;
}

function getLastChapter(m) {
  if (!m) return null;

  let maxNum = -1;
  let maxStr = null;
  let found = false;

  const consider = (raw) => {
    if (raw == null || raw === "") return;
    if (typeof raw === "object") return;
    const str = String(raw).trim();
    if (str === "") return;
    const n = parseChapterNum(str);
    if (isNaN(n) || n < 0) return;
    if (!found || n > maxNum) {
      maxNum = n;
      maxStr = str;
      found = true;
    }
  };

  consider(m.lastChapter);
  consider(m.lastChapterUpdated);

  if (m.chapter != null && typeof m.chapter !== "object") {
    consider(m.chapter);
  }

  const chapters =
    (m.chapters && typeof m.chapters === "object" ? m.chapters : null) ||
    (typeof m.chapter === "object" && m.chapter ? m.chapter : null);

  if (chapters) {
    Object.keys(chapters).forEach((k) => consider(k));
  }

  return found ? maxStr : null;
}

// ==================== LIGHT CACHE ====================
function saveLightCache(rawData) {
  try {
    const CACHE_KEY = window.POST_CACHE_KEY;
    const lightData = {};

    Object.entries(rawData).forEach(([slug, m]) => {
      const origin = String(m.origin || "").toLowerCase();
      const source = String(m.source || "").toLowerCase();

      if (origin === "github" || source === "github") return;

      const lastCh = getLastChapter(m);

      lightData[slug] = {
        slug,
        title: getValue(m, "title"),
        altTitle: getValue(m, "altTitle"),
        cover: getValue(m, "cover") || getValue(m, "img"),
        img: getValue(m, "img") || getValue(m, "cover"),
        type: getValue(m, "type"),
        status: getValue(m, "status"),
        rating: getValue(m, "rating", null),
        genres: getValue(m, "genres", []),
        author: getValue(m, "author"),
        artist: getValue(m, "artist"),
        circle: getValue(m, "circle"),
        series: getValue(m, "series"),
        publication: getValue(m, "publication"),
        serialization: getValue(m, "serialization"),
        updatedAt: m.updatedAt || 0,
        lastChapter: lastCh,
        lastChapterUpdated: m.lastChapterUpdated || lastCh,
        chapter: m.chapter,
        chapterCount: m.chapterCount,
        origin: m.origin || "firestore",
        source: m.source || "firestore"
      };
    });

    localStorage.setItem(CACHE_KEY, JSON.stringify({
      time: Date.now(),
      data: lightData
    }));

  } catch (e) {
    clearOldCaches();
  }
}

function loadCache() {
  try {
    const CACHE_KEY = window.POST_CACHE_KEY;
    const CACHE_TIME = window.POST_CACHE_TIME;
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY));
    if (!cache) return null;

    return {
      data: cache.data,
      expired: Date.now() - cache.time > CACHE_TIME
    };
  } catch {
    return null;
  }
}

function clearOldCaches() {
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (
      key.includes("manga_cache") ||
      key === "currentManga" ||
      key.startsWith("chapters_") ||
      key.startsWith("detail_")
    ) {
      if (key === "mangaBookmarks") return;
      localStorage.removeItem(key);
    }
  });
}

// ==================== UTIL ====================
function getThumbnail(url) {
  if (!url) return "https://via.placeholder.com/80x110?text=No+Image";
  return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=120&q=60`;
}

function normalizeType(typeRaw) {
  if (!typeRaw) return "";
  return typeRaw
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .trim();
}

function detectType(m) {
  let type = normalizeType(m.type || m.info?.type);

  if (!type || type === "manga") {
    const genres = (m.genres || m.info?.genres || []).map(g => String(g).toLowerCase());
    if (genres.includes("doujinshi")) return "doujinshi";
    if (genres.includes("cg")) return "cg";
    if (genres.includes("manhwa")) return "manhwa";
    if (genres.includes("manhua")) return "manhua";
    if (genres.includes("novel")) return "novel";
    return "manga";
  }
  return type;
}

function getValue(m, key, fallback = "") {
  return m[key] ?? m.info?.[key] ?? fallback;
}

// ==================== CARD ====================
function createCardHTML(m, thumb, ch, isNew) {
  const type = detectType(m);
  return `
    <div class="card" data-slug="${m.slug}">
      <div class="thumb">
        ${m.status ? `<div class="status-badge ${m.status}">${m.status.toUpperCase()}</div>` : ""}
        ${type ? `<div class="type-badge ${type.replace(/\s+/g,'-')}">${type.toUpperCase()}</div>` : ""}
        ${ch !== null && ch !== undefined && ch !== "" ? `<div class="ch-badge">Ch. ${ch}</div>` : ""}
        ${isNew ? `<div class="up-badge">UP</div>` : ""}
        <img src="${thumb}" alt="${m.title}" loading="lazy">
        <div class="overlay">
          <div class="title">${m.title}</div>
        </div>
      </div>
    </div>
  `;
}

// ==================== RENDER + PAGINATION ====================
const FIREBASE_MAX_RESULTS = 12;

let firebaseMangaList = [];
let firebaseNovelList = [];
let firebaseMangaDisplayed = 0;
let firebaseNovelDisplayed = 0;

function updateFirebaseLoadMoreBtn() {
  const btn = document.getElementById("loadMoreFirebase") || document.getElementById("loadMoreBtnFirebase");
  if (!btn) return;

  const hasMore =
    firebaseMangaDisplayed < firebaseMangaList.length ||
    firebaseNovelDisplayed < firebaseNovelList.length;

  if (!hasMore) {
    btn.style.display = "none";
    btn.disabled = true;
  } else {
    btn.style.display = "";
    btn.disabled = false;
    btn.textContent = "Load more";
  }
}

function createCardAndAppend(container, m, index = 0) {
  const ch = getLastChapter(m);
  const isNew = m.updatedAt && (Date.now() - m.updatedAt < 86400000);
  const thumb = getThumbnail(m.cover || m.img || m.info?.cover || m.info?.img);
  const html = createCardHTML(m, thumb, ch, isNew);

  const temp = document.createElement("div");
  temp.innerHTML = html.trim();
  const card = temp.firstChild;

  if (card) {
    card.style.animationDelay = (index * 0.04) + "s";
    container.appendChild(card);
  }
}

function renderFirebaseBatch(isManga, items) {
  const el = isManga
    ? document.getElementById("firebaseManga")
    : document.getElementById("firebaseNovel");
  if (!el) return;

  items.forEach((m, i) => createCardAndAppend(el, m, i));

  if (isManga) {
    firebaseMangaDisplayed += items.length;
  } else {
    firebaseNovelDisplayed += items.length;
  }
  updateFirebaseLoadMoreBtn();
}

function renderData(data, isFromCache = false) {
  const mangaEl = document.getElementById("firebaseManga");
  const novelEl = document.getElementById("firebaseNovel");
  if (!mangaEl || !novelEl) return;

  mangaEl.innerHTML = "";
  novelEl.innerHTML = "";
  firebaseMangaList = [];
  firebaseNovelList = [];
  firebaseMangaDisplayed = 0;
  firebaseNovelDisplayed = 0;

  const list = Object.entries(data)
    .map(([slug, m]) => ({ slug, ...m }))
    .filter(m => m && m.title)
    .filter(m => {
      const origin = (m.origin || "").toLowerCase();
      const source = (m.source || "").toLowerCase();
      if (origin === "github") return false;
      if (source === "github") return false;
      if (m.githubSlug && origin !== "firestore" && source !== "firestore") return false;
      return true;
    })
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  for (const m of list) {
    const type = detectType(m);

    if (
      !type ||
      type.includes("manga") ||
      type.includes("manhwa") ||
      type.includes("manhua") ||
      type.includes("comic") ||
      type.includes("webtoon") ||
      type.includes("doujinshi") ||
      type.includes("cg")
    ) {
      firebaseMangaList.push(m);
    } else if (type.includes("novel")) {
      firebaseNovelList.push(m);
    } else {
      firebaseMangaList.push(m);
    }
  }

  renderFirebaseBatch(true, firebaseMangaList.slice(0, FIREBASE_MAX_RESULTS));
  renderFirebaseBatch(false, firebaseNovelList.slice(0, FIREBASE_MAX_RESULTS));
}

function loadMoreFirebase() {
  if (firebaseMangaDisplayed < firebaseMangaList.length) {
    const next = firebaseMangaList.slice(
      firebaseMangaDisplayed,
      firebaseMangaDisplayed + FIREBASE_MAX_RESULTS
    );
    renderFirebaseBatch(true, next);
  }

  if (firebaseNovelDisplayed < firebaseNovelList.length) {
    const next = firebaseNovelList.slice(
      firebaseNovelDisplayed,
      firebaseNovelDisplayed + FIREBASE_MAX_RESULTS
    );
    renderFirebaseBatch(false, next);
  }
}

// ==================== FETCH FIRESTORE ====================
async function fetchFirebase() {
  try {
    const q = window.fs.query(
      window.fs.collection(window.firestore, "manga"),
      window.fs.where("isDraft", "!=", true),
      window.fs.orderBy("updatedAt", "desc"),
      window.fs.limit(100)
    );
    const snapshot = await window.fs.getDocs(q);
    const data = {};
    snapshot.forEach(doc => {
      data[doc.id] = doc.data();
    });
    return data;
  } catch (err) {
    return fallbackFetch();
  }
}

async function fallbackFetch() {
  const snapshot = await window.fs.getDocs(
    window.fs.collection(window.firestore, "manga")
  );
  const data = {};
  snapshot.forEach(doc => {
    const d = doc.data();
    if (d.isDraft !== true) data[doc.id] = d;
  });
  return data;
}

// ==================== LOAD (Hybrid) ====================
async function loadFirebasePost() {
  const mangaEl = document.getElementById("firebaseManga");
  if (!mangaEl) return;

  const cache = loadCache();

  if (cache && cache.data) {
    renderData(cache.data, true);
  } else {
    if (typeof showFirebaseSkeleton === "function") {
      showFirebaseSkeleton(18);
    }
  }

  try {
    const freshData = await fetchFirebase();
    if (!freshData) return;

    const lightFresh = {};
    Object.entries(freshData).forEach(([slug, m]) => {
      const origin = String(m.origin || "").toLowerCase();
      const source = String(m.source || "").toLowerCase();
      if (origin === "github" || source === "github") return;

      const lastCh = getLastChapter(m);

      lightFresh[slug] = {
        slug,
        title: getValue(m, "title"),
        altTitle: getValue(m, "altTitle"),
        cover: getValue(m, "cover") || getValue(m, "img"),
        img: getValue(m, "img") || getValue(m, "cover"),
        type: getValue(m, "type"),
        status: getValue(m, "status"),
        rating: getValue(m, "rating", null),
        genres: getValue(m, "genres", []),
        author: getValue(m, "author"),
        artist: getValue(m, "artist"),
        circle: getValue(m, "circle"),
        series: getValue(m, "series"),
        publication: getValue(m, "publication"),
        serialization: getValue(m, "serialization"),
        updatedAt: m.updatedAt || 0,
        lastChapter: lastCh,
        lastChapterUpdated: m.lastChapterUpdated || lastCh,
        chapter: m.chapter,
        chapterCount: m.chapterCount,
        origin: m.origin || "firestore",
        source: m.source || "firestore"
      };
    });

    const cacheStr = cache ? JSON.stringify(cache.data) : null;
    const freshStr = JSON.stringify(lightFresh);

    if (cacheStr !== freshStr) {
      saveLightCache(freshData);
      renderData(freshData, false);
    } else {
      saveLightCache(freshData);
    }
  } catch (err) {
    console.error("❌ Error load Firestore:", err);
  }
}

// ==================== EVENT DELEGATION ====================
function setupCardClick() {
  document.addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if (!card) return;
    const slug = card.dataset.slug;
    if (!slug) return;
    window.location.href = `/series/${encodeURIComponent(slug)}`;
  });
}

// ==================== INIT ====================
const initFirebasePosts = () => {

  setupCardClick();

  const loadMoreBtn =
    document.getElementById("loadMoreFirebase") ||
    document.getElementById("loadMoreBtnFirebase");
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", loadMoreFirebase);
  }

  const start = () => {
    if (!window.firestore || !window.fs) {
      return setTimeout(start, 150);
    }

    loadFirebasePost();
    setInterval(() => {
      loadFirebasePost();
    }, 1000 * 60 * 10);
  };

  start();
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initFirebasePosts, { once: true });
} else {
  initFirebasePosts();
}