/* ==========================================================
   MIKOROKU READING HISTORY
   ========================================================== */
const HISTORY_KEY = "readingHistory";
const MAX_HISTORY = 50;
const GITHUB_RAW_HISTORY = "https://raw.githubusercontent.com/moemaomao/mymangadata/main/";

/* ================= COVER ================= */
function resolveHistoryCover(url) {
    if (!url || String(url).trim() === "" || String(url).trim() === "-") return "";
    url = String(url).replace(/\.$/, "").trim();
    if (!/^https?:\/\//i.test(url)) {
        url = GITHUB_RAW_HISTORY + url.replace(/^\//, "");
    }
    return url;
}

function historyCoverThumb(url, width) {
    width = width || 120;
    const full = resolveHistoryCover(url);
    if (!full || full === "/assets/icons/favicon.ico") return "/assets/icons/favicon.ico";
    if (full.includes("images.weserv.nl")) return full;
    return (
        "https://images.weserv.nl/?url=" +
        encodeURIComponent(full) +
        "&w=" + width +
        "&q=80&output=webp"
    );
}

function getSeriesCoverFromData(data) {
    if (data.seriesCover) return resolveHistoryCover(data.seriesCover);
    try {
        const cm = JSON.parse(localStorage.getItem("currentManga") || "null");
        if (cm) {
            const c = cm.cover || cm.img || cm.image || "";
            if (c) return resolveHistoryCover(c);
        }
    } catch (e) {}
    if (data.cover) return resolveHistoryCover(data.cover);
    return "";
}

/* ================= SAVE ================= */
function saveReadingHistory(data) {
    if (!data || !data.url) return;

    let history = [];
    try {
        history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    } catch {
        history = [];
    }

    history = history.filter(item => item.url !== data.url);

    const seriesCover = getSeriesCoverFromData(data) || data.cover || "/assets/icons/favicon.ico";

    history.unshift({
        series: data.series || data.title || "",
        title: data.title || "Unknown",
        chapter: data.chapter || "",
        cover: seriesCover,
        slug: data.slug || "",
        url: data.url,
        time: Date.now()
    });

    history = history.slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

/* ================= GET ================= */
function getReadingHistory() {
    try {
        return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    } catch {
        return [];
    }
}

/* ================= DELETE SINGLE ================= */
function deleteHistoryItem(url) {
    if (!confirm("Hapus item ini dari history?")) return;

    let history = getReadingHistory();
    history = history.filter(item => item.url !== url);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    showHistory(); // refresh
}

/* ================= CLEAR ALL ================= */
function clearReadingHistory() {
    if (!confirm("Hapus seluruh history?")) return;
    localStorage.removeItem(HISTORY_KEY);
    showHistory();
}

/* ================= TIME ================= */
function historyTime(time) {
    const diff = Date.now() - time;
    const minute = 60000;
    const hour = minute * 60;
    const day = hour * 24;

    if (diff < minute) return "Baru saja";
    if (diff < hour) return Math.floor(diff / minute) + " menit lalu";
    if (diff < day) return Math.floor(diff / hour) + " jam lalu";
    return Math.floor(diff / day) + " hari lalu";
}

/* ================= MODAL ================= */
(function () {
    const style = document.createElement("style");
    style.textContent = `
#historyModal{
    display:none;
    position:fixed;
    inset:0;
    background:rgba(0,0,0,.55);
    z-index:999999;
    justify-content:center;
    align-items:center;
    padding:20px;
}

#historyBox{
    width:100%;
    max-width:500px;
    max-height:80vh;
    overflow:auto;
    background:#fff;
    border-radius:12px;
    box-shadow:0 10px 30px rgba(0,0,0,.3);
}

body.dark #historyBox{
    background:#1d1d1d;
    color:#fff;
}

.history-header{
    padding:15px 20px;
    font-size:20px;
    font-weight:bold;
    border-bottom:1px solid #ddd;
    display:flex;
    justify-content:space-between;
    align-items:center;
    position:relative;
}

body.dark .history-header{
    border-color:#333;
}

.close-btn{
    font-size:24px;
    width:32px;
    height:32px;
    display:flex;
    align-items:center;
    justify-content:center;
    border:none;
    background:none;
    cursor:pointer;
    border-radius:50%;
    color:#666;
}

body.dark .close-btn{
    color:#aaa;
}

.close-btn:hover{
    background:#f0f0f0;
    color:#000;
}

body.dark .close-btn:hover{
    background:#333;
    color:#fff;
}

.history-item{
    display:flex;
    gap:12px;
    padding:12px 20px;
    cursor:pointer;
    border-bottom:1px solid #eee;
    position:relative;
}

body.dark .history-item{
    border-color:#333;
}

.history-item:hover{
    background:#f5f5f5;
}

body.dark .history-item:hover{
    background:#2a2a2a;
}

.history-cover{
    width:60px;
    height:80px;
    border-radius:8px;
    object-fit:cover;
}

.history-content{
    flex:1;
}

.history-title{
    font-weight:bold;
}

.history-chapter{
    margin-top:4px;
    font-size:14px;
    color:#666;
}

body.dark .history-chapter{
    color:#aaa;
}

.history-time{
    margin-top:6px;
    font-size:12px;
    color:#999;
}

.delete-btn{
    position:absolute;
    right:15px;
    top:50%;
    transform:translateY(-50%);
    background:none;
    border:none;
    font-size:18px;
    color:#ff4444;
    cursor:pointer;
    opacity:0;
    transition:opacity .2s;
}

.history-item:hover .delete-btn{
    opacity:1;
}

.history-footer{
    padding:15px 20px;
    display:flex;
    justify-content:flex-end;
    border-top:1px solid #ddd;
}

body.dark .history-footer{
    border-color:#333;
}

.history-btn{
    padding:10px 18px;
    border:none;
    border-radius:8px;
    cursor:pointer;
}
`;

    document.head.appendChild(style);

    document.body.insertAdjacentHTML("beforeend", `
<div id="historyModal">
    <div id="historyBox">
        <div class="history-header">
            📖 Reading History
            <button class="close-btn" onclick="closeHistory()">✕</button>
        </div>

        <div id="historyList"></div>

        <div class="history-footer">
            <button class="history-btn" onclick="clearReadingHistory()">
                🗑 Hapus Semua
            </button>
        </div>
    </div>
</div>
`);
})();

/* ================= SHOW ================= */
window.showHistory = function() {
    closeAuthDropdown?.();

    const list = document.getElementById("historyList");
    const history = getReadingHistory();

    if (history.length === 0) {
        list.innerHTML = `
            <div style="padding:40px;text-align:center;color:#888;">
                Belum ada history.
            </div>
        `;
    } else {
        list.innerHTML = history.map(item => `
            <div class="history-item" onclick="location.href='${item.url}'">
                <img class="history-cover" src="${historyCoverThumb(item.cover)}" loading="lazy" onerror="this.src='/assets/icons/favicon.ico'">
                
                <div class="history-content">

    <div class="history-title">
        ${item.series || item.title}
    </div>

    <div class="history-chapter">${item.chapter}</div>

    <div class="history-time">
        ${historyTime(item.time)}
    </div>

</div>

                <button class="delete-btn" onclick="event.stopImmediatePropagation(); deleteHistoryItem('${item.url}')">
                    🗑
                </button>
            </div>
        `).join("");
    }

    document.getElementById("historyModal").style.display = "flex";
};

/* ================= CLOSE ================= */
window.closeHistory = function() {
    document.getElementById("historyModal").style.display = "none";
};

document.addEventListener("click", e => {
    const modal = document.getElementById("historyModal");
    if (e.target === modal) closeHistory();
});


// ================== user-profile.js ==================

(function () {

  const ANONYMOUS_AVATAR = "https://ui-avatars.com/api/?name=User&background=7c3aed&color=fff";

  const BADGES = [
  { id: "", text: "None", style: "background:#2a2a2a; color:#ddd;" },
  { id: "milf", text: "Milf Lover", style: "background:linear-gradient(45deg,#ff4d6d,#ff8fab); color:white;" },
  { id: "horny", text: "Team Horny", style: "background:linear-gradient(45deg,#ff7b00,#ffcc00); color:#111;" },
  { id: "night-owl", text: "Night Owl", style: "background:linear-gradient(90deg,#2a1b4a,#6b46c1); color:#e0bbff;" },
  { id: "chaos-entity", text: "Chaos Entity", style: "background:linear-gradient(45deg,#ff0066,#8b00ff,#ff00cc); color:white;" },
  { id: "yandere-energy", text: "Yandere Energy", style: "background:linear-gradient(90deg,#ff1493,#ff69b4); color:white;" },
  { id: "cultured", text: "Cultured", style: "background:linear-gradient(90deg,#d4af37,#ffd700); color:#2c1e0f;" },
  { id: "npc", text: "NPC", style: "background:#555555; color:#aaffaa; border:1px solid #00ff00;" },
  { id: "lore-master", text: "Lore Master", style: "background:linear-gradient(90deg,#4a2c0b,#8b5a2b); color:#ffdd88;" },
  { id: "touch-grass", text: "Touch Grass", style: "background:linear-gradient(90deg,#228b22,#32cd32); color:white;" },
  { id: "gremlin", text: "Gremlin", style: "background:linear-gradient(45deg,#00ff66,#39ff14); color:black;" },
  { id: "certified-degenerate", text: "Certified Degenerate", style: "background:linear-gradient(90deg,#8b0000,#ff4500); color:#ffff00;" },
  { id: "waifu-collector", text: "Waifu Collector", style: "background:linear-gradient(45deg,#ff69b4,#ff1493,#db7093); color:white;" },
  { id: "manga-addict", text: "Manga Addict", style: "background:linear-gradient(90deg,#9b59b6,#8e44ad); color:white;" },
  { id: "sleep-deprived", text: "Sleep Deprived", style: "background:linear-gradient(90deg,#191970,#4169e1); color:#aaccff;" },
  { id: "horny-jail-escapee", text: "Horny Jail Escapee", style: "background:linear-gradient(45deg,#ff00aa,#ff0088); color:white;" },
  { id: "elite-reader", text: "Elite Reader", style: "background:linear-gradient(90deg,#00bfff,#1e90ff); color:white;" },
  { id: "keyboard-warrior", text: "Keyboard Warrior", style: "background:linear-gradient(90deg,#ff4500,#ff8c00); color:white;" },
  { id: "dungeon-master", text: "Dungeon Master", style: "background:linear-gradient(45deg,#4b0082,#8a2be2); color:#e0b0ff;" },
  { id: "gacha-victim", text: "Gacha Victim", style: "background:linear-gradient(90deg,#ff00ff,#00ffff,#ffff00); color:black;" },
  { id: "onee-san-hunter", text: "Onee-san Hunter", style: "background:linear-gradient(90deg,#ff69b4,#ff1493); color:white;" },
  { id: "tsundere", text: "Tsundere", style: "background:linear-gradient(90deg,#ff3333,#ff9999); color:white;" },
  { id: "baka-squad", text: "Baka Squad", style: "background:linear-gradient(45deg,#ffcc00,#ff8800); color:black;" },
  { id: "void-walker", text: "Void Walker", style: "background:linear-gradient(90deg,#1a0033,#4b0082); color:#bb99ff;" },
  { id: "brain-not-found", text: "404 Brain Not Found", style: "background:#111111; color:#ff3366; border:1px dashed #ff3366;" },
  { id: "professional-lurker", text: "Professional Lurker", style: "background:linear-gradient(90deg,#2f2f2f,#555555); color:#aaaaaa;" },
  { id: "cosmic-simp", text: "Cosmic Simp", style: "background:linear-gradient(45deg,#00ffff,#ff00ff,#ffff00); color:black;" },
  { id: "schizo-poster", text: "Schizo Poster", style: "background:linear-gradient(45deg,#6b21a8,#a855f7,#c026d3); color:white;" },
  { id: "doomer", text: "Doomer", style: "background:linear-gradient(90deg,#1e2937,#334155); color:#94a3b8; border:1px dashed #64748b;" },
  { id: "coomer", text: "Coomer", style: "background:linear-gradient(45deg,#db2777,#f472b6); color:white;" },
  { id: "terminally-online", text: "Terminally Online", style: "background:linear-gradient(90deg,#1f2937,#4b5563); color:#e2e8f0;" },
  { id: "egirl-hunter", text: "E-girl Hunter", style: "background:linear-gradient(45deg,#ec4899,#f472b6,#db2777); color:white;" },
  { id: "chuuni", text: "Chuuni", style: "background:linear-gradient(135deg,#7c3aed,#a855f7,#c084fc); color:white;" },
  { id: "neet-lord", text: "NEET Lord", style: "background:linear-gradient(90deg,#334155,#475569); color:#cbd5e1; border:1px solid #64748b;" },
  { id: "incognito-degen", text: "Incognito Degenerate", style: "background:linear-gradient(45deg,#4f46e5,#6366f1); color:white;" },
  { id: "rage-baiter", text: "Rage Baiter", style: "background:linear-gradient(90deg,#b91c1c,#ef4444); color:white;" },
  { id: "shipper-supreme", text: "Shipper Supreme", style: "background:linear-gradient(45deg,#ec4899,#8b5cf6); color:white;" },
  { id: "lurker-god", text: "Lurker God", style: "background:linear-gradient(90deg,#1e2937,#334155,#475569); color:#94a3b8;" },
  { id: "menhera", text: "Menhera", style: "background:linear-gradient(45deg,#db2777,#e11d48); color:white;" },
  { id: "power-bottom", text: "Power Bottom", style: "background:linear-gradient(45deg,#7e22ce,#a855f7); color:white;" },
  { id: "salaryman-slave", text: "Salaryman Slave", style: "background:linear-gradient(90deg,#374151,#4b5563); color:#9ca3af;" },
  { id: "isekai-protagonist", text: "Isekai Protagonist", style: "background:linear-gradient(45deg,#eab308,#f59e0b); color:#1f2937;" },
  { id: "trash-taste", text: "Trash Taste Enjoyer", style: "background:linear-gradient(90deg,#854d0e,#b45309); color:#fef3c7;" },
  { id: "paradox-simp", text: "Paradoxical Simp", style: "background:linear-gradient(45deg,#ec4899,#6366f1); color:white;" },
  { id: "fourchan-refugee", text: "4chan Refugee", style: "background:linear-gradient(90deg,#111827,#1f2937); color:#9ca3af; border:1px dashed #6b7280;" },
  { id: "cope-enjoyer", text: "Cope Enjoyer", style: "background:linear-gradient(45deg,#854d0e,#b45309); color:#fef3c7;" },
  { id: "seethe-lord", text: "Seethe Lord", style: "background:linear-gradient(90deg,#b91c1c,#ef4444); color:white;" },
  { id: "ratio-touch-grass", text: "Ratio + Touch Grass", style: "background:linear-gradient(90deg,#166534,#4ade80); color:#052e16;" },
  { id: "based-department", text: "Based Department", style: "background:linear-gradient(45deg,#15803d,#22c55e); color:white;" },
  { id: "cringe-overlord", text: "Cringe Overlord", style: "background:linear-gradient(90deg,#7f1d1d,#ef4444); color:#fecaca;" },
  { id: "malding-champion", text: "Malding Champion", style: "background:linear-gradient(45deg,#991b1b,#f87171); color:white;" },
  { id: "hikikomori-emperor", text: "Hikikomori Emperor", style: "background:linear-gradient(90deg,#1e2937,#334155); color:#cbd5e1; border:1px dashed #64748b;" },
  { id: "yabai-energy", text: "Yabai Energy", style: "background:linear-gradient(45deg,#c026d3,#db2777); color:white;" },
  { id: "sugoi-desu", text: "Sugoi Desu", style: "background:linear-gradient(90deg,#ec4899,#f472b6); color:white;" },
  { id: "ara-ara-enjoyer", text: "Ara Ara Enjoyer", style: "background:linear-gradient(45deg,#9f1239,#e11d48); color:white;" },
  { id: "onii-chan-protector", text: "Onii-chan Protector", style: "background:linear-gradient(90deg,#7e22ce,#a855f7); color:white;" },
  { id: "imouto-collector", text: "Imouto Collector", style: "background:linear-gradient(45deg,#db2777,#f472b6); color:white;" },
  { id: "genshin-addict", text: "Genshin Addict", style: "background:linear-gradient(90deg,#854d0e,#eab308); color:#451a03;" },
  { id: "fomo-victim", text: "FOMO Victim", style: "background:linear-gradient(45deg,#4338ca,#6366f1); color:white;" },
  { id: "doom-scroller", text: "Doom Scroller", style: "background:linear-gradient(90deg,#1e2937,#334155); color:#94a3b8;" },
  { id: "reply-guy", text: "Reply Guy", style: "background:linear-gradient(45deg,#854d0e,#ca8a04); color:white;" },
  { id: "main-character-syndrome", text: "Main Character Syndrome", style: "background:linear-gradient(90deg,#7c3aed,#a855f7); color:white;" },
  { id: "final-boss-of-simping", text: "Final Boss of Simping", style: "background:linear-gradient(45deg,#9f1239,#ec4899,#db2777); color:white;" },
  { id: "weeb-supreme", text: "Weeb Supreme", style: "background:linear-gradient(45deg,#ff00ff,#00ffff,#ffff00); color:#000;" },
  { id: "otaku-overlord", text: "Otaku Overlord", style: "background:linear-gradient(90deg,#6b46c1,#9f7aea,#c4b5fd); color:#fff;" },
  { id: "waifu-defender", text: "Waifu Defender", style: "background:linear-gradient(45deg,#ff69b4,#ff1493,#db2777); color:#fff;" },
  { id: "two-d-only", text: "2D Only", style: "background:#1a0033; color:#bb99ff; border:2px dashed #c084fc;" },
  { id: "isekai-veteran", text: "Isekai Veteran", style: "background:linear-gradient(45deg,#eab308,#f59e0b,#fcd34d); color:#1f2937;" },
  { id: "senpai-noticer", text: "Senpai Noticer", style: "background:linear-gradient(90deg,#ff3366,#ff6699); color:#fff;" },
  { id: "ara-ara-collector", text: "Ara Ara Collector", style: "background:linear-gradient(45deg,#9f1239,#e11d48); color:#fff;" },
  { id: "light-novel-degen", text: "Light Novel Degenerate", style: "background:linear-gradient(90deg,#4a2c0b,#8b5a2b); color:#ffdd88;" },
  { id: "chuuni-lord", text: "Chuuni Lord", style: "background:linear-gradient(135deg,#7c3aed,#a855f7,#c026d3); color:#fff;" },
  { id: "trap-connoisseur", text: "Trap Connoisseur", style: "background:linear-gradient(45deg,#ff00aa,#ff66cc); color:#fff;" },
  { id: "yuri-enjoyer", text: "Yuri Enjoyer", style: "background:linear-gradient(90deg,#db2777,#f472b6); color:#fff;" },
  { id: "kawaii-overlord", text: "Kawaii Overlord", style: "background:linear-gradient(45deg,#ff99cc,#ff66aa); color:#000;" },
  { id: "hololive-simp", text: "Hololive Simp", style: "background:linear-gradient(45deg,#22d3ee,#67e8f9); color:#000;" },
  { id: "visual-novel-addict", text: "Visual Novel Addict", style: "background:linear-gradient(45deg,#7c3aed,#c084fc); color:white;" },
  { id: "mecha-pilot", text: "Mecha Pilot", style: "background:linear-gradient(90deg,#0f172a,#334155,#64748b); color:#e2e8f0;" },
  { id: "figurine-hoarder", text: "Figurine Hoarder", style: "background:linear-gradient(45deg,#f59e0b,#fcd34d,#fde68a); color:#422006;" },
  { id: "anime-onahole", text: "Anime Onahole", style: "background:linear-gradient(45deg,#db2777,#ff66cc,#f9a8d4); color:white;" },
  { id: "raid-boss", text: "Raid Boss", style: "background:linear-gradient(45deg,#991b1b,#dc2626,#f87171); color:white;" },
  { id: "anime-speedrunner", text: "Anime Speedrunner", style: "background:linear-gradient(90deg,#2563eb,#38bdf8); color:white;" },
  { id: "isekai-truck-victim", text: "Truck-kun Victim", style: "background:linear-gradient(45deg,#f59e0b,#facc15,#fde047); color:#111;" },
  { id: "vtuber-rabbit-hole", text: "VTuber Rabbit Hole", style: "background:linear-gradient(45deg,#ec4899,#8b5cf6,#22d3ee); color:white;" },
  { id: "wifi-warrior", text: "WiFi Warrior", style: "background:linear-gradient(90deg,#0f172a,#2563eb); color:#dbeafe;" },
  { id: "ranked-demon", text: "Ranked Demon", style: "background:linear-gradient(45deg,#7f1d1d,#dc2626,#f87171); color:white;" },
  { id: "afk-legend", text: "AFK Legend", style: "background:linear-gradient(90deg,#374151,#6b7280); color:#f3f4f6;" },
  { id: "loot-goblin", text: "Loot Goblin", style: "background:linear-gradient(45deg,#22c55e,#84cc16,#facc15); color:#111;" },
  { id: "fps-sweat", text: "FPS Sweat", style: "background:linear-gradient(90deg,#111827,#1d4ed8); color:#dbeafe;" },
  { id: "combo-dropper", text: "Combo Dropper", style: "background:linear-gradient(45deg,#f97316,#fb7185); color:white;" },
  { id: "maid-cafe-regular", text: "Maid Cafe Regular", style: "background:linear-gradient(45deg,#f9a8d4,#f472b6,#ec4899); color:white;" },
  { id: "goblin-mode", text: "Goblin Mode", style: "background:linear-gradient(45deg,#166534,#22c55e,#4ade80); color:white;" },
  { id: "anime-marathoner", text: "Anime Marathoner", style: "background:linear-gradient(90deg,#7c3aed,#c084fc); color:white;" },
  { id: "patch-note-reader", text: "Patch Note Reader", style: "background:linear-gradient(90deg,#0f172a,#334155,#475569); color:#e2e8f0;" },
  { id: "boss-music-enjoyer", text: "Boss Music Enjoyer", style: "background:linear-gradient(45deg,#7e22ce,#c026d3,#ec4899); color:white;" },
  { id: "daily-quest-slave", text: "Daily Quest Slave", style: "background:linear-gradient(90deg,#92400e,#ca8a04,#facc15); color:#111;" },
  { id: "ping-999", text: "Ping 999", style: "background:linear-gradient(90deg,#991b1b,#ef4444); color:white;" },
  { id: "anime-ending-destroyed-me", text: "Ending Destroyed Me", style: "background:linear-gradient(45deg,#4338ca,#7c3aed,#c084fc); color:white;" },
  { id: "waifu-meta-abuser", text: "Waifu Meta Abuser", style: "background:linear-gradient(45deg,#ff1493,#ec4899,#f472b6); color:white;" },
  { id: "controller-thrower", text: "Controller Thrower", style: "background:linear-gradient(90deg,#7f1d1d,#dc2626); color:white;" },
  { id: "opening-skipper", text: "Opening Skipper", style: "background:linear-gradient(90deg,#334155,#64748b); color:#f8fafc;" },
  { id: "ending-enjoyer", text: "Ending Enjoyer", style: "background:linear-gradient(45deg,#1d4ed8,#7c3aed,#ec4899); color:white;" },
  { id: "gacha-god", text: "Gacha God", style: "background:linear-gradient(45deg,#facc15,#22d3ee,#ec4899,#facc15); color:#111;" },
  { id: "skill-issue", text: "Skill Issue", style: "background:linear-gradient(90deg,#111827,#ef4444); color:white;" },
  { id: "anime-ost-addict", text: "OST Addict", style: "background:linear-gradient(45deg,#4f46e5,#9333ea,#ec4899); color:white;" },
  { id: "last-online-3am", text: "Last Online 3AM", style: "background:linear-gradient(90deg,#0f172a,#312e81); color:#c7d2fe;" },
  { id: "npc-dialogue-skipper", text: "Dialogue Skipper", style: "background:linear-gradient(90deg,#4b5563,#9ca3af); color:#111;" },
  { id: "cutscene-enjoyer", text: "Cutscene Enjoyer", style: "background:linear-gradient(45deg,#2563eb,#7c3aed); color:white;" },
  { id: "voice-actor-enjoyer", text: "Seiyuu Enjoyer", style: "background:linear-gradient(45deg,#db2777,#8b5cf6); color:white;" },
  { id: "achaaan", text: "Nyaa~", style: "background:linear-gradient(45deg,#f9a8d4,#f472b6,#fbcfe8); color:#111;" },
  { id: "white-hair-enjoyer", text: "White Hair Enjoyer", style: "background:linear-gradient(45deg,#dbeafe,#cbd5e1,#f8fafc); color:#111;" },
  { id: "silver-hair-simp", text: "Silver Hair Simp", style: "background:linear-gradient(45deg,#94a3b8,#e2e8f0,#cbd5e1); color:#111;" },
  { id: "twin-tail-lover", text: "Twintail Lover", style: "background:linear-gradient(45deg,#ec4899,#f472b6,#f9a8d4); color:white;" },
  { id: "kuudere-enjoyer", text: "Kuudere Enjoyer", style: "background:linear-gradient(90deg,#60a5fa,#2563eb); color:white;" },
  { id: "gyaru-enjoyer", text: "Gyaru Enjoyer", style: "background:linear-gradient(45deg,#fb7185,#f59e0b,#fde047); color:#111;" },
  { id: "glasses-supremacy", text: "Glasses Supremacy", style: "background:linear-gradient(90deg,#334155,#64748b); color:#f8fafc;" },
  { id: "short-hair-propaganda", text: "Short Hair Propaganda", style: "background:linear-gradient(45deg,#7c3aed,#a855f7); color:white;" },
  { id: "long-hair-cult", text: "Long Hair Cult", style: "background:linear-gradient(45deg,#4338ca,#7c3aed,#c084fc); color:white;" },
  { id: "catgirl-enjoyer", text: "Catgirl Enjoyer", style: "background:linear-gradient(45deg,#f472b6,#ec4899,#db2777); color:white;" },
  { id: "fox-girl-follower", text: "Fox Girl Follower", style: "background:linear-gradient(45deg,#f97316,#fb923c,#fdba74); color:#111;" },
  { id: "maid-enjoyer", text: "Maid Enjoyer", style: "background:linear-gradient(45deg,#111827,#374151,#9ca3af); color:white;" },
  { id: "goth-girl-enjoyer", text: "Goth Girl Enjoyer", style: "background:linear-gradient(45deg,#111827,#4c1d95,#7c3aed); color:#e9d5ff;" },
  { id: "muscle-waifu-appreciator", text: "Muscle Waifu Appreciator", style: "background:linear-gradient(45deg,#b91c1c,#ef4444,#f87171); color:white;" },
  { id: "hoodie-waifu-enjoyer", text: "Hoodie Waifu Enjoyer", style: "background:linear-gradient(90deg,#1e2937,#475569); color:#f1f5f9;" },
  { id: "fang-lover", text: "Fang Lover", style: "background:linear-gradient(45deg,#ec4899,#ef4444); color:white;" },
  { id: "thigh-high-supremacy", text: "Thigh High Supremacy", style: "background:linear-gradient(45deg,#7c3aed,#ec4899); color:white;" },
  { id: "office-lady-enjoyer", text: "Office Lady Enjoyer", style: "background:linear-gradient(45deg,#374151,#6b7280,#9ca3af); color:white;" },
  { id: "dark-elf-believer", text: "Dark Elf Believer", style: "background:linear-gradient(45deg,#166534,#7c3aed,#111827); color:#f8fafc;" },
  { id: "school-uniform-lover", text: "Uniform Aesthetic", style: "background:linear-gradient(45deg,#2563eb,#60a5fa,#dbeafe); color:#111;" },
  { id: "red-eyes-enjoyer", text: "Red Eyes Enjoyer", style: "background:linear-gradient(45deg,#7f1d1d,#dc2626,#f87171); color:white;" },
  { id: "flat-is-justice", text: "Flat Is Justice", style: "background:linear-gradient(45deg,#60a5fa,#a5b4fc,#c4b5fd); color:#111;" },
  { id: "medium-is-premium", text: "Medium Is Premium", style: "background:linear-gradient(45deg,#f472b6,#fb7185,#fda4af); color:white;" },
  { id: "oppai-enjoyer", text: "Oppai Enjoyer", style: "background:linear-gradient(45deg,#ec4899,#db2777,#be185d); color:white;" },
  { id: "boing-boing-energy", text: "Boing Boing Energy", style: "background:linear-gradient(45deg,#f59e0b,#f97316,#ef4444); color:white;" },
  { id: "petite-supremacy", text: "Petite Supremacy", style: "background:linear-gradient(45deg,#67e8f9,#a5f3fc,#dbeafe); color:#111;" },
  { id: "balanced-build", text: "Balanced Build", style: "background:linear-gradient(45deg,#8b5cf6,#c084fc,#e9d5ff); color:#111;" },
  { id: "anime-physics-believer", text: "Anime Physics", style: "background:linear-gradient(45deg,#f43f5e,#ec4899,#8b5cf6); color:white;" },
  { id: "isekai-enjoyer", text: "Isekai Enjoyer", style: "background:linear-gradient(45deg,#f59e0b,#fde047,#facc15); color:#111;" },
  { id: "romcom-addict", text: "RomCom Addict", style: "background:linear-gradient(45deg,#ec4899,#f472b6,#f9a8d4); color:white;" },
  { id: "slice-of-life-soul", text: "Slice of Life Soul", style: "background:linear-gradient(45deg,#60a5fa,#93c5fd,#dbeafe); color:#111;" },
  { id: "psychological-damage", text: "Psychological Damage", style: "background:linear-gradient(45deg,#4c1d95,#7c3aed,#c084fc); color:white;" },
  { id: "mecha-enjoyer", text: "Mecha Enjoyer", style: "background:linear-gradient(45deg,#334155,#64748b,#94a3b8); color:white;" },
  { id: "dark-fantasy-cult", text: "Dark Fantasy Cult", style: "background:linear-gradient(45deg,#111827,#4c1d95,#7f1d1d); color:white;" },
  { id: "shounen-bloodline", text: "Shounen Bloodline", style: "background:linear-gradient(45deg,#dc2626,#f97316,#facc15); color:white;" },
  { id: "seinen-enjoyer", text: "Seinen Enjoyer", style: "background:linear-gradient(45deg,#1e2937,#475569,#64748b); color:#f8fafc;" },
  { id: "yuri-propaganda", text: "Yuri Propaganda", style: "background:linear-gradient(45deg,#db2777,#f472b6,#f9a8d4); color:white;" },
  { id: "horror-route", text: "Horror Route", style: "background:linear-gradient(45deg,#111827,#7f1d1d,#dc2626); color:white;" },
  { id: "fantasy-guild-member", text: "Fantasy Guild", style: "background:linear-gradient(45deg,#166534,#22c55e,#4ade80); color:#111;" },
  { id: "cyberpunk-mindset", text: "Cyberpunk Mindset", style: "background:linear-gradient(45deg,#06b6d4,#8b5cf6,#ec4899); color:white;" },
  { id: "school-festival-arc", text: "School Festival Arc", style: "background:linear-gradient(45deg,#fb7185,#f472b6,#f9a8d4); color:white;" },
  { id: "sports-anime-energy", text: "Sports Anime Energy", style: "background:linear-gradient(45deg,#2563eb,#22c55e,#facc15); color:white;" },
  { id: "idol-hell", text: "Idol Hell", style: "background:linear-gradient(45deg,#ec4899,#8b5cf6,#22d3ee); color:white;" },
  { id: "visual-novel-route", text: "Visual Novel Route", style: "background:linear-gradient(45deg,#7c3aed,#c084fc,#f9a8d4); color:white;" },
  { id: "gacha-lore-reader", text: "Gacha Lore Reader", style: "background:linear-gradient(45deg,#facc15,#f97316,#ef4444); color:white;" },
  { id: "post-apocalyptic-vibes", text: "Post-Apocalyptic", style: "background:linear-gradient(45deg,#374151,#6b7280,#9ca3af); color:white;" },
  { id: "cute-girls-doing-things", text: "CGDCT Enjoyer", style: "background:linear-gradient(45deg,#f9a8d4,#fbcfe8,#fdf2f8); color:#111;" },
  { id: "villainess-route", text: "Villainess Route", style: "background:linear-gradient(45deg,#7c3aed,#ec4899,#f43f5e); color:white;" },
  { id: "drama-victim", text: "Drama Victim", style: "background:linear-gradient(45deg,#7f1d1d,#b91c1c,#ef4444); color:white;" },
  { id: "emotional-damage", text: "Emotional Damage", style: "background:linear-gradient(45deg,#4338ca,#7c3aed,#c084fc); color:white;" },
  { id: "toxic-romance-reader", text: "Toxic Romance", style: "background:linear-gradient(45deg,#be123c,#ec4899,#f472b6); color:white;" },
  { id: "pain-arc-enjoyer", text: "Pain Arc Enjoyer", style: "background:linear-gradient(45deg,#111827,#4b5563,#7c3aed); color:white;" },
  { id: "betrayal-route", text: "Betrayal Route", style: "background:linear-gradient(45deg,#991b1b,#dc2626,#f87171); color:white;" },
  { id: "red-flag-collector", text: "Red Flag Collector", style: "background:linear-gradient(45deg,#b91c1c,#ef4444,#fb7185); color:white;" },
  { id: "copium-inhaler", text: "Copium Inhaler", style: "background:linear-gradient(45deg,#2563eb,#60a5fa,#93c5fd); color:#111;" },
  { id: "suffering-build", text: "Suffering Build", style: "background:linear-gradient(45deg,#1e2937,#374151,#6b7280); color:white;" },
  { id: "ntr-enjoyer", text: "NTR Enjoyer", style: "background:linear-gradient(45deg,#1e293b,#7f1d1d,#dc2626); color:white;" }
];

  const GAME_ROLES = [
  // HoYoverse
  { id: "genshin", name: "Genshin Impact", icon: "🌟", color: "#a78bfa" },
  { id: "honkai-star-rail", name: "Honkai: Star Rail", icon: "🚂", color: "#c084fc" },
  { id: "zenless-zone-zero", name: "Zenless Zone Zero", icon: "🦾", color: "#22d3ee" },

  // Anime / Gacha
  { id: "azur-lane", name: "Azur Lane", icon: "⚓", color: "#60a5fa" },
  { id: "blue-archive", name: "Blue Archive", icon: "📖", color: "#f472b6" },
  { id: "nikke", name: "Goddess of Victory: Nikke", icon: "🔫", color: "#f59e0b" },
  { id: "arknights", name: "Arknights", icon: "🛡️", color: "#64748b" },
  { id: "punishing-gray-raven", name: "Punishing: Gray Raven", icon: "⚔️", color: "#ef4444" },
  { id: "wuthering-waves", name: "Wuthering Waves", icon: "🌊", color: "#4ade80" },
  { id: "tower-of-fantasy", name: "Tower of Fantasy", icon: "🌌", color: "#8b5cf6" },

  // MOBA
  { id: "mobile-legends", name: "Mobile Legends", icon: "🛡️", color: "#3b82f6" },
  { id: "league-of-legends", name: "League of Legends", icon: "⚔️", color: "#f59e0b" },
  { id: "wild-rift", name: "League of Legends: Wild Rift", icon: "💎", color: "#06b6d4" },
  { id: "dota-2", name: "Dota 2", icon: "🔥", color: "#ef4444" },

  // FPS / Shooter
  { id: "valorant", name: "Valorant", icon: "🎯", color: "#f43f5e" },
  { id: "counter-strike-2", name: "Counter-Strike 2", icon: "💣", color: "#f97316" },
  { id: "call-of-duty", name: "Call of Duty", icon: "🔫", color: "#eab308" },
  { id: "warzone", name: "Warzone", icon: "☠️", color: "#84cc16" },
  { id: "apex-legends", name: "Apex Legends", icon: "🏹", color: "#ef4444" },
  { id: "overwatch-2", name: "Overwatch 2", icon: "🦸", color: "#fb923c" },
  { id: "rainbow-six-siege", name: "Rainbow Six Siege", icon: "🚔", color: "#64748b" },

  // Battle Royale
  { id: "pubg", name: "PUBG", icon: "🍗", color: "#f59e0b" },
  { id: "free-fire", name: "Free Fire", icon: "🔥", color: "#f97316" },
  { id: "fortnite", name: "Fortnite", icon: "🏗️", color: "#22c55e" },

  // Sandbox / Survival
  { id: "minecraft", name: "Minecraft", icon: "⛏️", color: "#22c55e" },
  { id: "terraria", name: "Terraria", icon: "🌳", color: "#84cc16" },
  { id: "roblox", name: "Roblox", icon: "🧱", color: "#ef4444" },
  { id: "palworld", name: "Palworld", icon: "🐾", color: "#06b6d4" },

  // RPG
  { id: "elden-ring", name: "Elden Ring", icon: "👑", color: "#eab308" },
  { id: "dark-souls", name: "Dark Souls", icon: "🔥", color: "#dc2626" },
  { id: "monster-hunter", name: "Monster Hunter", icon: "🐉", color: "#16a34a" },
  { id: "final-fantasy-xiv", name: "Final Fantasy XIV", icon: "✨", color: "#8b5cf6" },
  { id: "skyrim", name: "Skyrim", icon: "🐲", color: "#94a3b8" },
  { id: "the-witcher-3", name: "The Witcher 3", icon: "🐺", color: "#ef4444" },

  // MMORPG
  { id: "world-of-warcraft", name: "World of Warcraft", icon: "🌍", color: "#f59e0b" },
  { id: "black-desert", name: "Black Desert Online", icon: "🏜️", color: "#64748b" },
  { id: "runescape", name: "RuneScape", icon: "⚒️", color: "#ca8a04" },

  // Racing
  { id: "forza-horizon-5", name: "Forza Horizon 5", icon: "🏎️", color: "#f97316" },
  { id: "gran-turismo-7", name: "Gran Turismo 7", icon: "🚗", color: "#3b82f6" },
  { id: "need-for-speed", name: "Need for Speed", icon: "🚓", color: "#ef4444" },

  // Sports
  { id: "ea-fc-26", name: "EA Sports FC", icon: "⚽", color: "#22c55e" },
  { id: "nba-2k", name: "NBA 2K", icon: "🏀", color: "#f97316" },

  // Horror
  { id: "resident-evil", name: "Resident Evil", icon: "🧟", color: "#dc2626" },
  { id: "dead-by-daylight", name: "Dead by Daylight", icon: "🪝", color: "#9333ea" },
  { id: "silent-hill", name: "Silent Hill", icon: "🌫️", color: "#64748b" },

  // Nintendo
  { id: "pokemon", name: "Pokémon", icon: "⚡", color: "#eab308" },
  { id: "zelda", name: "The Legend of Zelda", icon: "🗡️", color: "#22c55e" },
  { id: "mario", name: "Super Mario", icon: "🍄", color: "#ef4444" },

  // Fighting
  { id: "tekken-8", name: "Tekken 8", icon: "🥊", color: "#ef4444" },
  { id: "street-fighter-6", name: "Street Fighter 6", icon: "👊", color: "#f97316" },
  { id: "mortal-kombat-1", name: "Mortal Kombat 1", icon: "🐉", color: "#dc2626" },

  // Indie
  { id: "hollow-knight", name: "Hollow Knight", icon: "🪲", color: "#94a3b8" },
  { id: "stardew-valley", name: "Stardew Valley", icon: "🌾", color: "#22c55e" },
  { id: "among-us", name: "Among Us", icon: "🚀", color: "#f43f5e" }
];

  function getDB() {
    if (typeof firebase === "undefined" || !firebase.firestore) return null;
    return firebase.firestore();
  }

  function getCommentLevel(commentCount = 0) {
    return Math.floor(commentCount / 10) + 1;
  }

  // ==================== SHOW PROFILE ====================
  window.showUserProfile = async function (uid) {
    if (!uid) return;

    const db = getDB();
    if (!db) {
      alert("Firestore belum dimuat");
      return;
    }

    let modal = document.getElementById("user-profile-modal");

    if (!modal) {
      modal = document.createElement("div");
      modal.id = "user-profile-modal";
      modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.9); z-index: 99999; display: none;
        align-items: center; justify-content: center; padding: 12px; box-sizing: border-box;
      `;

      modal.innerHTML = `
        <div style="background:#1f1f2e; width:100%; max-width:380px; border-radius:14px; padding:18px; position:relative; color:white;">
          <button onclick="closeProfileModal()" style="position:absolute; top:10px; right:14px; background:none; border:none; font-size:24px; color:#aaa; cursor:pointer;">×</button>

          <div style="display:flex; align-items:flex-start; gap:14px; margin-bottom:16px;">
            <div style="display:flex; flex-direction:column; align-items:flex-start; flex-shrink:0;">
              <img id="modal-avatar" src="" style="width:80px; height:80px; border-radius:15px; border:3px solid #7c3aed; object-fit:cover;">
              <div style="margin-top:8px; font-size:0.78em; color:#aaa; text-align:left;">
                <div style="color:#777;">Joined</div>
                <div id="modal-joined" style="color:#60a5fa; font-weight:600;">—</div>
              </div>
            </div>

            <div style="flex:1; min-width:0;">
              <h2 id="modal-displayname" style="margin:0; font-size:1.15rem; font-weight:700; line-height:1.3; word-break:break-word;">Loading...</h2>
              <p id="modal-username" style="margin:4px 0; color:#aaa; font-size:0.85rem;"></p>
              <p id="modal-bio" style="margin:6px 0 0; color:#ccc; font-size:0.85rem; line-height:1.4; word-break:break-word;"></p>
            </div>
          </div>

          <button id="profile-dm-btn" style="
            width:100%; height:34px; background:transparent; color:#22c55e;
            border:1px solid #22c55e; border-radius:8px; font-size:12px; font-weight:600;
            cursor:pointer; margin-bottom:12px;
          ">Message</button>

          <div style="background:#28283a; border-radius:12px; padding:14px; margin-bottom:14px;">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; text-align:center;">
              <div>
                <div style="color:#aaa;font-size:.75rem;">Level</div>
                <div id="modal-level" style="color:#ffd700;font-weight:700;margin-top:4px;"></div>
              </div>
              <div>
                <div style="color:#aaa;font-size:.75rem;">Points</div>
                <div id="modal-points" style="color:#ffd700;font-weight:700;margin-top:4px;"></div>
              </div>
              <div>
                <div style="color:#aaa;font-size:.75rem;">Comments</div>
                <div id="modal-commentcount" style="margin-top:4px;"></div>
              </div>
              <div>
                <div style="color:#aaa;font-size:.75rem;">Reputation</div>
                <div id="modal-reputation" style="font-weight:700;margin-top:4px;"></div>
              </div>
            </div>
          </div>

          <div style="width:100%; display:flex; align-items:center; gap:10px; margin-bottom:12px; color:#ddd; font-size:13px; font-weight:700;">
            <span>Badge Collection</span>
            <div style="flex:1; height:1px; background:rgba(255,255,255,.15);"></div>
          </div>

          <div id="modal-badge" style="text-align:center; min-height:32px;"></div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    // Reset
    document.getElementById("modal-avatar").src = ANONYMOUS_AVATAR;
    document.getElementById("modal-displayname").textContent = "Loading...";
    document.getElementById("modal-username").textContent = "";
    document.getElementById("modal-bio").textContent = "";
    document.getElementById("modal-joined").textContent = "—";
    document.getElementById("modal-badge").innerHTML = "";

    try {
      const doc = await db.collection("userStats").doc(uid).get();
      const data = doc.exists ? doc.data() : {};

      // Avatar & basic info
      document.getElementById("modal-avatar").src = data.avatar || ANONYMOUS_AVATAR;
      document.getElementById("modal-displayname").textContent = data.displayName || "Anonymous";
      document.getElementById("modal-username").textContent = data.username ? "@" + data.username : "";
      document.getElementById("modal-bio").textContent = data.bio || "Belum ada bio.";

      // Joined date
      let joinedDate = "—";
      const getJoinedDate = (ts) => {
        if (!ts) return "—";
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        return date.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
      };

      if (data.joinedAt) joinedDate = getJoinedDate(data.joinedAt);
      else if (data.createdAt) joinedDate = getJoinedDate(data.createdAt);
      else if (uid === window.currentUser?.uid && window.currentUser?.metadata?.creationTime) {
        joinedDate = new Date(window.currentUser.metadata.creationTime).toLocaleDateString("id-ID", {
          day: "2-digit", month: "2-digit", year: "numeric"
        });
      }
      document.getElementById("modal-joined").textContent = joinedDate;

      // Stats
      const level = getCommentLevel(data.commentCount || 0);
      document.getElementById("modal-level").textContent = `Lv. ${level}`;
      document.getElementById("modal-points").textContent = `${(data.points || 0).toLocaleString()} pts`;
      document.getElementById("modal-commentcount").textContent = (data.commentCount || 0).toLocaleString();

      const reputation = data.reputation || 0;
      const repEl = document.getElementById("modal-reputation");
      repEl.textContent = reputation >= 0 ? `+${reputation.toLocaleString()}` : reputation.toLocaleString();
      repEl.style.color = reputation > 0 ? "#4ade80" : reputation < 0 ? "#ef4444" : "#aaa";

      // Badge
      const badgeDiv = document.getElementById("modal-badge");
      badgeDiv.innerHTML = "";
      if (data.customBadge) {
        const badge = BADGES.find(b => b.id === data.customBadge);
        if (badge) {
          const el = document.createElement("span");
          el.className = `user-custom-badge ${badge.id}`;
          el.style.cssText = badge.style || "";
          el.textContent = badge.text;
          badgeDiv.appendChild(el);
        }
      }

      // Game Roles
      let existingRoles = document.getElementById("modal-game-roles");
      if (existingRoles) existingRoles.remove();

      if (data.gameRoles && Array.isArray(data.gameRoles) && data.gameRoles.length > 0) {
        const rolesDiv = document.createElement("div");
        rolesDiv.id = "modal-game-roles";
        rolesDiv.style.cssText = `
          margin-top:14px; display:flex; flex-wrap:wrap; justify-content:center; align-items:center; gap:6px;
        `;

        const title = document.createElement("div");
        title.style.cssText = `
          width:100%; display:flex; align-items:center; gap:10px; margin:0 0 12px 0;
          color:#fff; font-size:13px; font-weight:700;
        `;
        title.innerHTML = `
          <span>Game Roles</span>
          <div style="flex:1; height:1px; background:rgba(255,255,255,.15);"></div>
        `;
        rolesDiv.appendChild(title);

        data.gameRoles.forEach(rId => {
          const role = GAME_ROLES.find(r => r.id === rId);
          if (role) {
            const badge = document.createElement("span");
            badge.style.cssText = `
              padding:3px 8px; border-radius:8px; background:rgba(255,255,255,.06);
              color:${role.color}; font-size:.72em; font-weight:600;
              border:1px solid rgba(255,255,255,.08); display:inline-flex; align-items:center; gap:4px;
            `;
            badge.innerHTML = `${role.icon} ${role.name}`;
            rolesDiv.appendChild(badge);
          }
        });

        const badgeContainer = document.getElementById("modal-badge");
        if (badgeContainer && badgeContainer.parentNode) {
          badgeContainer.parentNode.appendChild(rolesDiv);
        }
      }

      // DM button
      const dmBtn = document.getElementById("profile-dm-btn");
      if (dmBtn) {
        dmBtn.onclick = () => {
          closeProfileModal();
          if (typeof openDmToUser === "function") {
            openDmToUser(uid, data.displayName || "Anonymous", data.avatar || ANONYMOUS_AVATAR);
          } else {
            alert("Fitur DM belum tersedia di halaman ini");
          }
        };
      }

      modal.style.display = "flex";
    } catch (e) {
      console.error("Error loading profile:", e);
      document.getElementById("modal-joined").textContent = "—";
    }
  };

  // ==================== CLOSE ====================
  window.closeProfileModal = function () {
    const modal = document.getElementById("user-profile-modal");
    if (modal) modal.style.display = "none";
  };

})();

/* ==========================================================
   DIRECT MESSAGES MODULE
   ========================================================== */

(function () {
  "use strict";

  const ANONYMOUS_AVATAR = "https://ui-avatars.com/api/?name=User&background=7c3aed&color=fff";

  function getDB() {
    if (typeof firebase === "undefined" || !firebase.firestore) {
      console.warn("Firestore belum tersedia");
      return null;
    }
    return firebase.firestore();
  }

  // ==================== INJECT CSS ====================
  const style = document.createElement("style");
  style.textContent = `
/* ================= DM MODAL ================= */
#dm-modal {
  display: none;
  position: fixed;
  inset: 0;
  z-index: 30000;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.dm-wrapper {
  width: 100%;
  max-width: 720px;
  height: 78vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  border-radius: 22px;
  background: rgba(2, 7, 2, 0.55);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  border: 1px solid rgba(77, 255, 101, 0.18);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

/* ================= HEADER ================= */
.dm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 64px;
  padding: 0 24px;
  background: rgba(133, 255, 77, 0.04);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.dm-header h2 {
  margin: 0;
  color: #b0ff8c;
  font-size: 1.25rem;
  font-weight: 700;
}

.dm-header-btn {
  width: 42px;
  height: 42px;
  border: none;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  transition: 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dm-header-btn:hover {
  background: rgba(98, 255, 77, 0.15);
}

#dm-close-btn:hover {
  background: #f55321 !important;
}

/* ================= BODY ================= */
.dm-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* ================= INBOX ================= */
#dm-inbox {
  width: 240px;
  min-width: 240px;
  background: rgba(255, 255, 255, 0.02);
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  overflow-y: auto;
}

#dm-inbox::-webkit-scrollbar {
  width: 6px;
}
#dm-inbox::-webkit-scrollbar-thumb {
  background: rgba(119, 255, 77, 0.2);
  border-radius: 999px;
}

.dm-user-item {
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: 0.2s;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.dm-user-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.dm-user-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.dm-user-info {
  flex: 1;
  min-width: 0;
}

.dm-user-name {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dm-user-lastmsg {
  font-size: 12px;
  color: #a1a1a1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

.dm-user-time {
  font-size: 11px;
  color: #777;
  flex-shrink: 0;
}

/* ================= CHAT AREA ================= */
#dm-chat-area {
  flex: 1;
  display: none;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.015);
}

.dm-chat-header {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 64px;
  padding: 0 20px;
  background: rgba(113, 255, 77, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

#dm-chat-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(77, 255, 77, 0.5);
}

#dm-chat-name {
  color: #fff;
  font-size: 1rem;
  font-weight: 700;
}

#dm-chat-status {
  color: #fbbf24;
  font-size: 0.85rem;
}

/* ================= MESSAGES ================= */
#dm-chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: radial-gradient(circle at top, rgba(92, 255, 77, 0.03), transparent 50%);
}

#dm-chat-messages::-webkit-scrollbar {
  width: 6px;
}
#dm-chat-messages::-webkit-scrollbar-thumb {
  background: rgba(77, 255, 86, 0.2);
  border-radius: 999px;
}

.dm-message {
  max-width: 75%;
  padding: 11px 16px;
  border-radius: 18px;
  word-break: break-word;
  line-height: 1.4;
  position: relative;
}

.dm-message.me {
  align-self: flex-end;
  background: #2563eb;
  color: #fff;
  border-radius: 18px 18px 4px 18px;
}

.dm-message.other {
  align-self: flex-start;
  background: #334155;
  color: #fff;
  border-radius: 18px 18px 18px 4px;
}

.dm-message-time {
  font-size: 0.72rem;
  opacity: 0.7;
  margin-top: 4px;
  text-align: right;
  display: block;
}

/* ================= INPUT ================= */
.dm-input {
  padding: 16px 18px;
  background: rgba(255, 255, 255, 0.02);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.dm-input-wrap {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

#dm-text {
  flex: 1;
  min-height: 48px;
  max-height: 120px;
  padding: 12px 16px;
  border: none;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
  resize: none;
  font-size: 15px;
  transition: 0.2s;
}

#dm-text::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

#dm-text:focus {
  outline: none;
  background: rgba(255, 255, 255, 0.09);
  box-shadow: 0 0 0 2px rgba(77, 255, 77, 0.15);
}

#dm-text:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dm-send-btn {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, #62ff4d, #4adc26);
  color: white;
  font-size: 18px;
  cursor: pointer;
  transition: 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dm-send-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(98, 255, 77, 0.3);
}

.dm-send-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* ================= EMPTY STATE ================= */
.dm-empty {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #777;
  text-align: center;
  padding: 30px;
  font-size: 0.95rem;
}

/* ================= MOBILE ================= */
/* ================= MOBILE ================= */
@media (max-width: 768px) {
  #dm-modal {
    padding: 8px;
    align-items: center;
    justify-content: center;
  }

  .dm-wrapper {
    width: 100%;
    height: 94vh;
    max-height: 94vh;
    border-radius: 18px;
    overflow: hidden;
  }

  /* HEADER SELALU DI ATAS CHAT */
  .dm-header {
    position: relative;
    z-index: 20;
    min-height: 64px;
    padding: 0 12px;
  }

  .dm-header h2 {
    flex: 1;
    text-align: center;
    margin: 0 10px;
  }

  .dm-header-btn {
    position: relative;
    z-index: 30;
    width: 42px;
    height: 42px;
    flex-shrink: 0;
  }

  #dm-back-btn {
    display: flex !important;
  }

  #dm-close-btn {
    display: flex !important;
  }

  /* BODY */
  .dm-body {
    position: relative;
    flex: 1;
    min-height: 0;
  }

  /* INBOX */
  #dm-inbox {
    width: 100%;
    min-width: 100%;
    height: 100%;
  }

  #dm-chat-area {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 5;
    display: none;
    background: rgba(2, 7, 2, 0.97);
  }

  .dm-chat-header {
    min-height: 64px;
    padding: 0 14px;
  }

  #dm-chat-messages {
    padding: 16px 12px;
  }

  .dm-input {
    padding: 12px;
  }

  .dm-input-wrap {
    gap: 8px;
  }

  #dm-text {
    min-height: 46px;
  }

  .dm-send-btn {
    width: 46px;
    height: 46px;
  }
}

@media (max-width: 480px) {
  .dm-wrapper {
    height: 96vh;
    max-height: 96vh;
    border-radius: 16px;
  }

  .dm-header {
    min-height: 58px;
    padding: 0 8px;
  }

  .dm-header h2 {
    font-size: 1rem;
  }

  .dm-header-btn {
    width: 40px;
    height: 40px;
    font-size: 18px;
  }

  .dm-chat-header {
    min-height: 58px;
  }

  #dm-chat-avatar {
    width: 38px;
    height: 38px;
  }

  #dm-chat-messages {
    padding: 12px 10px;
  }

  .dm-message {
    max-width: 85%;
  }
}
`;
  document.head.appendChild(style);

  // ==================== INJECT HTML ====================
  function injectDmModal() {
    if (document.getElementById("dm-modal")) return;

    const modal = document.createElement("div");
    modal.id = "dm-modal";

    modal.innerHTML = `
      <div class="dm-wrapper">
        <!-- HEADER -->
        <div class="dm-header">
          <button id="dm-back-btn" class="dm-header-btn" style="display:none;">←</button>
          <h2>Direct Messages</h2>
          <button id="dm-close-btn" class="dm-header-btn">✕</button>
        </div>

        <!-- BODY -->
        <div class="dm-body">
          <!-- INBOX -->
          <div id="dm-inbox"></div>

          <!-- CHAT AREA -->
          <div id="dm-chat-area">
            <div class="dm-chat-header" id="dm-chat-header" style="display:none;">
              <img id="dm-chat-avatar" src="" alt="avatar">
              <div>
                <div id="dm-chat-name">User</div>
                <div id="dm-chat-status">@username</div>
              </div>
            </div>

            <div id="dm-chat-messages">
              <div class="dm-empty">Select a conversation to start chatting</div>
            </div>

            <div class="dm-input">
              <div class="dm-input-wrap">
                <textarea id="dm-text" placeholder="Select a conversation first" disabled></textarea>
                <button id="dm-send-btn" class="dm-send-btn" disabled>➤</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Events
    document.getElementById("dm-close-btn").onclick = closeDmModal;
    document.getElementById("dm-back-btn").onclick = backToInbox;
    document.getElementById("dm-send-btn").onclick = sendDirectMessage;

    // Enter to send
    document.getElementById("dm-text").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendDirectMessage();
      }
    });
  }

  // ==================== LOAD INBOX ====================
  window.loadDmInbox = async function () {
    injectDmModal();

    const modal = document.getElementById("dm-modal");
    modal.style.display = "flex";

    const inbox = document.getElementById("dm-inbox");
    if (!inbox) return;

    // Reset chat area
    document.getElementById("dm-chat-header").style.display = "none";
    document.getElementById("dm-chat-messages").innerHTML = `
      <div class="dm-empty">Select a conversation to start chatting</div>
    `;
    document.getElementById("dm-text").disabled = true;
    document.getElementById("dm-text").placeholder = "Select a conversation first";
    document.getElementById("dm-send-btn").disabled = true;

    if (!window.currentUser) {
      inbox.innerHTML = `<div class="dm-empty" style="color:#f87171;">Login dulu untuk melihat DM</div>`;
      return;
    }

    inbox.innerHTML = `<div class="dm-empty">Loading...</div>`;

    const db = getDB();
    if (!db) {
      inbox.innerHTML = `<div class="dm-empty" style="color:#f87171;">Firestore belum dimuat</div>`;
      return;
    }

    try {
      const snap = await db.collection("directMessages")
        .where("participants", "array-contains", window.currentUser.uid)
        .orderBy("timestamp", "desc")
        .limit(50)
        .get();

      const chats = new Map();

      for (const doc of snap.docs) {
        const m = doc.data();
        const otherUid = m.from === window.currentUser.uid ? m.to : m.from;
        if (!otherUid || chats.has(otherUid)) continue;

        const name = m.from === window.currentUser.uid
          ? (m.toName || "User")
          : (m.fromName || "User");

        const avatar = m.from === window.currentUser.uid
          ? (m.toAvatar || ANONYMOUS_AVATAR)
          : (m.fromAvatar || ANONYMOUS_AVATAR);

        const timeStr = m.timestamp
          ? m.timestamp.toDate().toLocaleDateString("id-ID", { month: "short", day: "numeric" })
          : "";

        chats.set(otherUid, {
          uid: otherUid,
          name,
          avatar,
          last: (m.text || "").substring(0, 45) + ((m.text || "").length > 45 ? "..." : ""),
          time: timeStr
        });
      }

      if (chats.size === 0) {
        inbox.innerHTML = `<div class="dm-empty">Belum ada percakapan</div>`;
        return;
      }

      let html = "";
      chats.forEach(c => {
        html += `
          <div class="dm-user-item" onclick="openChat('${c.uid}')">
            <img src="${c.avatar}" class="dm-user-avatar" onerror="this.src='${ANONYMOUS_AVATAR}'">
            <div class="dm-user-info">
              <div class="dm-user-name">${c.name}</div>
              <div class="dm-user-lastmsg">${c.last || "—"}</div>
            </div>
            <small class="dm-user-time">${c.time}</small>
          </div>
        `;
      });

      inbox.innerHTML = html;

    } catch (e) {
      console.error("DM Inbox error:", e);
      inbox.innerHTML = `<div class="dm-empty" style="color:#f87171;">Gagal memuat inbox</div>`;
    }
  };

  // ==================== OPEN CHAT ====================
  window.openChat = async function (uid) {
    if (!uid || !window.currentUser) return;

    window.currentChatUid = uid;

    const inbox = document.getElementById("dm-inbox");
    const chatArea = document.getElementById("dm-chat-area");
    const chatHeader = document.getElementById("dm-chat-header");
    const backBtn = document.getElementById("dm-back-btn");
    const textEl = document.getElementById("dm-text");
    const sendBtn = document.getElementById("dm-send-btn");

    // Mobile / Desktop handling
    if (window.innerWidth <= 768) {
      if (inbox) inbox.style.display = "none";
      if (chatArea) {
        chatArea.style.display = "flex";
      }
      if (backBtn) backBtn.style.display = "flex";
    } else {
      if (inbox) {
        inbox.style.display = "block";
        inbox.style.width = "240px";
      }
      if (chatArea) {
        chatArea.style.display = "flex";
        chatArea.style.position = "relative";
      }
      if (backBtn) backBtn.style.display = "none";
    }

    if (chatHeader) chatHeader.style.display = "flex";

    textEl.disabled = false;
    textEl.placeholder = "Type a message...";
    sendBtn.disabled = false;

    // Load user data
    const db = getDB();
    let name = "User";
    let avatar = ANONYMOUS_AVATAR;

    if (db) {
      try {
        const doc = await db.collection("userStats").doc(uid).get();
        if (doc.exists) {
          const data = doc.data();
          name = data.displayName || data.username || "User";
          avatar = data.avatar || ANONYMOUS_AVATAR;
        }
      } catch (e) {
        console.warn("Gagal ambil data user", e);
      }
    }

    document.getElementById("dm-chat-name").textContent = name;
    document.getElementById("dm-chat-status").textContent = "@" + (name.toLowerCase().replace(/\s+/g, "") || "user");
    const avatarEl = document.getElementById("dm-chat-avatar");
    avatarEl.src = avatar;
    avatarEl.onerror = () => (avatarEl.src = ANONYMOUS_AVATAR);

    // Load messages
    const messagesEl = document.getElementById("dm-chat-messages");
    messagesEl.innerHTML = `<div class="dm-empty">Loading chat...</div>`;

    if (!db) return;

    try {
      const snap = await db.collection("directMessages")
        .where("participants", "array-contains", window.currentUser.uid)
        .orderBy("timestamp", "asc")
        .get();

      messagesEl.innerHTML = "";
      let count = 0;

      snap.forEach(doc => {
        const m = doc.data();
        if (!m.participants?.includes(uid)) return;

        count++;
        const isMe = m.from === window.currentUser.uid;

        const div = document.createElement("div");
        div.className = `dm-message ${isMe ? "me" : "other"}`;

        const time = m.timestamp
          ? m.timestamp.toDate().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
          : "";

        div.innerHTML = `
          <div>${m.deleted ? "<i style='opacity:.6'>Message deleted</i>" : (m.text || "")}</div>
          <span class="dm-message-time">${time}${m.edited ? " • edited" : ""}</span>
        `;

        messagesEl.appendChild(div);
      });

      if (count === 0) {
        messagesEl.innerHTML = `
          <div class="dm-empty">
            Belum ada pesan.<br>
            <small>Ketik di bawah untuk memulai</small>
          </div>
        `;
      }

      messagesEl.scrollTop = messagesEl.scrollHeight;
    } catch (e) {
      console.error(e);
      messagesEl.innerHTML = `<div class="dm-empty" style="color:#f87171;">Gagal memuat chat</div>`;
    }
  };

  // ==================== SEND MESSAGE ====================
  async function sendDirectMessage() {
    if (!window.currentChatUid || !window.currentUser) return;

    const textEl = document.getElementById("dm-text");
    const text = textEl.value.trim();
    if (!text) return;

    const db = getDB();
    if (!db) return;

    try {
      // Ambil data lawan bicara
      let toName = "User";
      let toAvatar = ANONYMOUS_AVATAR;

      try {
        const doc = await db.collection("userStats").doc(window.currentChatUid).get();
        if (doc.exists) {
          const data = doc.data();
          toName = data.displayName || data.username || "User";
          toAvatar = data.avatar || ANONYMOUS_AVATAR;
        }
      } catch (e) {}

      await db.collection("directMessages").add({
        from: window.currentUser.uid,
        to: window.currentChatUid,
        text: text,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        participants: [window.currentUser.uid, window.currentChatUid],
        read: false,
        fromName: window.currentUser.displayName || "User",
        fromAvatar: window.currentUser.photoURL || ANONYMOUS_AVATAR,
        toName,
        toAvatar
      });

      textEl.value = "";
      openChat(window.currentChatUid); // refresh
    } catch (e) {
      console.error(e);
      alert("Gagal mengirim pesan");
    }
  }

  // ==================== HELPERS ====================
  window.openDmToUser = function (uid, name, avatar) {
    loadDmInbox();
    setTimeout(() => openChat(uid), 350);
  };

  function closeDmModal() {
    const modal = document.getElementById("dm-modal");
    if (modal) modal.style.display = "none";
    window.currentChatUid = null;
  }

  function backToInbox() {
    const inbox = document.getElementById("dm-inbox");
    const chatArea = document.getElementById("dm-chat-area");
    const backBtn = document.getElementById("dm-back-btn");

    if (inbox) inbox.style.display = "block";
    if (chatArea) chatArea.style.display = "none";
    if (backBtn) backBtn.style.display = "none";

    window.currentChatUid = null;

    document.getElementById("dm-chat-messages").innerHTML = `
      <div class="dm-empty">Select a conversation to start chatting</div>
    `;
    document.getElementById("dm-text").disabled = true;
    document.getElementById("dm-text").placeholder = "Select a conversation first";
    document.getElementById("dm-send-btn").disabled = true;
  }

  // Auto inject
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectDmModal);
  } else {
    injectDmModal();
  }

})();


// Notification module (Reply + Mention)

(function () {
 
  function getDB() {
    if (typeof firebase === "undefined" || !firebase.firestore) {
      console.warn("Firestore belum tersedia");
      return null;
    }
    return firebase.firestore();
  }

  // ==================== INJECT OVERLAY ====================
  function injectNotifOverlay() {
    if (document.getElementById("reply-notif-overlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "reply-notif-overlay";
    overlay.style.cssText = `
      display:none;
      position:fixed;
      inset:0;
      z-index:99999;
      background:rgba(0,20,40,0.45);
      justify-content:center;
      align-items:center;
      padding:16px;
    `;

    overlay.innerHTML = `
      <div style="
        background:rgba(30,41,59,0.95);
        border:1px solid rgba(96,165,250,0.25);
        color:#e2e8f0;
        padding:20px;
        border-radius:16px;
        max-width:420px;
        width:92%;
        max-height:80vh;
        overflow-y:auto;
        position:relative;
        backdrop-filter:blur(12px);
      ">
        <button onclick="closeReplyNotifications()" style="
          position:absolute;
          top:12px;
          right:16px;
          background:none;
          border:none;
          color:#93c5fd;
          font-size:22px;
          cursor:pointer;
        ">×</button>

        <h3 style="margin:0 0 16px 0; text-align:center; color:#93c5fd;">
          Notifications
        </h3>

        <div id="reply-notif-list"></div>
      </div>
    `;

    document.body.appendChild(overlay);
  }

  // ==================== LOAD NOTIFICATIONS ====================
  window.loadUserNotifications = function () {
    if (!window.currentUser) {
      alert("Harap login terlebih dahulu");
      return;
    }

    injectNotifOverlay();

    const overlay = document.getElementById("reply-notif-overlay");
    if (overlay) overlay.style.display = "flex";

    const list = document.getElementById("reply-notif-list");
    if (!list) return;

    list.innerHTML = `
      <div style="text-align:center; padding:30px; color:#94a3b8;">
        Loading notifications...
      </div>
    `;

    const db = getDB();
    if (!db) {
      list.innerHTML = `
        <div style="text-align:center; padding:40px; color:#f87171;">
          Firestore belum dimuat
        </div>
      `;
      return;
    }

    db.collection("notifications")
      .doc(window.currentUser.uid)
      .get()
      .then((doc) => {
        if (!doc.exists) {
          list.innerHTML = `
            <div style="text-align:center; padding:40px; color:#64748b;">
              Tidak ada notifikasi
            </div>
          `;
          return;
        }

        const data = doc.data();
        const replies = data.replies || [];
        const mentions = data.mentions || [];

        const all = [
          ...replies.map((r) => ({ ...r, notifType: "reply" })),
          ...mentions.map((m) => ({ ...m, notifType: "mention" })),
        ].sort((a, b) => (b.date || 0) - (a.date || 0));

        if (all.length === 0) {
          list.innerHTML = `
            <div style="text-align:center; padding:40px; color:#64748b;">
              Tidak ada notifikasi
            </div>
          `;
          return;
        }

        list.innerHTML = all
          .map((n) => {
            const isMention = n.notifType === "mention";
            const typeLabel = isMention ? "mentioned you" : "replied to you";
            const color = isMention ? "#93c5fd" : "#60a5fa";

            const time = n.date
              ? new Date(n.date).toLocaleString("id-ID", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "";

            const link = n.commentLink || n.link || "#";

            return `
              <div class="notif-item" style="
                padding:14px 16px;
                margin-bottom:12px;
                border:1px solid rgba(94,145,255,0.4);
                border-radius:14px;
                background:rgba(75,102,255,0.12);
              ">
                <div style="font-weight:700; color:${color}; margin-bottom:4px;">
                  ${n.author || "Someone"}
                </div>
                <div style="font-size:0.9rem; color:#e2e8f0; margin-bottom:6px;">
                  ${typeLabel}
                </div>
                <div style="font-size:0.88rem; color:#cbd5e1; line-height:1.4;">
                  ${n.text || n.message || ""}
                </div>
                ${
                  time
                    ? `<div style="font-size:0.75rem; color:#94a3b8; margin-top:8px;">${time}</div>`
                    : ""
                }
                ${
                  link !== "#"
                    ? `<a href="${link}" style="
                        display:inline-block;
                        margin-top:10px;
                        color:#5edaff;
                        font-weight:600;
                        text-decoration:none;
                        font-size:0.85rem;
                      ">Lihat komentar →</a>`
                    : ""
                }
              </div>
            `;
          })
          .join("");
      })
      .catch((err) => {
        console.error("Notif error:", err);
        list.innerHTML = `
          <div style="color:#f87171; text-align:center; padding:40px;">
            Gagal memuat notifikasi
          </div>
        `;
      });
  };

  // ==================== CLOSE ====================
  window.closeReplyNotifications = function () {
    const overlay = document.getElementById("reply-notif-overlay");
    if (overlay) overlay.style.display = "none";
  };

  // Auto inject
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectNotifOverlay);
  } else {
    injectNotifOverlay();
  }
})();