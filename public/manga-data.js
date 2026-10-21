// ==================== MANGA DATA LOADER (GitHub) ====================
if (window.__mangaDataLoaded) {
} else {
  window.__mangaDataLoaded = true;
  window.mangaData = window.mangaData || {};

  window.MANGA_CACHE_KEY = window.MANGA_CACHE_KEY || "manga_cache_v1";
  window.MANGA_CACHE_TIME = window.MANGA_CACHE_TIME || 1000 * 60 * 15;

  const MANGA_JSON_URL = "https://raw.githubusercontent.com/moemaomao/mymangadata/main/all-manga.json";
  const GITHUB_RAW = "https://raw.githubusercontent.com/moemaomao/mymangadata/main/";

  function normalizeTitle(title) {
    return String(title || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  }

  function ensureMangaData() {
    if (
      !window.mangaData ||
      typeof window.mangaData !== "object"
    ) {
      window.mangaData = {};
    }

    return window.mangaData;
  }

  function resolveCover(url) {
    if (!url || String(url).trim() === "" || String(url).trim() === "-") {
      return "";
    }
    url = String(url).replace(/\.$/, "").trim();
    if (!/^https?:\/\//i.test(url)) {
      url = GITHUB_RAW + url.replace(/^\//, "");
    }
    return url;
  }

  // ==================== LOAD DARI GITHUB ====================
  async function loadFromGitHub() {
    try {
      const cached = localStorage.getItem(window.MANGA_CACHE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.data && Date.now() - (parsed.time || 0) < window.MANGA_CACHE_TIME) {
            applyMangaList(parsed.data);
            return;
          }
        } catch (e) {}
      }

      const res = await fetch(MANGA_JSON_URL + "?t=" + Date.now());
      if (!res.ok) throw new Error("HTTP " + res.status);

      const list = await res.json();
      if (!Array.isArray(list)) throw new Error("JSON harus berupa array");

      try {
        localStorage.setItem(window.MANGA_CACHE_KEY, JSON.stringify({
          time: Date.now(),
          data: list
        }));
      } catch (e) {}

      applyMangaList(list);

    } catch (err) {}
  }

  function applyMangaList(list) {

    const data = ensureMangaData();

    list.forEach(item => {
      if (!item || !item.title) return;

      const title = item.title;
      const key = normalizeTitle(title);

      const slug = item.slug || title.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-");

      const manga = {
        title,
        slug,
        img: resolveCover(item.img || item.cover || ""),
        cover: resolveCover(item.cover || item.img || ""),
        desc: item.desc || "",
        genres: Array.isArray(item.genres) ? item.genres : [],
        rating: item.rating != null ? item.rating : "-",
        status: (item.status || "").toLowerCase(),
        type: (item.type || "manga").toLowerCase(),
        altTitle: item.altTitle || "",
        author: item.author || "-",
        artist: item.artist || "-",
        publication: item.publication || "-",
        serialization: item.serialization || "-",
        demographic: item.demographic || "-",
        github: true,
        info: item
      };

      data[key] = manga;
      data[slug] = manga;
    });
  }

  // ==================== FIRESTORE ====================
  async function loadFirestore() {

    if (!window.firestore || !window.fs) {
      return;
    }

    try {

      const snapshot = await window.fs.getDocs(
        window.fs.collection(window.firestore, "manga")
      );

      const data = ensureMangaData();

      snapshot.forEach(doc => {

        const m = doc.data();

        if (m.isDraft === true) return;

        const slug = doc.id;

        const manga = {
          ...m,
          slug,
          img: m.cover || m.img || "",
          cover: m.cover || m.img || "",
          firestore: true
        };

        const key = normalizeTitle(m.title);

        if (!key) return;

        data[key] = manga;
        data[slug] = manga;
      });

    } catch (err) {
      setTimeout(loadFirestore, 5000);
    }
  }

  // ==================== INIT ====================
  async function initMangaData() {

    ensureMangaData();

    // ====================
    // GITHUB
    // ====================
    await loadFromGitHub();

    // ====================
    // FIREBASE
    // ====================
    while (!window.firestore || !window.fs) {
      await new Promise(r => setTimeout(r, 100));
    }

    await loadFirestore();

    window.dispatchEvent(
      new Event("mangaDataReady")
    );
  }

  initMangaData();
}