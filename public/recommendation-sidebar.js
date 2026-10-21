(function () {
  "use strict";

  var CONFIG = {
    githubUrl: "https://raw.githubusercontent.com/moemaomao/mymangadata/main/all-manga.json",
    githubRawBase: "https://raw.githubusercontent.com/moemaomao/mymangadata/main/",
    recommendCount: 12,
    cacheKey: "mk_rec_sidebar_gh_fs_v3",
    cacheTTL: 1000 * 60 * 25,
    excludeCurrent: true
  };

  var allManga = [], mangaMap = {}, currentSlug = "", currentTitle = "";

  function normalizeKey(str) {
    return String(str || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function normalizeSlug(str) {
    return String(str || "").toLowerCase().trim()
      .replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function getSlugFromPage() {
    try {
      if (typeof getSlug === "function") {
        var s = getSlug();
        if (s) return s;
      }
    } catch (_) {}
    var path = (window.location.pathname || "").split("/").filter(Boolean);
    if (path[0] === "detail" && path[1]) return path[1];
    return new URLSearchParams(window.location.search).get("slug") || "";
  }

  function getCurrentTitle() {
    try {
      if (window.currentTitle) return window.currentTitle;
      if (window.currentManga && window.currentManga.title) return window.currentManga.title;
      var el = document.getElementById("detailTitle");
      if (el && el.textContent && el.textContent !== "Loading...") return el.textContent.trim();
    } catch (_) {}
    return "";
  }

  function resolveCover(url) {
    if (!url || String(url).trim() === "" || String(url).trim() === "-") return "";
    url = String(url).replace(/\.$/, "").trim();
    if (!/^https?:\/\//i.test(url)) url = CONFIG.githubRawBase + url.replace(/^\//, "");
    return url;
  }

  function resizeCover(url, w) {
    w = w || 120;
    var full = resolveCover(url);
    if (!full) {
      return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='170'%3E%3Crect width='120' height='170' fill='%231a1a1a'/%3E%3Ctext x='60' y='85' font-family='Arial' font-size='11' fill='%23666' text-anchor='middle'%3ENo Cover%3C/text%3E%3C/svg%3E";
    }
    if (full.indexOf("res.cloudinary.com") !== -1) {
      return full.replace("/upload/", "/upload/w_" + w + ",h_" + Math.round(w * 1.45) + ",c_fill,q_auto,f_auto/");
    }
    if (full.indexOf("blogger.googleusercontent.com") !== -1 ||
        full.indexOf("lh3.googleusercontent.com") !== -1 ||
        /\/s\d+(-c)?\//.test(full)) {
      return full.replace(/\/s\d+(-c)?\//, "/s" + w + "/");
    }
    if (full.indexOf("images.weserv.nl") !== -1) return full;
    return "https://images.weserv.nl/?url=" + encodeURIComponent(full) + "&w=" + w + "&q=65&output=webp";
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function getTimestamp(item) {
    if (!item) return 0;
    var keys = ["updatedAt", "latestUpdate", "published", "updated", "createdAt", "timestamp", "lastUpdate", "date"];
    for (var i = 0; i < keys.length; i++) {
      var v = item[keys[i]];
      if (v) {
        var t = new Date(v).getTime();
        if (!isNaN(t)) return t;
      }
    }
    return 0;
  }

  function getCache() {
    try {
      var raw = localStorage.getItem(CONFIG.cacheKey);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.data)) return null;
      if (Date.now() - (parsed.time || 0) > CONFIG.cacheTTL) return null;
      return parsed.data;
    } catch (_) { return null; }
  }

  function setCache(data) {
    try {
      localStorage.setItem(CONFIG.cacheKey, JSON.stringify({ time: Date.now(), data: data }));
    } catch (e) {
      try {
        Object.keys(localStorage).filter(function (k) { return k.indexOf("mk_rec") === 0; })
          .slice(0, 6).forEach(function (k) { localStorage.removeItem(k); });
        localStorage.setItem(CONFIG.cacheKey, JSON.stringify({ time: Date.now(), data: data }));
      } catch (_) {}
    }
  }

  function injectStyles() {
    if (document.getElementById("rec-sidebar-styles")) return;

    const css = `
#rec-sidebar-root{
  --card:rgba(255,255,255,.06);--border:rgba(255,255,255,.08);
  --text:#fff;--muted:#aaa;--accent:#a78bfa;
  position:relative;inset:auto;z-index:auto;
  width:calc(100% - 24px);max-width:720px;height:auto;max-height:none;
  margin:24px auto 44px;padding:0;overflow:visible;
  box-sizing:border-box;font-family:'Kodchasan',sans-serif;color:var(--text)
}
#rec-sidebar-root *,#rec-sidebar-root *:before,#rec-sidebar-root *:after{box-sizing:border-box}
#rec-sidebar-root[hidden],#rec-sidebar-show-button[hidden]{display:none!important}
html:not(.dark) #rec-sidebar-root{
  --card:rgba(0,0,0,.035);--border:rgba(0,0,0,.1);
  --text:#111;--muted:#555;--accent:#7c3aed
}

/* PANEL TANPA BACKGROUND */
#rec-sidebar-root .rec-panel{
  background:transparent;border:0;border-radius:0;
  padding:14px 0 16px;overflow:hidden
}

/* TITLE */
#rec-sidebar-root .rec-section-title{
  display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 14px 12px;
  font-size:15px;font-weight:700;color:var(--text)
}
#rec-sidebar-root .rec-section-title svg{color:var(--accent);flex-shrink:0}
#rec-sidebar-root .rec-heading{display:flex;align-items:center;gap:8px}
#rec-sidebar-root .rec-toggle{
  display:inline-flex;align-items:center;justify-content:center;
  width:28px;height:28px;padding:0;border:1px solid var(--border);
  border-radius:6px;background:transparent;color:var(--text);cursor:pointer;
  flex:0 0 28px
}
#rec-sidebar-root .rec-toggle:hover{background:var(--card)}
#rec-sidebar-root .rec-toggle svg{transition:transform .2s ease}
#rec-sidebar-show-button{
  --card:#fff;--border:rgba(0,0,0,.12);--text:#111;--accent:#7c3aed;
  position:fixed;top:50%;right:0;z-index:10000;display:flex;
  align-items:center;justify-content:center;width:36px;height:44px;
  border:1px solid var(--border);border-right:0;border-radius:8px 0 0 8px;
  background:var(--card);color:var(--text);cursor:pointer;
  box-shadow:0 2px 10px rgba(0,0,0,.16);transform:translateY(-50%)
}
html.dark #rec-sidebar-show-button{
  --card:#1a1a2e;--border:rgba(255,255,255,.16);--text:#fff;--accent:#a78bfa
}
#rec-sidebar-show-button:hover{background:var(--surface)}
#rec-sidebar-show-button svg{color:var(--accent)}
#rec-sidebar-show-button:focus-visible,#rec-sidebar-root .rec-toggle:focus-visible{
  outline:2px solid var(--accent);outline-offset:2px
}

/* LIST */
#rec-sidebar-root .rec-grid{
  display:flex;flex-direction:column;gap:8px;padding:0 14px 8px;
  max-height:65vh;overflow-x:hidden;overflow-y:auto;
  -webkit-overflow-scrolling:touch;scrollbar-width:thin
}

/* LIST ITEM */
#rec-sidebar-root .rec-card{
  display:flex;align-items:center;gap:9px;flex:0 0 auto;width:100%;max-width:none;
  height:82px;min-height:82px;padding:5px;text-decoration:none;color:inherit;border-radius:8px;overflow:hidden;
  background:var(--card);border:1px solid var(--border);
  transition:.18s ease
}
#rec-sidebar-root .rec-card:hover{
  transform:translateX(2px);border-color:rgba(167,139,250,.45);
  background:rgba(255,255,255,.1)
}
html.light #rec-sidebar-root .rec-card:hover{background:rgba(0,0,0,.06)}

/* COVER */
#rec-sidebar-root .rec-thumb{
  width:48px;height:70px;flex:0 0 48px;overflow:hidden;background:#1a1a1a;border-radius:4px
}
#rec-sidebar-root .rec-thumb img{
  display:block;width:100%;height:100%;object-fit:cover
}

/* TITLE */
#rec-sidebar-root .rec-title{
  min-width:0;padding:4px;font-size:12px;font-weight:600;line-height:1.35;
  text-align:left;white-space:normal;overflow:hidden;display:-webkit-box;
  -webkit-box-orient:vertical;-webkit-line-clamp:2;
  color:var(--text)
}

/* EMPTY / LOADING */
#rec-sidebar-root .rec-empty,#rec-sidebar-root .rec-loading{
  width:100%;padding:20px 14px;text-align:center;color:var(--muted);font-size:13px
}
#rec-sidebar-root .rec-loading i{
  display:block;margin-bottom:8px;font-size:22px;color:var(--accent)
}

/* TABLET */
@media(min-width:768px){
  #rec-sidebar-root{width:calc(100% - 40px);max-width:1150px}
  #rec-sidebar-root .rec-section-title{margin:0 18px 12px;font-size:16px}
  #rec-sidebar-root .rec-grid{padding:0 18px 8px}
}

@media(max-width:767px){
  #rec-sidebar-root{height:auto!important;margin-bottom:8px}
  #rec-sidebar-root .rec-grid{max-height:440px;gap:12px}
  #rec-sidebar-root .rec-card:nth-child(n+6){display:none}
}

/* DESKTOP */
@media(min-width:1024px){
  #rec-sidebar-root{
    position:absolute;top:30px;right:20px;
    width:var(--sidebar-width,280px);max-width:none;
    height:auto;max-height:none;margin:0;padding:0;overflow:visible
  }
  #rec-sidebar-root .rec-section-title{margin:0 0 12px;font-size:16px}
  #rec-sidebar-root .rec-panel{display:flex;flex-direction:column;height:100%;padding:0}
  #rec-sidebar-root .rec-grid{flex:1;min-height:0;max-height:none;padding:0 0 8px}
  #rec-sidebar-root .rec-title{font-size:11px}
}
`;

    const style = document.createElement("style");
    style.id = "rec-sidebar-styles";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function injectHTML() {
    if (document.getElementById("rec-sidebar-root")) return;

    var root = document.createElement("aside");
    root.id = "rec-sidebar-root";
    root.setAttribute("aria-label", "Rekomendasi Manga");
    root.innerHTML =
      '<div class="rec-panel">' +
      '<h3 class="rec-section-title">' +
      '<span class="rec-heading">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>' +
      "Rekomendasi</span>" +
      '<button type="button" class="rec-toggle" id="rec-toggle-button" aria-label="Sembunyikan rekomendasi" title="Sembunyikan rekomendasi" aria-expanded="true" aria-controls="rec-sidebar-root">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>' +
      "</button></h3>" +
      '<div class="rec-grid" id="rec-recommend-grid">' +
      '<div class="rec-loading"><i class="fas fa-spinner fa-spin"></i>Memuat...</div>' +
      "</div></div>";

    var toggle = root.querySelector("#rec-toggle-button");
    var showButton = document.createElement("button");
    showButton.id = "rec-sidebar-show-button";
    showButton.type = "button";
    showButton.hidden = true;
    showButton.setAttribute("aria-label", "Tampilkan rekomendasi");
    showButton.title = "Tampilkan rekomendasi";
    showButton.setAttribute("aria-controls", "rec-sidebar-root");
    showButton.innerHTML =
      '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>';

    function showRecommendations() {
      root.hidden = false;
      showButton.hidden = true;
      root.parentElement?.classList.remove("recommendations-hidden");
      toggle.focus();
    }

    if (toggle) {
      toggle.addEventListener("click", function () {
        root.hidden = true;
        showButton.hidden = false;
        root.parentElement?.classList.add("recommendations-hidden");
        showButton.focus();
      });
    }
    showButton.addEventListener("click", showRecommendations);

    var container = document.querySelector(".container");
    var footer = document.getElementById("site-footer");
    if (container && container.parentNode) {
      container.parentNode.insertBefore(root, container.nextSibling || null);
    } else if (footer && footer.parentNode) {
      footer.parentNode.insertBefore(root, footer);
    } else {
      document.body.appendChild(root);
    }
    document.body.appendChild(showButton);

    if (container && "ResizeObserver" in window) {
      var heightObserver = new ResizeObserver(function () {
        if (!root.isConnected) {
          heightObserver.disconnect();
          return;
        }
        root.style.height = container.offsetHeight + "px";
      });
      heightObserver.observe(container);
      root.style.height = container.offsetHeight + "px";
      window.addEventListener("mikoroku:cleanup-recommendations", function cleanup() {
        heightObserver.disconnect();
        window.removeEventListener("mikoroku:cleanup-recommendations", cleanup);
      });
    }
  }

  function buildFullManga(item, source) {
    if (!item) return null;
    var title = item.title || item.name || "";
    if (!title) return null;

    var cover = resolveCover(item.img || item.cover || item.image || "");
    var slug = item.slug || normalizeSlug(title);

    return {
      key: normalizeKey(title),
      slug: slug,
      title: title,
      altTitle: item.altTitle || item.alternative || item.alt_title || "",
      img: cover,
      cover: cover,
      desc: item.desc || item.description || item.synopsis || item.sinopsis || "",
      genres: Array.isArray(item.genres)
        ? item.genres
        : item.genre
        ? [].concat(item.genre)
        : [],
      rating: item.rating != null ? item.rating : null,
      status: String(item.status || "unknown").toLowerCase(),
      type: String(item.type || "manga").toLowerCase(),
      author: item.author || item.authors || "-",
      artist: item.artist || item.artists || "-",
      publication: item.publication || item.year || "-",
      serialization: item.serialization || "-",
      demographic: item.demographic || "-",
      series: item.series || "",
      characters: item.characters || "",
      circle: item.circle || "",
      group: item.group || "",
      femaleTags: item.femaleTags || item.female_tags || [],
      maleTags: item.maleTags || item.male_tags || [],
      source: source || item.source || "github",
      updatedAt: getTimestamp(item),
      timestamp: getTimestamp(item),
      managedByAdmin: !!item.managedByAdmin,
      isUp: !!item.isUp,
      info: item
    };
  }

  function upsert(item) {
    if (!item || !item.title) return;
    var key = item.key || normalizeKey(item.title);
    if (!key) return;
    item.key = key;
    if (!item.slug) item.slug = normalizeSlug(item.title);

    if (mangaMap[key]) {
      var old = mangaMap[key];
      mangaMap[key] = Object.assign({}, old, item, {
        title: item.title || old.title,
        slug: item.slug || old.slug,
        img: item.img || item.cover || old.img || old.cover,
        cover: item.cover || item.img || old.cover || old.img,
        desc: (item.desc && item.desc.length > (old.desc || "").length) ? item.desc : (old.desc || item.desc || ""),
        altTitle: item.altTitle || old.altTitle || "",
        genres: (item.genres && item.genres.length) ? item.genres : (old.genres || []),
        rating: item.rating != null ? item.rating : old.rating,
        status: item.status && item.status !== "unknown" ? item.status : (old.status || "unknown"),
        type: item.type && item.type !== "manga" ? item.type : (old.type || "manga"),
        author: (item.author && item.author !== "-") ? item.author : (old.author || "-"),
        artist: (item.artist && item.artist !== "-") ? item.artist : (old.artist || "-"),
        publication: (item.publication && item.publication !== "-") ? item.publication : (old.publication || "-"),
        serialization: item.serialization || old.serialization || "-",
        demographic: item.demographic || old.demographic || "-",
        series: item.series || old.series || "",
        characters: item.characters || old.characters || "",
        circle: item.circle || old.circle || "",
        group: item.group || old.group || "",
        femaleTags: (item.femaleTags && item.femaleTags.length) ? item.femaleTags : (old.femaleTags || []),
        maleTags: (item.maleTags && item.maleTags.length) ? item.maleTags : (old.maleTags || []),
        updatedAt: Math.max(item.updatedAt || item.timestamp || 0, old.updatedAt || old.timestamp || 0),
        timestamp: Math.max(item.timestamp || item.updatedAt || 0, old.timestamp || old.updatedAt || 0),
        managedByAdmin: !!(item.managedByAdmin || old.managedByAdmin),
        source: item.source || old.source,
        info: item.info || old.info || item
      });
    } else {
      mangaMap[key] = item;
    }
  }

  function rebuildList() {
    allManga = Object.keys(mangaMap).map(function (k) { return mangaMap[k]; });
  }

  function saveToCache() {
    rebuildList();
    if (allManga.length) setCache(allManga);
  }

  function buildCard(m) {
    var slug = escapeHtml(m.slug || normalizeSlug(m.title));
    var title = escapeHtml(m.title || "Untitled");
    var thumb = resizeCover(m.img || m.cover, 140);
    return (
      '<a class="rec-card" href="/series/' + encodeURIComponent(slug) + '" title="' + title + '" data-key="' + escapeHtml(m.key || "") + '">' +
      '<div class="rec-thumb"><img src="' + thumb + '" loading="lazy" alt="' + title +
      '" onerror="this.onerror=null;this.src=\'data:image/svg+xml,%3Csvg xmlns=\\\'http://www.w3.org/2000/svg\\\' width=\\\'120\\\' height=\\\'170\\\'%3E%3Crect fill=\\\'%231a1a1a\\\' width=\\\'120\\\' height=\\\'170\\\'/%3E%3C/svg%3E\'"></div>' +
      '<div class="rec-title">' + title + "</div></a>"
    );
  }

  function filterExclude(list) {
    if (!CONFIG.excludeCurrent) return list;
    var curKey = normalizeKey(currentTitle || currentSlug);
    var curSlug = normalizeSlug(currentSlug || currentTitle);
    return list.filter(function (m) {
      if (!m) return false;
      var k = normalizeKey(m.title || m.key);
      var s = normalizeSlug(m.slug || m.title);
      return !(curKey && (k === curKey || s === curSlug));
    });
  }

  function pickRecommend(list) {
    var pool = filterExclude(list);
    var currentGenres = [];
    try {
      var cm = window.currentManga;
      if (cm) {
        currentGenres = [].concat(cm.genres || []).concat((cm.info && cm.info.genres) || [])
          .map(function (g) { return String(g).toLowerCase().trim(); }).filter(Boolean);
      }
    } catch (_) {}

    if (currentGenres.length) {
      var scored = pool.map(function (m) {
        var g = (m.genres || []).map(function (x) { return String(x).toLowerCase(); });
        var score = 0;
        currentGenres.forEach(function (cg) { if (g.indexOf(cg) !== -1) score++; });
        return { m: m, score: score };
      });
      scored.sort(function (a, b) { return b.score - a.score || Math.random() - 0.5; });
      var top = scored.filter(function (x) { return x.score > 0; }).map(function (x) { return x.m; });
      var rest = scored.filter(function (x) { return x.score === 0; }).map(function (x) { return x.m; });
      var result = top.slice(0, CONFIG.recommendCount);
      if (result.length < CONFIG.recommendCount) {
        result = result.concat(shuffle(rest).slice(0, CONFIG.recommendCount - result.length));
      }
      return result.slice(0, CONFIG.recommendCount);
    }
    return shuffle(pool).slice(0, CONFIG.recommendCount);
  }

  function renderRecommend() {
    var grid = document.getElementById("rec-recommend-grid");
    if (!grid) return;
    var picks = pickRecommend(allManga);
    grid.innerHTML = picks.length
      ? picks.map(buildCard).join("")
      : '<div class="rec-empty">Belum ada rekomendasi</div>';
  }

  function renderAll() {
    rebuildList();
    renderRecommend();
  }

  function loadFromGithub() {
    return new Promise(function (resolve) {
      fetch(CONFIG.githubUrl + "?t=" + Date.now())
        .then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          return res.json();
        })
        .then(function (list) {
          if (!Array.isArray(list)) throw new Error("JSON harus array");
          list.forEach(function (item) {
            if (!item) return;
            var full = buildFullManga(item, "github");
            if (full) upsert(full);
          });
          saveToCache();
          renderAll();
          resolve();
        })
        .catch(function () {
          resolve();
        });
    });
  }

  function processMangaData() {
    var data = window.mangaData;
    if (!data || typeof data !== "object") return 0;
    var added = 0;
    Object.keys(data).forEach(function (k) {
      var m = data[k];
      if (!m || !m.title) return;
      var full = Object.assign({}, m, {
        key: normalizeKey(m.title),
        source: m.source || (m.firestore || m.source === "firestore" ? "firestore" : "local")
      });
      if (!full.img && !full.cover) {
        full.img = full.cover = resolveCover(m.cover || m.img || "");
      }
      upsert(full);
      added++;
    });
    return added;
  }

  function loadFirestore() {
    return new Promise(function (resolve) {
      function done() {
        var n = processMangaData();
        if (n) {
          saveToCache();
          renderAll();
        }
        resolve();
      }
      if (window.mangaData && Object.keys(window.mangaData).length) {
        done();
        return;
      }
      window.addEventListener("mangaDataReady", done, { once: true });
      setTimeout(function () {
        if (window.mangaData) done();
        else resolve();
      }, 3500);
    });
  }

  async function loadFirestoreDirect() {
    try {
      if (!window.fs || !window.firestore) return;
      var colRef = window.fs.collection(window.firestore, "manga");
      var snap = await window.fs.getDocs(colRef);
      if (!snap || snap.empty) return;
      snap.forEach(function (doc) {
        var d = doc.data() || {};
        var title = d.title || doc.id;
        if (!title) return;
        var full = buildFullManga(
          Object.assign({}, d, {
            title: title,
            slug: d.slug || normalizeSlug(title) || doc.id
          }),
          "firestore"
        );
        if (full) {
          full.managedByAdmin = !!d.managedByAdmin;
          upsert(full);
        }
      });
      saveToCache();
      renderAll();
    } catch (e) {}
  }

  document.addEventListener("click", function (e) {
    var card = e.target.closest && e.target.closest("#rec-sidebar-root .rec-card");
    if (!card) return;
    var key = card.getAttribute("data-key");
    if (!key || !mangaMap[key]) return;
    try {
      var m = mangaMap[key];
      var toSave = {
        slug: m.slug,
        title: m.title,
        altTitle: m.altTitle || "",
        img: m.img || m.cover || "",
        cover: m.cover || m.img || "",
        desc: m.desc || "",
        genres: Array.isArray(m.genres) ? m.genres : [],
        rating: m.rating != null ? m.rating : null,
        status: m.status || "unknown",
        type: m.type || "manga",
        author: m.author || "-",
        artist: m.artist || "-",
        publication: m.publication || "-",
        serialization: m.serialization || "-",
        demographic: m.demographic || "-",
        series: m.series || "",
        characters: m.characters || "",
        circle: m.circle || "",
        group: m.group || "",
        femaleTags: m.femaleTags || [],
        maleTags: m.maleTags || [],
        source: m.source || "github",
        updatedAt: m.updatedAt || m.timestamp || 0,
        managedByAdmin: !!m.managedByAdmin,
        info: m.info || m
      };
      localStorage.setItem("currentManga", JSON.stringify(toSave));
    } catch (_) {}
  });

  function init() {
    currentSlug = getSlugFromPage();
    currentTitle = getCurrentTitle();
    injectStyles();
    injectHTML();

    var titleEl = document.getElementById("detailTitle");
    if (titleEl) {
      new MutationObserver(function () {
        var t = getCurrentTitle();
        if (t && t !== currentTitle) {
          currentTitle = t;
          currentSlug = getSlugFromPage() || currentSlug;
          if (allManga.length) renderAll();
        }
      }).observe(titleEl, { childList: true, characterData: true, subtree: true });
    }

    var cached = getCache();
    if (cached && cached.length) {
      cached.forEach(function (item) { upsert(item); });
      renderAll();
    }

    Promise.all([loadFromGithub(), loadFirestore(), loadFirestoreDirect()]).then(function () {
      rebuildList();
      if (!allManga.length) {
        var g = document.getElementById("rec-recommend-grid");
        if (g) g.innerHTML = '<div class="rec-empty">Tidak ada data rekomendasi</div>';
      } else {
        renderAll();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    setTimeout(init, 400);
  }
})();