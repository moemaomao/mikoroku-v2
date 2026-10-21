const initHeader = () => {
  const el = document.getElementById("site-header");
  if (!el || el.querySelector("#mainHeader")) return;

  el.innerHTML = `
<header id="mainHeader">
  <div class="header-left">
    <button id="sidebarToggle" class="hamburger-btn" aria-label="Menu" aria-expanded="false">
      <span class="sr-only">Menu</span>
      <svg class="burger-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="28" height="28" fill="currentColor" aria-hidden="true">
        <path class="bun-top" d="M8 22c0-9 10-14 24-14s24 5 24 14H8z"/>
        <g class="sesame">
          <circle cx="20" cy="13" r="1.6" fill="#fff" fill-opacity="0.85"/>
          <circle cx="28" cy="11" r="1.6" fill="#fff" fill-opacity="0.85"/>
          <circle cx="36" cy="12" r="1.6" fill="#fff" fill-opacity="0.85"/>
          <circle cx="44" cy="14" r="1.6" fill="#fff" fill-opacity="0.85"/>
          <circle cx="24" cy="17" r="1.4" fill="#fff" fill-opacity="0.85"/>
          <circle cx="40" cy="16" r="1.4" fill="#fff" fill-opacity="0.85"/>
        </g>
        <rect class="patty" x="10" y="28" width="44" height="8" rx="3"/>
        <path class="bun-bottom" d="M8 42h48c0 6-10 10-24 10S8 48 8 42z"/>
      </svg>
    </button>

     <div class="logo" id="headerLogo" onclick="window.location.href='/'">
    <img src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhlpxqlAz__8_IHcJpy_JsiuX2dr0ompUWEoaUjtk279x167sNP1AphlLYw92AECMAcyXEg4bSnNcGnKZ86a3KEFGHwyi1huUIJ52zejDYkSeeTEnCL4Loig440EuS6yyeKZjmnAdkdcxsic5rArUT_bwv2Sk4lJgDXSYFSWLBawxBPBjGZPTS-pp2xTsc/s100/MIKOROKU.png" alt="Mikoroku">
   </div>
  </div>

  <div class="header-center">
    <div class="search-wrapper">
      <input type="text" id="searchManga" placeholder="Search manga..." autocomplete="off">
      <div id="searchResults" class="search-results"></div>
    </div>
  </div>

  <div class="header-right">
    <a id="announcementLink" class="icon-btn announcement-link" href="/announcements" aria-label="Announcements" title="Announcements">
      <span class="sr-only">Announcements</span>
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path>
        <path d="M10 21h4"></path>
      </svg>
      <span id="announcementBadge" class="announcement-badge" aria-hidden="true" hidden></span>
    </a>
    <button id="darkModeToggle" class="icon-btn" aria-label="Dark mode">
      <span class="sr-only">Dark mode</span>
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <circle class="sun" cx="12" cy="12" r="5"></circle>
        <line class="sun" x1="12" y1="1" x2="12" y2="3"></line>
        <line class="sun" x1="12" y1="21" x2="12" y2="23"></line>
        <line class="sun" x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line class="sun" x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line class="sun" x1="1" y1="12" x2="3" y2="12"></line>
        <line class="sun" x1="21" y1="12" x2="23" y2="12"></line>
        <line class="sun" x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line class="sun" x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        <path class="moon" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"></path>
      </svg>
    </button>

    <div class="bookmark-dropdown">
      <button id="headerBookmarkBtn" class="icon-btn" aria-label="Bookmark">
        <span class="sr-only">Bookmark</span>
        <svg id="headerBookmarkIcon" class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M6 4h12v18l-6-4-6 4V4z"/>
        </svg>
      </button>
      <div class="bookmark-content" id="bookmarkContent">
        <div class="bookmark-empty">You have no bookmarks yet!</div>
      </div>
    </div>

    <div class="header-auth">
      <button id="headerAuthBtn" class="icon-btn" aria-label="Account" title="Account">
        <span class="sr-only">Account</span>
        <i id="authIcon" class="fas fa-user" aria-hidden="true"></i>
      </button>
      <div id="authDropdown" class="auth-dropdown">
        <div id="authContent"></div>
      </div>
    </div>
  </div>
</header>

<div id="siteSidebarOverlay" class="site-sidebar-overlay" aria-hidden="true"></div>
<aside id="siteSidebar"
       class="site-sidebar"
       aria-hidden="true"
       inert
       aria-label="Navigation menu">
  <div class="site-sidebar-header">
  <div class="sidebar-logo" id="sidebarLogo" onclick="window.location.href='/'">
    <img src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhlpxqlAz__8_IHcJpy_JsiuX2dr0ompUWEoaUjtk279x167sNP1AphlLYw92AECMAcyXEg4bSnNcGnKZ86a3KEFGHwyi1huUIJ52zejDYkSeeTEnCL4Loig440EuS6yyeKZjmnAdkdcxsic5rArUT_bwv2Sk4lJgDXSYFSWLBawxBPBjGZPTS-pp2xTsc/s100/MIKOROKU.png" alt="Mikoroku">
  </div>
    <button type="button" id="sidebarClose" class="site-sidebar-close" aria-label="Close menu">
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  </div>

  <nav class="site-sidebar-nav">
    <a href="/manga-list" class="site-sidebar-item">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
      Manga List
    </a>
    <a href="/hentai-list" class="site-sidebar-item">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
      Hentai List
    </a>
    <a href="/genre-list" class="site-sidebar-item">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10H7z"/><path d="M7 3v4"/><path d="M17 3v4"/><path d="M7 17v4"/><path d="M17 17v4"/></svg>
      Genre List
    </a>
    <a href="/bookmark" class="site-sidebar-item">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4h12v18l-6-4-6 4V4z"/></svg>
      Bookmark
    </a>
    <a href="" onclick="showHistory(); return false;" class="site-sidebar-item">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><polyline points="3 4 3 10 9 10"/><path d="M12 7v5l3 2"/></svg>
      History
    </a>
    <a href="/commission" class="site-sidebar-item">
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
  Commission
</a>

    <div class="site-sidebar-divider"></div>

    <a href="https://discord.gg/kkt669knaG" target="_blank" rel="noopener noreferrer" class="site-sidebar-item">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      Discord
    </a>
    <a href="https://trakteer.id/mikorokuscan" target="_blank" rel="noopener noreferrer" class="site-sidebar-item">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
      Donation
    </a>
    <a href="/admin" class="site-sidebar-item">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      Admin Panel
    </a>
  </nav>
</aside>
  `;

  if (!document.querySelector('link[data-fa]')) {
    const fa = document.createElement("link");
    fa.rel = "stylesheet";
    fa.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css";
    fa.setAttribute("data-fa", "true");
    document.head.appendChild(fa);
  }

  if (!document.querySelector('link[data-main-style]')) {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "style.css";
    css.setAttribute("data-main-style", "true");
    document.head.appendChild(css);
  }

const sidebar = document.getElementById("siteSidebar");
const sidebarOverlay = document.getElementById("siteSidebarOverlay");
const sidebarToggle = document.getElementById("sidebarToggle");
const sidebarClose = document.getElementById("sidebarClose");
const SIDEBAR_PREF_KEY = "mk_sidebar_open";

function isDesktop() {
  return window.matchMedia("(min-width: 769px)").matches;
}

function openSiteSidebar() {
  sidebar?.classList.add("active");
  sidebarToggle?.classList.add("active");
  sidebarToggle?.setAttribute("aria-expanded", "true");
  sidebar?.setAttribute("aria-hidden", "false");
  sidebar?.removeAttribute("inert");

  if (isDesktop()) {
    document.body.classList.remove("left-sidebar-closed");
    document.body.classList.add("sidebar-open");
    sidebarOverlay?.classList.remove("active");
    sidebarOverlay?.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    try { localStorage.setItem(SIDEBAR_PREF_KEY, "1"); } catch (_) {}
  } else {
    document.body.classList.remove("sidebar-open");
    sidebarOverlay?.classList.add("active");
    sidebarOverlay?.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
}

function closeSiteSidebar() {
  sidebar?.classList.remove("active");
  sidebarOverlay?.classList.remove("active");
  sidebarToggle?.classList.remove("active");
  sidebarToggle?.setAttribute("aria-expanded", "false");
  sidebar?.setAttribute("aria-hidden", "true");
  sidebar?.setAttribute("inert", "");
  sidebarOverlay?.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";

  if (isDesktop()) {
    document.body.classList.add("left-sidebar-closed");
    document.body.classList.remove("sidebar-open");
    try { localStorage.setItem(SIDEBAR_PREF_KEY, "0"); } catch (_) {}
  }
}

sidebarToggle?.addEventListener("click", (e) => {
  e.stopPropagation();
  if (isDesktop()) {
    document.body.classList.contains("left-sidebar-closed") ? openSiteSidebar() : closeSiteSidebar();
  } else {
    sidebar?.classList.contains("active") ? closeSiteSidebar() : openSiteSidebar();
  }
});

sidebarClose?.addEventListener("click", closeSiteSidebar);
sidebarOverlay?.addEventListener("click", closeSiteSidebar);

sidebar?.querySelectorAll("a.site-sidebar-item").forEach((a) => {
  a.addEventListener("click", () => { if (!isDesktop()) closeSiteSidebar(); });
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && sidebar?.classList.contains("active")) closeSiteSidebar();
});

function initSidebarDesktop() {
  if (!isDesktop()) { closeSiteSidebar(); return; }
  let preferOpen = true;
  try {
    const saved = localStorage.getItem(SIDEBAR_PREF_KEY);
    if (saved === "0") preferOpen = false;
    if (saved === "1") preferOpen = true;
  } catch (_) {}
  
  if (preferOpen) {
    openSiteSidebar();
  } else {
    closeSiteSidebar();
  }
}

initSidebarDesktop();

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (isDesktop()) initSidebarDesktop();
    else closeSiteSidebar();
  }, 150);
});

  /* ========== AUTH + AVATAR SYNC ========== */
  const authBtn = document.getElementById("headerAuthBtn");
  const authDropdown = document.getElementById("authDropdown");
  const authContent = document.getElementById("authContent");
  const DEFAULT_AVATAR = "/assets/icons/favicon.ico";
  const DISPLAY_NAME_KEY = "commentWidget_displayName";
  const AVATAR_KEY = "commentWidget_avatar";

  function getCurrentUser() {
    return (
      window.currentUser ||
      (typeof firebase !== "undefined" && firebase.auth
        ? firebase.auth().currentUser
        : null)
    );
  }

  async function resolveUserAvatar(user) {
    if (!user) return DEFAULT_AVATAR;

    const stats =
      (window.userStatsCache && window.userStatsCache[user.uid]) || null;
    if (stats && stats.avatar) {
      try { localStorage.setItem(AVATAR_KEY, stats.avatar); } catch (_) {}
      return stats.avatar;
    }

    try {
      const cached = localStorage.getItem(AVATAR_KEY);
      if (cached && cached.startsWith("http")) return cached;
    } catch (_) {}

    try {
      if (typeof firebase !== "undefined" && firebase.firestore) {
        const doc = await firebase
          .firestore()
          .collection("userStats")
          .doc(user.uid)
          .get();
        if (doc.exists) {
          const data = doc.data() || {};
          if (!window.userStatsCache) window.userStatsCache = {};
          if (!window.userStatsCache[user.uid]) window.userStatsCache[user.uid] = {};
          Object.assign(window.userStatsCache[user.uid], data);
          if (data.avatar) {
            try { localStorage.setItem(AVATAR_KEY, data.avatar); } catch (_) {}
            return data.avatar;
          }
        }
      }
    } catch (e) {
      console.warn("resolveUserAvatar firestore:", e);
    }

    return user.photoURL || DEFAULT_AVATAR;
  }

  function resolveDisplayName(user) {
    if (!user) return "User";
    const stats =
      (window.userStatsCache && window.userStatsCache[user.uid]) || null;
    if (stats?.displayName) return stats.displayName;
    if (stats?.username) return stats.username;
    try {
      const cached = localStorage.getItem(DISPLAY_NAME_KEY);
      if (cached) return cached;
    } catch (_) {}
    return user.displayName || user.email?.split("@")[0] || "User";
  }

  function setHeaderAvatarImg(photo, displayName) {
    if (!authBtn) return;
    authBtn.setAttribute("aria-label", `Account (${displayName || "User"})`);
    authBtn.innerHTML = `
      <img
        src="${photo}"
        alt=""
        aria-hidden="true"
        onerror="this.src='${DEFAULT_AVATAR}'"
        style="width:28px;height:28px;border-radius:50%;object-fit:cover;border:1px solid #3533332f;">
    `;
  }

  window.updateHeaderAuth = async function () {
    if (!authBtn) return;
    const user = getCurrentUser();

    if (user) {
      const displayName = resolveDisplayName(user);
      window.commentDisplayName = displayName;

      const quickPhoto =
        (window.userStatsCache && window.userStatsCache[user.uid]?.avatar) ||
        localStorage.getItem(AVATAR_KEY) ||
        user.photoURL ||
        DEFAULT_AVATAR;
      setHeaderAvatarImg(quickPhoto, displayName);
      window._headerAvatar = quickPhoto;

      try {
        const photo = await resolveUserAvatar(user);
        window._headerAvatar = photo;
        setHeaderAvatarImg(photo, displayName);
      } catch (_) {}
    } else {
      window.commentDisplayName = null;
      window._headerAvatar = null;
      try { localStorage.removeItem(AVATAR_KEY); } catch (_) {}
      authBtn.innerHTML = `<i class="fas fa-user"></i>`;
    }

    authBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      renderAuthDropdown(getCurrentUser());
      authDropdown.classList.toggle("open");
    };
  };

  window.syncHeaderDisplayName = function (name) {
    if (!name) return;
    window.commentDisplayName = name;
    try { localStorage.setItem(DISPLAY_NAME_KEY, name); } catch (_) {}
    if (getCurrentUser()) {
      window.updateHeaderAuth();
      if (authDropdown?.classList.contains("open")) {
        renderAuthDropdown(getCurrentUser());
      }
    }
  };

  window.syncHeaderAvatar = function (avatarUrl) {
    if (!avatarUrl) return;
    try { localStorage.setItem(AVATAR_KEY, avatarUrl); } catch (_) {}
    const user = getCurrentUser();
    if (user) {
      if (!window.userStatsCache) window.userStatsCache = {};
      if (!window.userStatsCache[user.uid]) window.userStatsCache[user.uid] = {};
      window.userStatsCache[user.uid].avatar = avatarUrl;
    }
    window._headerAvatar = avatarUrl;
    setHeaderAvatarImg(avatarUrl, window.commentDisplayName || "User");
  };

  function renderAuthDropdown(user) {
    if (user) {
      const displayName = resolveDisplayName(user);
      authContent.innerHTML = `
        <div style="padding:12px 16px;border-bottom:1px solid rgba(0,0,0,.1);text-align:left;">
          <div style="font-size:15px;font-weight:700;">${displayName}</div>
          <div style="font-size:12px;color:#888;margin-top:2px;">${user.email || ""}</div>
        </div>
        <a href="" onclick="showUserProfile('${user.uid}'); closeAuthDropdown(); return false;" style="display:block;padding:10px 16px;color:inherit;text-decoration:none;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-3px;margin-right:8px;"><circle cx="12" cy="8" r="4"></circle><path d="M4 20c0-4 3.5-6 8-6s8 2 8 6"></path></svg>
          Profil
        </a>
        <a href="" onclick="closeAuthDropdown(); if(typeof loadUserNotifications==='function'){loadUserNotifications();} const overlay=document.getElementById('reply-notif-overlay'); if(overlay) overlay.style.display='flex'; return false;" style="display:block;padding:10px 14px;text-decoration:none;color:inherit;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-3px;margin-right:8px;"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          Notifications
        </a>
        <a href="" onclick="closeAuthDropdown(); const btn=document.getElementById('dm-btn'); if(btn){btn.click();} else if(typeof loadDmInbox==='function'){ const modal=document.getElementById('dm-modal'); if(modal) modal.style.display='flex'; loadDmInbox(); } return false;" style="display:block;padding:10px 14px;text-decoration:none;color:inherit;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-3px;margin-right:8px;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          Direct Messages
        </a>
        <a href="/settings" style="display:block;padding:10px 14px;text-decoration:none;color:inherit;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-3px;margin-right:8px;">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.8 1.8 0 0 0 .36 2l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.8 1.8 0 0 0-2-.36 1.8 1.8 0 0 0-1.1 1.65V21a2 2 0 1 1-4 0v-.09a1.8 1.8 0 0 0-1.1-1.65 1.8 1.8 0 0 0-2 .36l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.8 1.8 0 0 0 .36-2 1.8 1.8 0 0 0-1.65-1.1H3a2 2 0 1 1 0-4h.09a1.8 1.8 0 0 0 1.65-1.1 1.8 1.8 0 0 0-.36-2l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.8 1.8 0 0 0 2 .36h.01a1.8 1.8 0 0 0 1.09-1.65V3a2 2 0 1 1 4 0v.09a1.8 1.8 0 0 0 1.1 1.65 1.8 1.8 0 0 0 2-.36l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.8 1.8 0 0 0-.36 2v.01a1.8 1.8 0 0 0 1.65 1.09H21a2 2 0 1 1 0 4h-.09a1.8 1.8 0 0 0-1.51.99z"></path>
          </svg>
         Settings
       </a>
        <hr style="margin:4px 0;border:none;border-top:1px solid rgba(0,0,0,.08);">
        <a href="" onclick="firebase.auth().signOut(); closeAuthDropdown(); return false;" style="display:block;padding:10px 16px;color:#e53935;font-weight:600;text-decoration:none;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-3px;margin-right:8px;"><path d="M10 17l5-5-5-5"></path><path d="M15 12H3"></path><path d="M21 19V5a2 2 0 0 0-2-2h-6"></path></svg>
          Logout
        </a>
      `;
    } else {
      authContent.innerHTML = `
        <div style="padding:16px;">
          <p style="margin:0 0 12px;font-weight:600;text-align:center;">Login with</p>
          <button onclick="triggerLogin('email'); closeAuthDropdown()" style="width:100%;padding:11px;margin-bottom:8px;background:#4f46e5;color:#fff;border:none;border-radius:8px;cursor:pointer;">
            <i class="fas fa-envelope"></i> Email
          </button>
          <button onclick="triggerLogin('google'); closeAuthDropdown()" style="width:100%;padding:11px;margin-bottom:8px;background:#fff;border:1px solid #ccc;border-radius:8px;cursor:pointer;">
            <i class="fab fa-google"></i> Google
          </button>
          <button onclick="triggerLogin('github'); closeAuthDropdown()" style="width:100%;padding:11px;margin-bottom:8px;background:#333;color:#fff;border:none;border-radius:8px;cursor:pointer;">
            <i class="fab fa-github"></i> GitHub
          </button>
          <button onclick="triggerLogin('facebook'); closeAuthDropdown()" style="width:100%;padding:11px;margin-bottom:8px;background:#1877f2;color:#fff;border:none;border-radius:8px;cursor:pointer;">
            <i class="fab fa-facebook-f"></i> Facebook
          </button>
          <button onclick="triggerLogin('twitter'); closeAuthDropdown()" style="width:100%;padding:11px;background:#000;color:#fff;border:none;border-radius:8px;cursor:pointer;">
            <i class="fab fa-x-twitter"></i> (Twitter)
          </button>
        </div>
      `;
    }
  }

  window.closeAuthDropdown = function () {
    authDropdown?.classList.remove("open");
  };

  document.addEventListener("click", (e) => {
    if (
      authBtn &&
      authDropdown &&
      !authBtn.contains(e.target) &&
      !authDropdown.contains(e.target)
    ) {
      closeAuthDropdown();
    }
  });

function initHeaderAuthListener() {
  if (typeof firebase === "undefined" || !firebase.apps || !firebase.apps.length) {
    setTimeout(initHeaderAuthListener, 200);
    return;
  }
  
  try {
    firebase.auth().onAuthStateChanged((user) => {
      window.currentUser = user;
      closeAuthDropdown();
      updateHeaderAuth();
    });
  } catch (e) {
    console.warn("Header Auth Error:", e);
  }
}
  initHeaderAuthListener();

  window.addEventListener("userStatsReady", () => updateHeaderAuth());
  setTimeout(() => updateHeaderAuth(), 1500);
  setTimeout(() => updateHeaderAuth(), 3500);

  /* ========== DARK MODE ========== */
  const darkToggle = document.getElementById("darkModeToggle");
  const applyTheme = (isDark) => {
    [document.documentElement, document.body].forEach((root) => {
      root.classList.toggle("dark", isDark);
      root.classList.toggle("light", !isDark);
    });
  };
  applyTheme(localStorage.getItem("darkMode") === "true");
  if (darkToggle) {
    darkToggle.onclick = () => {
      const isDark = !document.documentElement.classList.contains("dark");
      localStorage.setItem("darkMode", String(isDark));
      applyTheme(isDark);
    };
  }
  window.addEventListener("storage", (event) => {
    if (event.key === "darkMode") applyTheme(event.newValue === "true");
  });

  /* ========== BOOKMARK ========== */
  const bookmarkDropdown = document.querySelector(".bookmark-dropdown");
  const bookmarkBtn = document.getElementById("headerBookmarkBtn");
  const bookmarkContent = document.getElementById("bookmarkContent");

  function loadBookmarkList() {
    let bookmarks;
    try {
      bookmarks = JSON.parse(localStorage.getItem("mangaBookmarks")) || [];
    } catch {
      bookmarks = [];
    }
    bookmarks = bookmarks.filter((item) => {
      const title = typeof item === "string" ? item : item?.title;
      return title && String(title).trim() !== "";
    });
    const uniqueMap = new Map();
    bookmarks.forEach((item) => {
      const title = typeof item === "string" ? item : item.title;
      const key = String(title).toLowerCase();
      if (!uniqueMap.has(key)) uniqueMap.set(key, item);
    });
    const sorted = Array.from(uniqueMap.values()).sort((a, b) => {
      const ta = typeof a === "object" ? a.updatedAt || a.addedAt || 0 : 0;
      const tb = typeof b === "object" ? b.updatedAt || b.addedAt || 0 : 0;
      return tb - ta;
    });
    bookmarkContent.innerHTML =
      sorted.length === 0
        ? '<div class="bookmark-empty">You have no bookmarks yet!</div>'
        : sorted
            .map((item) => {
              const title = typeof item === "string" ? item : item.title;
              if (!title) return "";
              const key = title.toLowerCase().replace(/[^a-z0-9]/g, "");
              const rawImg =
                (typeof item === "object" && item.img) ||
                window.mangaData?.[key]?.img ||
                window.mangaData?.[key]?.cover ||
                "";
              const img =
                getCoverPreview(rawImg) ||
                "https://mikoroku.com/default-thumb.jpg";
              const safeTitle = title.replace(/'/g, "\\'");
              return `
                <div class="bookmark-item" onclick="openBookmark('${safeTitle}')">
                  <img class="bookmark-thumb" src="${img}" loading="lazy" onerror="this.src='https://mikoroku.com/default-thumb.jpg'">
                  <div class="bookmark-title">${title
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")}</div>
                </div>
              `;
            })
            .join("");
    updateHeaderBookmarkIcon();
  }

  if (bookmarkBtn) {
    bookmarkBtn.onclick = (e) => {
      e.stopPropagation();
      bookmarkDropdown.classList.toggle("open");
      loadBookmarkList();
    };
  }
  document.addEventListener("click", (e) => {
    if (bookmarkDropdown && !bookmarkDropdown.contains(e.target)) {
      bookmarkDropdown.classList.remove("open");
    }
  });

  /* ========== SEARCH ========== */
  const GITHUB_RAW =
    window.GITHUB_RAW ||
    "https://raw.githubusercontent.com/moemaomao/mymangadata/main/";

  function getCoverPreview(url) {
    if (!url) return "";
    url = String(url).trim();
    if (!/^https?:\/\//i.test(url)) url = GITHUB_RAW + url.replace(/^\//, "");
    return (
      "https://images.weserv.nl/?url=" +
      encodeURIComponent(url) +
      "&w=50&q=75&output=webp"
    );
  }

  function doSearch(keyword) {
    const resultsBox = document.getElementById("searchResults");
    if (!resultsBox) return;
    keyword = (keyword || "").toLowerCase().trim();
    if (!keyword) {
      resultsBox.style.display = "none";
      resultsBox.innerHTML = "";
      return;
    }
    if (!window.mangaData || Object.keys(window.mangaData).length === 0) {
      resultsBox.innerHTML = `<div style="padding:12px;color:#888;">Data sedang dimuat...</div>`;
      resultsBox.style.display = "block";
      return;
    }
    const unique = new Map();
    Object.values(window.mangaData).forEach((m) => {
      if (!m?.title) return;
      const key = m.title.toLowerCase().trim();
      if (!unique.has(key)) unique.set(key, m);
    });
    const results = Array.from(unique.values())
      .filter((m) => m.title.toLowerCase().includes(keyword))
      .sort((a, b) => {
        const titleA = a.title.toLowerCase().trim();
        const titleB = b.title.toLowerCase().trim();
        const startsA = titleA.startsWith(keyword);
        const startsB = titleB.startsWith(keyword);
        if (startsA && !startsB) return -1;
        if (!startsA && startsB) return 1;
        return titleA.localeCompare(titleB);
      })
      .slice(0, 12);
    if (results.length === 0) {
      resultsBox.innerHTML = `<div style="padding:12px;color:#888;">Tidak ditemukan</div>`;
      resultsBox.style.display = "block";
      return;
    }
    resultsBox.innerHTML = results
      .map((m) => {
        const safeTitle = m.title.replace(/'/g, "\\'");
        const thumb =
          getCoverPreview(m.img || m.cover) ||
          "https://mikoroku.com/default-thumb.jpg";
        return `
          <div class="search-item" onclick="openBookmark('${safeTitle}')">
            <img class="search-thumb" src="${thumb}" loading="lazy" onerror="this.src='https://mikoroku.com/default-thumb.jpg'">
            <div class="search-info">
              <div class="search-title">${m.title}</div>
              ${m.firestore ? '<small style="color:#4f46e5;">Firestore</small>' : ""}
              ${m.github ? '<small style="color:#10b981;">GitHub</small>' : ""}
            </div>
          </div>
        `;
      })
      .join("");
    resultsBox.style.display = "block";
  }

  function initSearch() {
    const searchInput = document.getElementById("searchManga");
    const resultsBox = document.getElementById("searchResults");
    if (!searchInput || !resultsBox) return;
    searchInput.oninput = null;
    if (searchInput._searchHandler) {
      searchInput.removeEventListener("input", searchInput._searchHandler);
    }
    const handler = (e) => doSearch(e.target.value);
    searchInput._searchHandler = handler;
    searchInput.addEventListener("input", handler);
    document.addEventListener("click", (e) => {
      if (!searchInput.contains(e.target) && !resultsBox.contains(e.target)) {
        resultsBox.style.display = "none";
      }
    });
  }
  window.addEventListener("mangaDataReady", initSearch);
  if (window.mangaData && Object.keys(window.mangaData).length > 5) {
    initSearch();
  }

  /* ========== AUTO HIDE HEADER ========== */
  let lastScroll = 0;
  const header = document.getElementById("mainHeader");
  window.addEventListener("scroll", () => {
    const current = window.scrollY;
    if (current < 50) {
      header?.classList.remove("hide");
      lastScroll = current;
      return;
    }
    if (current > lastScroll) header?.classList.add("hide");
    else header?.classList.remove("hide");
    lastScroll = current;
  });

  updateHeaderBookmarkIcon();
  initAnnouncementBadge();
};

function initAnnouncementBadge() {
  if (window.announcementBadgeCheck) return;

  const updateBadge = (database) => {
    database.collection("announcements")
      .where("published", "==", true)
      .get()
      .then((snapshot) => {
        let readIds = [];
        try {
          const storedIds = JSON.parse(localStorage.getItem("announcementsReadIds") || "[]");
          if (Array.isArray(storedIds)) readIds = storedIds;
        } catch (error) {
          console.error("Could not read announcement read status.", error);
        }

        const unreadCount = snapshot.docs.filter((item) => !readIds.includes(item.id)).length;
        const badge = document.getElementById("announcementBadge");
        if (!badge) return;
        badge.hidden = unreadCount === 0;
        badge.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
        badge.setAttribute("aria-label", `${unreadCount} unread announcements`);
        document.getElementById("announcementLink")?.setAttribute(
          "aria-label",
          unreadCount ? `Announcements, ${unreadCount} unread` : "Announcements",
        );
      })
      .catch((error) => {
        console.error("Could not load announcement badge.", error);
      });
  };

  const connect = () => {
    if (!window.firebase?.firestore) return false;
    try {
      const appName = "mikoroku-announcements";
      const app = window.firebase.apps.find((item) => item.name === appName) ||
        window.firebase.initializeApp({
          apiKey: "AIzaSyAi8z8oGGNJSNe87UVWh3FagJZSy_uhuoI",
          authDomain: "mikoroku.firebaseapp.com",
          databaseURL: "https://mikoroku-default-rtdb.firebaseio.com",
          projectId: "mikoroku",
          storageBucket: "mikoroku.firebasestorage.app",
          messagingSenderId: "271920446600",
          appId: "1:271920446600:web:974b11c707ebc11a7bf33d",
        }, appName);
      updateBadge(app.firestore());
      return true;
    } catch (error) {
      console.error("Could not initialize announcement notifications.", error);
      return true;
    }
  };

  if (connect()) return;
  let attempts = 0;
  window.announcementBadgeCheck = window.setInterval(() => {
    attempts += 1;
    if (connect()) {
      window.clearInterval(window.announcementBadgeCheck);
      window.announcementBadgeCheck = undefined;
    } else if (attempts >= 120) {
      window.clearInterval(window.announcementBadgeCheck);
      window.announcementBadgeCheck = undefined;
      console.error("Announcement notifications could not connect to Firebase.");
    }
  }, 250);
}

window.initSiteHeader = initHeader;

if (document.readyState === "loading") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initHeader, { once: true });
  } else {
    initHeader();
  }
} else {
  initHeader();
}

function updateHeaderBookmarkIcon() {
  const icon = document.getElementById("headerBookmarkIcon");
  if (!icon) return;
  let bookmarks;
  try {
    bookmarks = JSON.parse(localStorage.getItem("mangaBookmarks")) || [];
  } catch {
    bookmarks = [];
  }
  if (bookmarks.length > 0) {
    icon.setAttribute("fill", "#ffcc00");
    icon.setAttribute("stroke", "none");
  } else {
    icon.setAttribute("fill", "none");
    icon.setAttribute("stroke", "currentColor");
  }
}

function openBookmark(title) {
  title = String(title || "").trim();
  if (!title) return;
  let manga = null;
  if (window.mangaData) {
    const key = title.toLowerCase().replace(/[^a-z0-9]/g, "");
    manga = window.mangaData[key] || null;
    if (!manga) {
      manga =
        Object.values(window.mangaData).find(
          (m) =>
            m &&
            m.title &&
            m.title.toLowerCase().trim() === title.toLowerCase()
        ) || null;
    }
  }
  if (manga) {
    try {
      localStorage.setItem("currentManga", JSON.stringify(manga));
    } catch (_) {}
    const slug =
      manga.slug ||
      title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-");
    window.location.href = `/series/${encodeURIComponent(slug)}`;
    return;
  }
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
  localStorage.setItem(
    "currentManga",
    JSON.stringify({ title: title, slug: slug })
  );
  window.location.href = `/series/${encodeURIComponent(slug)}`;
}

  /* ========== ADS ========== */
(function(xcxi){
var d = document,
    s = d.createElement('script'),
    l = d.scripts[d.scripts.length - 1];
s.settings = xcxi || {};
s.src = "\/\/gregariousstretch.com\/cGD.9e6XbX2t5IlDSRWVQ\/9mNfj\/Ei3FNoTgIX2MM\/Cq0P2CM\/Tocq1rMFj\/Yxxx";
s.async = true;
s.referrerPolicy = 'no-referrer-when-downgrade';
l.parentNode.insertBefore(s, l);
})({})
