"use client";

import { useEffect } from "react";

type DataRecord = Record<string, unknown>;
type CompatTimestamp = { toDate?: () => Date };
type CompatDocument = {
  id: string;
  exists: boolean;
  data: () => DataRecord | undefined;
};
type CompatQuerySnapshot = {
  docs: CompatDocument[];
  forEach: (callback: (doc: CompatDocument) => void) => void;
};
type CompatDocumentReference = {
  get: () => Promise<CompatDocument>;
};
type CompatQuery = {
  where: (field: string, operator: string, value: unknown) => CompatQuery;
  orderBy: (field: string, direction: "asc" | "desc") => CompatQuery;
  limit: (count: number) => CompatQuery;
  get: () => Promise<CompatQuerySnapshot>;
};
type CompatCollection = CompatQuery & {
  doc: (id: string) => CompatDocumentReference;
  add: (data: DataRecord) => Promise<unknown>;
};
type CompatFirestore = {
  collection: (name: string) => CompatCollection;
};
type CompatSdk = {
  firestore?: (() => CompatFirestore) & {
    FieldValue?: { serverTimestamp?: () => unknown };
  };
};
type CompatUser = {
  uid: string;
  displayName?: string | null;
  photoURL?: string | null;
  metadata?: { creationTime?: string };
};
type HistoryEntry = {
  series?: string;
  title?: string;
  chapter?: string;
  cover?: string;
  slug?: string;
  url: string;
  time: number;
};
type HistoryInput = {
  series?: string;
  title?: string;
  chapter?: string;
  cover?: string;
  seriesCover?: string;
  slug?: string;
  url?: string;
};
type LegacyModalWindow = {
  firebase?: CompatSdk;
  currentUser?: CompatUser | null;
  currentChatUid?: string | null;
  closeAuthDropdown?: () => void;
  showHistory?: () => void;
  closeHistory?: () => void;
  saveReadingHistory?: (data: HistoryInput) => void;
  getReadingHistory?: () => HistoryEntry[];
  deleteHistoryItem?: (url: string) => void;
  clearReadingHistory?: () => void;
  showUserProfile?: (uid: string) => Promise<void>;
  closeProfileModal?: () => void;
  loadDmInbox?: () => Promise<void>;
  openChat?: (uid: string) => Promise<void>;
  openDmToUser?: (uid: string, name?: string, avatar?: string) => void;
  loadUserNotifications?: () => void;
  closeReplyNotifications?: () => void;
};

const HISTORY_KEY = "readingHistory";
const HISTORY_LIMIT = 50;
const RAW_COVER_BASE =
  "https://raw.githubusercontent.com/moemaomao/mymangadata/main/";
const DEFAULT_AVATAR =
  "https://ui-avatars.com/api/?name=User&background=7c3aed&color=fff";
const FALLBACK_COVER = "/assets/icons/favicon.ico";
const BADGE_LABEL_DATA = `milf|Milf Lover
horny|Team Horny
night-owl|Night Owl
chaos-entity|Chaos Entity
yandere-energy|Yandere Energy
cultured|Cultured
npc|NPC
lore-master|Lore Master
touch-grass|Touch Grass
gremlin|Gremlin
certified-degenerate|Certified Degenerate
waifu-collector|Waifu Collector
manga-addict|Manga Addict
sleep-deprived|Sleep Deprived
horny-jail-escapee|Horny Jail Escapee
elite-reader|Elite Reader
keyboard-warrior|Keyboard Warrior
dungeon-master|Dungeon Master
gacha-victim|Gacha Victim
onee-san-hunter|Onee-san Hunter
tsundere|Tsundere
baka-squad|Baka Squad
void-walker|Void Walker
brain-not-found|404 Brain Not Found
professional-lurker|Professional Lurker
cosmic-simp|Cosmic Simp
schizo-poster|Schizo Poster
doomer|Doomer
coomer|Coomer
terminally-online|Terminally Online
egirl-hunter|E-girl Hunter
chuuni|Chuuni
neet-lord|NEET Lord
incognito-degen|Incognito Degenerate
rage-baiter|Rage Baiter
shipper-supreme|Shipper Supreme
lurker-god|Lurker God
menhera|Menhera
power-bottom|Power Bottom
salaryman-slave|Salaryman Slave
isekai-protagonist|Isekai Protagonist
trash-taste|Trash Taste Enjoyer
paradox-simp|Paradoxical Simp
fourchan-refugee|4chan Refugee
cope-enjoyer|Cope Enjoyer
seethe-lord|Seethe Lord
ratio-touch-grass|Ratio + Touch Grass
based-department|Based Department
cringe-overlord|Cringe Overlord
malding-champion|Malding Champion
hikikomori-emperor|Hikikomori Emperor
yabai-energy|Yabai Energy
sugoi-desu|Sugoi Desu
ara-ara-enjoyer|Ara Ara Enjoyer
onii-chan-protector|Onii-chan Protector
imouto-collector|Imouto Collector
genshin-addict|Genshin Addict
fomo-victim|FOMO Victim
doom-scroller|Doom Scroller
reply-guy|Reply Guy
main-character-syndrome|Main Character Syndrome
final-boss-of-simping|Final Boss of Simping
weeb-supreme|Weeb Supreme
otaku-overlord|Otaku Overlord
waifu-defender|Waifu Defender
two-d-only|2D Only
isekai-veteran|Isekai Veteran
senpai-noticer|Senpai Noticer
ara-ara-collector|Ara Ara Collector
light-novel-degen|Light Novel Degenerate
chuuni-lord|Chuuni Lord
trap-connoisseur|Trap Connoisseur
yuri-enjoyer|Yuri Enjoyer
kawaii-overlord|Kawaii Overlord
hololive-simp|Hololive Simp
visual-novel-addict|Visual Novel Addict
mecha-pilot|Mecha Pilot
figurine-hoarder|Figurine Hoarder
anime-onahole|Anime Onahole
raid-boss|Raid Boss
anime-speedrunner|Anime Speedrunner
isekai-truck-victim|Truck-kun Victim
vtuber-rabbit-hole|VTuber Rabbit Hole
wifi-warrior|WiFi Warrior
ranked-demon|Ranked Demon
afk-legend|AFK Legend
loot-goblin|Loot Goblin
fps-sweat|FPS Sweat
combo-dropper|Combo Dropper
maid-cafe-regular|Maid Cafe Regular
goblin-mode|Goblin Mode
anime-marathoner|Anime Marathoner
patch-note-reader|Patch Note Reader
boss-music-enjoyer|Boss Music Enjoyer
daily-quest-slave|Daily Quest Slave
ping-999|Ping 999
anime-ending-destroyed-me|Ending Destroyed Me
waifu-meta-abuser|Waifu Meta Abuser
controller-thrower|Controller Thrower
opening-skipper|Opening Skipper
ending-enjoyer|Ending Enjoyer
gacha-god|Gacha God
skill-issue|Skill Issue
anime-ost-addict|OST Addict
last-online-3am|Last Online 3AM
npc-dialogue-skipper|Dialogue Skipper
cutscene-enjoyer|Cutscene Enjoyer
voice-actor-enjoyer|Seiyuu Enjoyer
achaaan|Nyaa~
white-hair-enjoyer|White Hair Enjoyer
silver-hair-simp|Silver Hair Simp
twin-tail-lover|Twintail Lover
kuudere-enjoyer|Kuudere Enjoyer
gyaru-enjoyer|Gyaru Enjoyer
glasses-supremacy|Glasses Supremacy
short-hair-propaganda|Short Hair Propaganda
long-hair-cult|Long Hair Cult
catgirl-enjoyer|Catgirl Enjoyer
fox-girl-follower|Fox Girl Follower
maid-enjoyer|Maid Enjoyer
goth-girl-enjoyer|Goth Girl Enjoyer
muscle-waifu-appreciator|Muscle Waifu Appreciator
hoodie-waifu-enjoyer|Hoodie Waifu Enjoyer
fang-lover|Fang Lover
thigh-high-supremacy|Thigh High Supremacy
office-lady-enjoyer|Office Lady Enjoyer
dark-elf-believer|Dark Elf Believer
school-uniform-lover|Uniform Aesthetic
red-eyes-enjoyer|Red Eyes Enjoyer
flat-is-justice|Flat Is Justice
medium-is-premium|Medium Is Premium
oppai-enjoyer|Oppai Enjoyer
boing-boing-energy|Boing Boing Energy
petite-supremacy|Petite Supremacy
balanced-build|Balanced Build
anime-physics-believer|Anime Physics
isekai-enjoyer|Isekai Enjoyer
romcom-addict|RomCom Addict
slice-of-life-soul|Slice of Life Soul
psychological-damage|Psychological Damage
mecha-enjoyer|Mecha Enjoyer
dark-fantasy-cult|Dark Fantasy Cult
shounen-bloodline|Shounen Bloodline
seinen-enjoyer|Seinen Enjoyer
yuri-propaganda|Yuri Propaganda
horror-route|Horror Route
fantasy-guild-member|Fantasy Guild
cyberpunk-mindset|Cyberpunk Mindset
school-festival-arc|School Festival Arc
sports-anime-energy|Sports Anime Energy
idol-hell|Idol Hell
visual-novel-route|Visual Novel Route
gacha-lore-reader|Gacha Lore Reader
post-apocalyptic-vibes|Post-Apocalyptic
cute-girls-doing-things|CGDCT Enjoyer
villainess-route|Villainess Route
drama-victim|Drama Victim
emotional-damage|Emotional Damage
toxic-romance-reader|Toxic Romance
pain-arc-enjoyer|Pain Arc Enjoyer
betrayal-route|Betrayal Route
red-flag-collector|Red Flag Collector
copium-inhaler|Copium Inhaler
suffering-build|Suffering Build
ntr-enjoyer|NTR Enjoyer`;
const BADGE_LABELS = new Map(
  BADGE_LABEL_DATA.split("\n").map((row) => {
    const [id, label] = row.split("|");
    return [id, label] as const;
  }),
);
const GAME_ROLE_DATA = `genshin|Genshin Impact|🌟|#a78bfa
honkai-star-rail|Honkai: Star Rail|🚂|#c084fc
zenless-zone-zero|Zenless Zone Zero|🦾|#22d3ee
azur-lane|Azur Lane|⚓|#60a5fa
blue-archive|Blue Archive|📖|#f472b6
nikke|Goddess of Victory: Nikke|🔫|#f59e0b
arknights|Arknights|🛡️|#64748b
punishing-gray-raven|Punishing: Gray Raven|⚔️|#ef4444
wuthering-waves|Wuthering Waves|🌊|#4ade80
tower-of-fantasy|Tower of Fantasy|🌌|#8b5cf6
mobile-legends|Mobile Legends|🛡️|#3b82f6
league-of-legends|League of Legends|⚔️|#f59e0b
wild-rift|League of Legends: Wild Rift|💎|#06b6d4
dota-2|Dota 2|🔥|#ef4444
valorant|Valorant|🎯|#f43f5e
counter-strike-2|Counter-Strike 2|💣|#f97316
call-of-duty|Call of Duty|🔫|#eab308
warzone|Warzone|☠️|#84cc16
apex-legends|Apex Legends|🏹|#ef4444
overwatch-2|Overwatch 2|🦸|#fb923c
rainbow-six-siege|Rainbow Six Siege|🚔|#64748b
pubg|PUBG|🍗|#f59e0b
free-fire|Free Fire|🔥|#f97316
fortnite|Fortnite|🏗️|#22c55e
minecraft|Minecraft|⛏️|#22c55e
terraria|Terraria|🌳|#84cc16
roblox|Roblox|🧱|#ef4444
palworld|Palworld|🐾|#06b6d4
elden-ring|Elden Ring|👑|#eab308
dark-souls|Dark Souls|🔥|#dc2626
monster-hunter|Monster Hunter|🐉|#16a34a
final-fantasy-xiv|Final Fantasy XIV|✨|#8b5cf6
skyrim|Skyrim|🐲|#94a3b8
the-witcher-3|The Witcher 3|🐺|#ef4444
world-of-warcraft|World of Warcraft|🌍|#f59e0b
black-desert|Black Desert Online|🏜️|#64748b
runescape|RuneScape|⚒️|#ca8a04
forza-horizon-5|Forza Horizon 5|🏎️|#f97316
gran-turismo-7|Gran Turismo 7|🚗|#3b82f6
need-for-speed|Need for Speed|🚓|#ef4444
ea-fc-26|EA Sports FC|⚽|#22c55e
nba-2k|NBA 2K|🏀|#f97316
resident-evil|Resident Evil|🧟|#dc2626
dead-by-daylight|Dead by Daylight|🪝|#9333ea
silent-hill|Silent Hill|🌫️|#64748b
pokemon|Pokémon|⚡|#eab308
zelda|The Legend of Zelda|🗡️|#22c55e
mario|Super Mario|🍄|#ef4444
tekken-8|Tekken 8|🥊|#ef4444
street-fighter-6|Street Fighter 6|👊|#f97316
mortal-kombat-1|Mortal Kombat 1|🐉|#dc2626
hollow-knight|Hollow Knight|🪲|#94a3b8
stardew-valley|Stardew Valley|🌾|#22c55e
among-us|Among Us|🚀|#f43f5e`;
const GAME_ROLES = new Map(
  GAME_ROLE_DATA.split("\n").map((row) => {
    const [id, name, icon, color] = row.split("|");
    return [id, { name, icon, color }] as const;
  }),
);

const modalStyles = `
#historyModal,#user-profile-modal,#dm-modal,#reply-notif-overlay{display:none;position:fixed;inset:0;z-index:999999;align-items:center;justify-content:center;padding:16px;box-sizing:border-box}
#historyModal{background:rgba(0,0,0,.55)}
#historyBox{width:100%;max-width:500px;max-height:80vh;overflow:auto;background:#fff;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.3)}
body.dark #historyBox{background:#1d1d1d;color:#fff}
.history-header{padding:15px 20px;font-size:20px;font-weight:bold;border-bottom:1px solid #ddd;display:flex;justify-content:space-between;align-items:center}
body.dark .history-header{border-color:#333}
.history-item{display:flex;gap:12px;padding:12px 20px;cursor:pointer;border-bottom:1px solid #eee;position:relative}
body.dark .history-item{border-color:#333}.history-item:hover{background:#f5f5f5}body.dark .history-item:hover{background:#2a2a2a}
.history-cover{width:60px;height:80px;border-radius:8px;object-fit:cover}.history-content{flex:1;min-width:0}.history-title{font-weight:bold}.history-chapter{margin-top:4px;font-size:14px;color:#666}body.dark .history-chapter{color:#aaa}.history-time{margin-top:6px;font-size:12px;color:#999}
.delete-btn{position:absolute;right:15px;top:50%;transform:translateY(-50%);background:none;border:0;font-size:18px;color:#ff4444;cursor:pointer;opacity:0;transition:opacity .2s}.history-item:hover .delete-btn{opacity:1}
.history-footer{padding:15px 20px;display:flex;justify-content:flex-end;border-top:1px solid #ddd}body.dark .history-footer{border-color:#333}
.history-btn,.close-btn{padding:10px 18px;border:0;border-radius:8px;cursor:pointer}.close-btn{padding:0;width:32px;height:32px;font-size:24px;background:none;color:#666}
#user-profile-modal{background:rgba(0,0,0,.9);z-index:99999}
.profile-box{background:#1f1f2e;width:100%;max-width:380px;border-radius:14px;padding:18px;position:relative;color:white;box-sizing:border-box}
.profile-close{position:absolute;top:10px;right:14px;background:none;border:0;font-size:24px;color:#aaa;cursor:pointer}
.profile-top{display:flex;align-items:flex-start;gap:14px;margin-bottom:16px}.profile-avatar{width:80px;height:80px;border-radius:15px;border:3px solid #7c3aed;object-fit:cover}
.profile-dm{width:100%;height:34px;background:transparent;color:#22c55e;border:1px solid #22c55e;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;margin-bottom:12px}
.profile-stats{background:#28283a;border-radius:12px;padding:14px;margin-bottom:14px;display:grid;grid-template-columns:1fr 1fr;gap:12px;text-align:center}.profile-stat-label{color:#aaa;font-size:.75rem}.profile-badge-title{display:flex;align-items:center;gap:10px;margin:12px 0;color:#ddd;font-size:13px;font-weight:700}.profile-badge-title:after{content:"";flex:1;height:1px;background:rgba(255,255,255,.15)}
.user-custom-badge,.game-role{display:inline-flex;padding:4px 9px;border-radius:8px;background:linear-gradient(45deg,#7c3aed,#ec4899);color:white;font-size:.78rem;font-weight:600;margin:2px}
#dm-modal{z-index:30000;background:rgba(0,0,0,.45);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
.dm-wrapper{width:100%;max-width:720px;height:78vh;display:flex;flex-direction:column;overflow:hidden;border-radius:22px;background:rgba(2,7,2,.92);border:1px solid rgba(77,255,101,.18);box-shadow:0 20px 60px rgba(0,0,0,.5)}
.dm-header{display:flex;align-items:center;justify-content:space-between;min-height:64px;padding:0 24px;background:rgba(133,255,77,.04);border-bottom:1px solid rgba(255,255,255,.06)}
.dm-header h2{margin:0;color:#b0ff8c;font-size:1.25rem}.dm-header-btn{width:42px;height:42px;border:0;border-radius:12px;background:rgba(255,255,255,.06);color:white;font-size:20px;cursor:pointer}
.dm-body{flex:1;display:flex;overflow:hidden}#dm-inbox{width:240px;min-width:240px;overflow-y:auto;border-right:1px solid rgba(255,255,255,.06)}
.dm-user-item{padding:12px 14px;display:flex;align-items:center;gap:12px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,.04);color:white}.dm-user-item:hover{background:rgba(255,255,255,.05)}
.dm-user-avatar{width:42px;height:42px;border-radius:50%;object-fit:cover;border:1px solid rgba(255,255,255,.1)}.dm-user-info{flex:1;min-width:0}.dm-user-name,.dm-user-lastmsg{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dm-user-name{font-size:14px;font-weight:600}.dm-user-lastmsg{font-size:12px;color:#a1a1a1;margin-top:2px}.dm-user-time{font-size:11px;color:#777}
#dm-chat-area{flex:1;display:none;flex-direction:column;min-width:0;color:white}.dm-chat-header{display:flex;align-items:center;gap:14px;min-height:64px;padding:0 20px;border-bottom:1px solid rgba(255,255,255,.06)}
#dm-chat-avatar{width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid rgba(77,255,77,.5)}#dm-chat-name{font-weight:700}#dm-chat-status{color:#fbbf24;font-size:.85rem}
#dm-chat-messages{flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:12px}.dm-message{max-width:75%;padding:11px 16px;border-radius:18px;word-break:break-word;line-height:1.4;background:#334155}.dm-message.me{align-self:flex-end;background:#2563eb}.dm-message.other{align-self:flex-start}.dm-message-time{font-size:.72rem;opacity:.7;margin-top:4px;text-align:right;display:block}
.dm-input{padding:16px 18px;border-top:1px solid rgba(255,255,255,.06)}.dm-input-wrap{display:flex;align-items:flex-end;gap:12px}#dm-text{flex:1;min-height:48px;max-height:120px;padding:12px 16px;border:0;border-radius:16px;background:rgba(255,255,255,.08);color:white;resize:vertical;font:inherit}.dm-send-btn{width:48px;height:48px;border:0;border-radius:14px;background:linear-gradient(135deg,#62ff4d,#4adc26);color:white;font-size:18px;cursor:pointer}
.dm-empty{height:100%;display:flex;align-items:center;justify-content:center;color:#777;text-align:center;padding:30px;box-sizing:border-box}.dm-chat-header[hidden]{display:none!important}
#reply-notif-overlay{z-index:99999;background:rgba(0,20,40,.45)}.notif-box{background:rgba(30,41,59,.97);border:1px solid rgba(96,165,250,.25);color:#e2e8f0;padding:20px;border-radius:16px;max-width:420px;width:92%;max-height:80vh;overflow-y:auto;position:relative}
.notif-close{position:absolute;top:12px;right:16px;background:none;border:0;color:#93c5fd;font-size:22px;cursor:pointer}.notif-item{padding:14px 16px;margin-bottom:12px;border:1px solid rgba(94,145,255,.4);border-radius:14px;background:rgba(75,102,255,.12)}
@media(max-width:768px){#dm-modal{padding:8px}.dm-wrapper{height:94vh;max-height:94vh;border-radius:18px}.dm-header{position:relative;z-index:20;padding:0 12px}.dm-header h2{flex:1;text-align:center;margin:0 10px}.dm-body{position:relative;min-height:0}#dm-inbox{width:100%;min-width:100%;height:100%}#dm-chat-area{position:absolute;inset:0;z-index:5;background:rgba(2,7,2,.97)}.dm-chat-header{min-height:64px;padding:0 14px}.dm-chat-header[hidden]{display:none!important}#dm-chat-messages{padding:16px 12px}.dm-input{padding:12px}.dm-input-wrap{gap:8px}#dm-text{min-height:46px}.dm-send-btn{width:46px;height:46px}}
@media(max-width:480px){.dm-wrapper{height:96vh;max-height:96vh;border-radius:16px}.dm-header{min-height:58px;padding:0 8px}.dm-header h2{font-size:1rem}.dm-chat-header{min-height:58px}#dm-chat-avatar{width:38px;height:38px}#dm-chat-messages{padding:12px 10px}.dm-message{max-width:85%}}
`;

function asRecord(value: unknown): DataRecord {
  return value && typeof value === "object" ? (value as DataRecord) : {};
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function formatTimestamp(value: unknown, style: "date" | "time" = "date"): string {
  if (!value) return "";
  let date: Date;
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const toDate = (value as CompatTimestamp).toDate;
    if (typeof toDate !== "function") return "";
    date = toDate();
  } else if (typeof value === "number" || typeof value === "string") {
    date = new Date(value);
  } else {
    return "";
  }
  if (Number.isNaN(date.getTime())) return "";
  return style === "time"
    ? date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("id-ID", { month: "short", day: "numeric" });
}

function readHistory(): HistoryEntry[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(value)
      ? value.filter(
          (item): item is HistoryEntry =>
            Boolean(item) &&
            typeof item === "object" &&
            typeof (item as HistoryEntry).url === "string",
        )
      : [];
  } catch {
    return [];
  }
}

function resolveCover(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.trim() === "-") return "";
  const cover = value.replace(/\.$/, "").trim();
  return /^https?:\/\//i.test(cover) ? cover : RAW_COVER_BASE + cover.replace(/^\//, "");
}

function thumbUrl(value: unknown): string {
  const full = resolveCover(value);
  if (!full || full === FALLBACK_COVER) return FALLBACK_COVER;
  if (full.includes("images.weserv.nl")) return full;
  return `https://images.weserv.nl/?url=${encodeURIComponent(full)}&w=120&q=80&output=webp`;
}

function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function initializeUserModals(): () => void {
  const legacy = window as unknown as LegacyModalWindow;
  const previousApi = {
    showHistory: legacy.showHistory,
    closeHistory: legacy.closeHistory,
    saveReadingHistory: legacy.saveReadingHistory,
    getReadingHistory: legacy.getReadingHistory,
    deleteHistoryItem: legacy.deleteHistoryItem,
    clearReadingHistory: legacy.clearReadingHistory,
    showUserProfile: legacy.showUserProfile,
    closeProfileModal: legacy.closeProfileModal,
    loadDmInbox: legacy.loadDmInbox,
    openChat: legacy.openChat,
    openDmToUser: legacy.openDmToUser,
    loadUserNotifications: legacy.loadUserNotifications,
    closeReplyNotifications: legacy.closeReplyNotifications,
  };
  const style = document.createElement("style");
  style.dataset.userModals = "true";
  style.textContent = modalStyles;
  document.head.appendChild(style);

  const historyModal = createElement("div");
  historyModal.id = "historyModal";
  historyModal.innerHTML = `<div id="historyBox"><div class="history-header"><span>📖 Reading History</span><button type="button" class="close-btn" data-close-history aria-label="Close">✕</button></div><div id="historyList"></div><div class="history-footer"><button type="button" class="history-btn" data-clear-history>🗑 Hapus Semua</button></div></div>`;

  const profileModal = createElement("div");
  profileModal.id = "user-profile-modal";
  profileModal.innerHTML = `<section class="profile-box"><button type="button" class="profile-close" data-close-profile aria-label="Close">×</button><div class="profile-top"><div><img class="profile-avatar" data-profile="avatar" src="${DEFAULT_AVATAR}" alt="User avatar"><div style="margin-top:8px;font-size:.78em;color:#aaa"><div style="color:#777">Joined</div><div data-profile="joined" style="color:#60a5fa;font-weight:600">—</div></div></div><div style="flex:1;min-width:0"><h2 data-profile="displayName" style="margin:0;font-size:1.15rem;line-height:1.3;word-break:break-word">Loading...</h2><p data-profile="username" style="margin:4px 0;color:#aaa;font-size:.85rem"></p><p data-profile="bio" style="margin:6px 0 0;color:#ccc;font-size:.85rem;line-height:1.4;word-break:break-word"></p></div></div><button type="button" class="profile-dm" data-profile-dm>Message</button><div class="profile-stats"><div><div class="profile-stat-label">Level</div><div data-profile="level"></div></div><div><div class="profile-stat-label">Points</div><div data-profile="points"></div></div><div><div class="profile-stat-label">Comments</div><div data-profile="comments"></div></div><div><div class="profile-stat-label">Reputation</div><div data-profile="reputation"></div></div></div><div class="profile-badge-title">Badge Collection</div><div data-profile="badges" style="text-align:center;min-height:32px"></div><div data-profile="roles"></div></section>`;

  const dmModal = createElement("div");
  dmModal.id = "dm-modal";
  dmModal.innerHTML = `<div class="dm-wrapper"><div class="dm-header"><button type="button" id="dm-back-btn" class="dm-header-btn" style="display:none" aria-label="Back">←</button><h2>Direct Messages</h2><button type="button" id="dm-close-btn" class="dm-header-btn" aria-label="Close">✕</button></div><div class="dm-body"><div id="dm-inbox"></div><div id="dm-chat-area"><div class="dm-chat-header" id="dm-chat-header" hidden><img id="dm-chat-avatar" src="${DEFAULT_AVATAR}" alt="avatar"><div><div id="dm-chat-name">User</div><div id="dm-chat-status">@username</div></div></div><div id="dm-chat-messages"><div class="dm-empty">Select a conversation to start chatting</div></div><div class="dm-input"><div class="dm-input-wrap"><textarea id="dm-text" placeholder="Select a conversation first" disabled></textarea><button type="button" id="dm-send-btn" class="dm-send-btn" disabled aria-label="Send">➤</button></div></div></div></div></div>`;

  const notificationModal = createElement("div");
  notificationModal.id = "reply-notif-overlay";
  notificationModal.innerHTML = `<section class="notif-box"><button type="button" class="notif-close" data-close-notifications aria-label="Close">×</button><h3 style="margin:0 0 16px;text-align:center;color:#93c5fd">Notifications</h3><div id="reply-notif-list"></div></section>`;
  document.body.append(historyModal, profileModal, dmModal, notificationModal);

  const db = (): CompatFirestore | null => {
    const sdk = legacy.firebase;
    if (typeof sdk?.firestore !== "function") return null;
    try {
      return sdk.firestore();
    } catch (error) {
      console.warn("Firestore belum tersedia", error);
      return null;
    }
  };
  const byId = <T extends HTMLElement>(id: string): T | null =>
    document.getElementById(id) as T | null;
  const profileField = (name: string): HTMLElement | null =>
    profileModal.querySelector<HTMLElement>(`[data-profile="${name}"]`);
  const setText = (element: HTMLElement | null, value: string) => {
    if (element) element.textContent = value;
  };
  const displayHistory = () => {
    legacy.closeAuthDropdown?.();
    const list = byId<HTMLDivElement>("historyList");
    if (!list) return;
    list.replaceChildren();
    const history = readHistory();
    if (!history.length) {
      const empty = createElement("div", undefined, "Belum ada history.");
      empty.style.cssText = "padding:40px;text-align:center;color:#888";
      list.appendChild(empty);
    } else {
      history.forEach((item) => {
        const row = createElement("div", "history-item");
        row.dataset.historyUrl = item.url;
        const image = createElement("img", "history-cover");
        image.src = thumbUrl(item.cover);
        image.loading = "lazy";
        image.alt = item.series || item.title || "Cover";
        image.onerror = () => {
          image.src = FALLBACK_COVER;
        };
        const content = createElement("div", "history-content");
        const title = createElement("div", "history-title", item.series || item.title || "Unknown");
        const chapter = createElement("div", "history-chapter", item.chapter || "");
        const time = createElement("div", "history-time");
        const elapsed = Math.max(0, Date.now() - numberValue(item.time));
        const minutes = 60_000;
        const hours = 60 * minutes;
        const days = 24 * hours;
        time.textContent =
          elapsed < minutes
            ? "Baru saja"
            : elapsed < hours
              ? `${Math.floor(elapsed / minutes)} menit lalu`
              : elapsed < days
                ? `${Math.floor(elapsed / hours)} jam lalu`
                : `${Math.floor(elapsed / days)} hari lalu`;
        content.append(title, chapter, time);
        const remove = createElement("button", "delete-btn", "🗑");
        remove.type = "button";
        remove.dataset.deleteHistory = item.url;
        remove.setAttribute("aria-label", "Hapus dari history");
        row.append(image, content, remove);
        list.appendChild(row);
      });
    }
    historyModal.style.display = "flex";
  };
  const closeHistory = () => {
    historyModal.style.display = "none";
  };
  const saveHistory = (data: HistoryInput) => {
    if (!data || typeof data.url !== "string" || !data.url) return;
    let cover = "";
    if (typeof data.seriesCover === "string") cover = resolveCover(data.seriesCover);
    if (!cover) {
      try {
        const current: unknown = JSON.parse(window.localStorage.getItem("currentManga") || "null");
        const currentData = asRecord(current);
        cover = resolveCover(currentData.cover || currentData.img || currentData.image);
      } catch {
        cover = "";
      }
    }
    cover ||= resolveCover(data.cover) || data.cover || FALLBACK_COVER;
    const updated: HistoryEntry[] = [
      {
        series: data.series || data.title || "",
        title: data.title || "Unknown",
        chapter: data.chapter || "",
        cover,
        slug: data.slug || "",
        url: data.url,
        time: Date.now(),
      },
      ...readHistory().filter((entry) => entry.url !== data.url),
    ].slice(0, HISTORY_LIMIT);
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    } catch (error) {
      console.warn("Gagal menyimpan reading history", error);
    }
  };
  const deleteHistory = (url: string) => {
    if (!window.confirm("Hapus item ini dari history?")) return;
    try {
      window.localStorage.setItem(
        HISTORY_KEY,
        JSON.stringify(readHistory().filter((item) => item.url !== url)),
      );
    } catch (error) {
      console.warn("Gagal memperbarui reading history", error);
    }
    displayHistory();
  };
  const clearHistory = () => {
    if (!window.confirm("Hapus seluruh history?")) return;
    try {
      window.localStorage.removeItem(HISTORY_KEY);
    } catch (error) {
      console.warn("Gagal menghapus reading history", error);
    }
    displayHistory();
  };

  let profileDmTarget: { uid: string; name: string; avatar: string } | null = null;
  const showProfile = async (uid: string): Promise<void> => {
    if (!uid) return;
    const firestore = db();
    if (!firestore) {
      window.alert("Firestore belum dimuat");
      return;
    }
    profileModal.style.display = "flex";
    profileDmTarget = { uid, name: "Anonymous", avatar: DEFAULT_AVATAR };
    setText(profileField("displayName"), "Loading...");
    setText(profileField("username"), "");
    setText(profileField("bio"), "");
    setText(profileField("joined"), "—");
    const badgeContainer = profileField("badges");
    const rolesContainer = profileField("roles");
    badgeContainer?.replaceChildren();
    rolesContainer?.replaceChildren();
    const avatar = profileField("avatar") as HTMLImageElement | null;
    if (avatar) avatar.src = DEFAULT_AVATAR;
    try {
      const snapshot = await firestore.collection("userStats").doc(uid).get();
      const data = snapshot.exists ? asRecord(snapshot.data()) : {};
      const displayName = stringValue(data.displayName, "Anonymous");
      const avatarUrl = stringValue(data.avatar, DEFAULT_AVATAR) || DEFAULT_AVATAR;
      profileDmTarget = { uid, name: displayName, avatar: avatarUrl };
      if (avatar) avatar.src = avatarUrl;
      setText(profileField("displayName"), displayName);
      setText(profileField("username"), data.username ? `@${String(data.username)}` : "");
      setText(profileField("bio"), stringValue(data.bio, "Belum ada bio."));
      const joinedAt = data.joinedAt || data.createdAt;
      let joined = "";
      if (joinedAt) {
        const date =
          typeof joinedAt === "object" && joinedAt !== null && "toDate" in joinedAt
            ? (joinedAt as CompatTimestamp).toDate?.()
            : new Date(joinedAt as string | number);
        if (date && !Number.isNaN(date.getTime())) {
          joined = date.toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          });
        }
      }
      if (!joined && legacy.currentUser?.uid === uid && legacy.currentUser.metadata?.creationTime) {
        joined = new Date(legacy.currentUser.metadata.creationTime).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
      }
      setText(profileField("joined"), joined || "—");
      const comments = numberValue(data.commentCount);
      const points = numberValue(data.points);
      const reputation = numberValue(data.reputation);
      setText(profileField("level"), `Lv. ${Math.floor(comments / 10) + 1}`);
      setText(profileField("points"), `${points.toLocaleString()} pts`);
      setText(profileField("comments"), comments.toLocaleString());
      const reputationElement = profileField("reputation");
      setText(
        reputationElement,
        reputation >= 0 ? `+${reputation.toLocaleString()}` : reputation.toLocaleString(),
      );
      if (reputationElement) {
        reputationElement.style.color = reputation > 0 ? "#4ade80" : reputation < 0 ? "#ef4444" : "#aaa";
      }
      const customBadge = stringValue(data.customBadge);
      const badgeLabel = BADGE_LABELS.get(customBadge);
      if (badgeContainer && customBadge && badgeLabel) {
        const badge = createElement("span", `user-custom-badge ${customBadge}`, badgeLabel);
        badgeContainer.appendChild(badge);
      }
      if (rolesContainer && Array.isArray(data.gameRoles) && data.gameRoles.length) {
        const title = createElement("div", "profile-badge-title", "Game Roles");
        rolesContainer.appendChild(title);
        data.gameRoles.forEach((roleId) => {
          if (typeof roleId !== "string") return;
          const roleInfo = GAME_ROLES.get(roleId);
          if (!roleInfo) return;
          const role = createElement("span", "game-role", `${roleInfo.icon} ${roleInfo.name}`);
          role.style.color = roleInfo.color;
          rolesContainer.appendChild(role);
        });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      setText(profileField("joined"), "—");
    }
  };
  const closeProfile = () => {
    profileModal.style.display = "none";
  };

  const inbox = byId<HTMLDivElement>("dm-inbox");
  const messageArea = byId<HTMLDivElement>("dm-chat-messages");
  const messageInput = byId<HTMLTextAreaElement>("dm-text");
  const sendButton = byId<HTMLButtonElement>("dm-send-btn");
  const chatArea = byId<HTMLDivElement>("dm-chat-area");
  const chatHeader = byId<HTMLDivElement>("dm-chat-header");
  const resetChat = () => {
    if (chatHeader) chatHeader.hidden = true;
    messageArea?.replaceChildren(createElement("div", "dm-empty", "Select a conversation to start chatting"));
    if (messageInput) {
      messageInput.disabled = true;
      messageInput.placeholder = "Select a conversation first";
    }
    if (sendButton) sendButton.disabled = true;
  };
  const loadInbox = async (): Promise<void> => {
    dmModal.style.display = "flex";
    if (!inbox) return;
    resetChat();
    const user = legacy.currentUser;
    if (!user) {
      inbox.replaceChildren(createElement("div", "dm-empty", "Login dulu untuk melihat DM"));
      return;
    }
    inbox.replaceChildren(createElement("div", "dm-empty", "Loading..."));
    const firestore = db();
    if (!firestore) {
      inbox.replaceChildren(createElement("div", "dm-empty", "Firestore belum dimuat"));
      return;
    }
    try {
      const result = await firestore
        .collection("directMessages")
        .where("participants", "array-contains", user.uid)
        .orderBy("timestamp", "desc")
        .limit(50)
        .get();
      const chats = new Map<string, { name: string; avatar: string; last: string; time: string }>();
      result.docs.forEach((doc) => {
        const data = asRecord(doc.data());
        const from = stringValue(data.from);
        const otherUid = from === user.uid ? stringValue(data.to) : from;
        if (!otherUid || chats.has(otherUid)) return;
        const isFromUser = from === user.uid;
        const text = stringValue(data.text);
        chats.set(otherUid, {
          name: stringValue(isFromUser ? data.toName : data.fromName, "User"),
          avatar: stringValue(isFromUser ? data.toAvatar : data.fromAvatar, DEFAULT_AVATAR),
          last: text.slice(0, 45) + (text.length > 45 ? "..." : ""),
          time: formatTimestamp(data.timestamp),
        });
      });
      inbox.replaceChildren();
      if (!chats.size) {
        inbox.appendChild(createElement("div", "dm-empty", "Belum ada percakapan"));
        return;
      }
      chats.forEach((chat, uid) => {
        const row = createElement("div", "dm-user-item");
        row.dataset.chatUid = uid;
        const image = createElement("img", "dm-user-avatar");
        image.src = chat.avatar || DEFAULT_AVATAR;
        image.alt = "";
        image.onerror = () => {
          image.src = DEFAULT_AVATAR;
        };
        const info = createElement("div", "dm-user-info");
        info.append(
          createElement("div", "dm-user-name", chat.name),
          createElement("div", "dm-user-lastmsg", chat.last || "—"),
        );
        row.append(image, info, createElement("small", "dm-user-time", chat.time));
        inbox.appendChild(row);
      });
    } catch (error) {
      console.error("DM Inbox error:", error);
      inbox.replaceChildren(createElement("div", "dm-empty", "Gagal memuat inbox"));
    }
  };
  const openChat = async (uid: string): Promise<void> => {
    const user = legacy.currentUser;
    if (!uid || !user || !inbox || !chatArea || !messageInput || !sendButton) return;
    legacy.currentChatUid = uid;
    const mobile = window.innerWidth <= 768;
    inbox.style.display = mobile ? "none" : "block";
    if (!mobile) inbox.style.width = "240px";
    chatArea.style.display = "flex";
    chatArea.style.position = mobile ? "absolute" : "relative";
    const backButton = byId<HTMLButtonElement>("dm-back-btn");
    if (backButton) backButton.style.display = mobile ? "flex" : "none";
    if (chatHeader) chatHeader.hidden = false;
    messageInput.disabled = false;
    messageInput.placeholder = "Type a message...";
    sendButton.disabled = false;
    const firestore = db();
    let name = "User";
    let avatarUrl = DEFAULT_AVATAR;
    if (firestore) {
      try {
        const userSnapshot = await firestore.collection("userStats").doc(uid).get();
        const profile = userSnapshot.exists ? asRecord(userSnapshot.data()) : {};
        name = stringValue(profile.displayName || profile.username, "User");
        avatarUrl = stringValue(profile.avatar, DEFAULT_AVATAR);
      } catch (error) {
        console.warn("Gagal ambil data user", error);
      }
    }
    setText(byId("dm-chat-name"), name);
    setText(byId("dm-chat-status"), `@${name.toLowerCase().replace(/\s+/g, "") || "user"}`);
    const avatar = byId<HTMLImageElement>("dm-chat-avatar");
    if (avatar) {
      avatar.src = avatarUrl;
      avatar.onerror = () => {
        avatar.src = DEFAULT_AVATAR;
      };
    }
    if (!messageArea) return;
    messageArea.replaceChildren(createElement("div", "dm-empty", "Loading chat..."));
    if (!firestore) return;
    try {
      const result = await firestore
        .collection("directMessages")
        .where("participants", "array-contains", user.uid)
        .orderBy("timestamp", "asc")
        .get();
      messageArea.replaceChildren();
      let count = 0;
      result.forEach((doc) => {
        const data = asRecord(doc.data());
        const participants = Array.isArray(data.participants) ? data.participants : [];
        if (!participants.includes(uid)) return;
        count += 1;
        const message = createElement("div", `dm-message ${data.from === user.uid ? "me" : "other"}`);
        message.appendChild(
          createElement("div", undefined, data.deleted ? "Message deleted" : stringValue(data.text)),
        );
        message.appendChild(
          createElement(
            "span",
            "dm-message-time",
            `${formatTimestamp(data.timestamp, "time")}${data.edited ? " • edited" : ""}`,
          ),
        );
        messageArea.appendChild(message);
      });
      if (!count) {
        const empty = createElement("div", "dm-empty");
        empty.append("Belum ada pesan.");
        empty.appendChild(document.createElement("br"));
        const hint = createElement("small", undefined, "Ketik di bawah untuk memulai");
        empty.appendChild(hint);
        messageArea.appendChild(empty);
      }
      messageArea.scrollTop = messageArea.scrollHeight;
    } catch (error) {
      console.error(error);
      messageArea.replaceChildren(createElement("div", "dm-empty", "Gagal memuat chat"));
    }
  };
  const sendMessage = async (): Promise<void> => {
    const uid = legacy.currentChatUid;
    const user = legacy.currentUser;
    const text = messageInput?.value.trim() || "";
    if (!uid || !user || !text) return;
    const firestore = db();
    const serverTimestamp = legacy.firebase?.firestore?.FieldValue?.serverTimestamp;
    if (!firestore || typeof serverTimestamp !== "function") {
      window.alert("Firestore belum dimuat");
      return;
    }
    try {
      let toName = "User";
      let toAvatar = DEFAULT_AVATAR;
      try {
        const recipient = await firestore.collection("userStats").doc(uid).get();
        const data = recipient.exists ? asRecord(recipient.data()) : {};
        toName = stringValue(data.displayName || data.username, "User");
        toAvatar = stringValue(data.avatar, DEFAULT_AVATAR);
      } catch {
        // Sending remains available if the recipient profile cannot be read.
      }
      await firestore.collection("directMessages").add({
        from: user.uid,
        to: uid,
        text,
        timestamp: serverTimestamp(),
        participants: [user.uid, uid],
        read: false,
        fromName: user.displayName || "User",
        fromAvatar: user.photoURL || DEFAULT_AVATAR,
        toName,
        toAvatar,
      });
      if (messageInput) messageInput.value = "";
      await openChat(uid);
    } catch (error) {
      console.error(error);
      window.alert("Gagal mengirim pesan");
    }
  };
  const closeDm = () => {
    dmModal.style.display = "none";
    legacy.currentChatUid = null;
  };
  const backToInbox = () => {
    if (inbox) inbox.style.display = "block";
    if (chatArea) chatArea.style.display = "none";
    const backButton = byId<HTMLButtonElement>("dm-back-btn");
    if (backButton) backButton.style.display = "none";
    legacy.currentChatUid = null;
    resetChat();
  };
  const openDmToUser = (uid: string, _name?: string, _avatar?: string) => {
    void loadInbox();
    window.setTimeout(() => void openChat(uid), 350);
  };

  const loadNotifications = () => {
    const user = legacy.currentUser;
    if (!user) {
      window.alert("Harap login terlebih dahulu");
      return;
    }
    notificationModal.style.display = "flex";
    const list = byId<HTMLDivElement>("reply-notif-list");
    if (!list) return;
    list.innerHTML = `<div style="text-align:center;padding:30px;color:#94a3b8">Loading notifications...</div>`;
    const firestore = db();
    if (!firestore) {
      list.innerHTML = `<div style="text-align:center;padding:40px;color:#f87171">Firestore belum dimuat</div>`;
      return;
    }
    void firestore
      .collection("notifications")
      .doc(user.uid)
      .get()
      .then((snapshot) => {
        const data = snapshot.exists ? asRecord(snapshot.data()) : {};
        const replies = Array.isArray(data.replies) ? data.replies : [];
        const mentions = Array.isArray(data.mentions) ? data.mentions : [];
        const all: Array<DataRecord & { notifType: string }> = [
          ...replies.map(
            (item): DataRecord & { notifType: string } => ({
              ...asRecord(item),
              notifType: "reply",
            }),
          ),
          ...mentions.map(
            (item): DataRecord & { notifType: string } => ({
              ...asRecord(item),
              notifType: "mention",
            }),
          ),
        ].sort((a, b) => numberValue(b.date) - numberValue(a.date));
        list.replaceChildren();
        if (!all.length) {
          const empty = createElement("div", undefined, "Tidak ada notifikasi");
          empty.style.cssText = "text-align:center;padding:40px;color:#64748b";
          list.appendChild(empty);
          return;
        }
        all.forEach((item) => {
          const isMention = item.notifType === "mention";
          const card = createElement("article", "notif-item");
          const author = createElement("div", undefined, stringValue(item.author, "Someone"));
          author.style.cssText = `font-weight:700;color:${isMention ? "#93c5fd" : "#60a5fa"};margin-bottom:4px`;
          const kind = createElement("div", undefined, isMention ? "mentioned you" : "replied to you");
          kind.style.cssText = "font-size:.9rem;margin-bottom:6px";
          const text = createElement("div", undefined, stringValue(item.text || item.message));
          text.style.cssText = "font-size:.88rem;color:#cbd5e1;line-height:1.4";
          card.append(author, kind, text);
          if (item.date) {
            const time = createElement(
              "div",
              undefined,
              new Date(numberValue(item.date)).toLocaleString("id-ID", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              }),
            );
            time.style.cssText = "font-size:.75rem;color:#94a3b8;margin-top:8px";
            card.appendChild(time);
          }
          const link = stringValue(item.commentLink || item.link);
          if (link && link !== "#") {
            const anchor = createElement("a", undefined, "Lihat komentar →");
            anchor.href = link;
            anchor.style.cssText = "display:inline-block;margin-top:10px;color:#5edaff;font-weight:600;text-decoration:none;font-size:.85rem";
            card.appendChild(anchor);
          }
          list.appendChild(card);
        });
      })
      .catch((error: unknown) => {
        console.error("Notif error:", error);
        list.replaceChildren(createElement("div", undefined, "Gagal memuat notifikasi"));
      });
  };
  const closeNotifications = () => {
    notificationModal.style.display = "none";
  };

  const onHistoryClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const deleteButton = target.closest<HTMLElement>("[data-delete-history]");
    if (deleteButton?.dataset.deleteHistory) {
      event.stopPropagation();
      deleteHistory(deleteButton.dataset.deleteHistory);
      return;
    }
    const row = target.closest<HTMLElement>("[data-history-url]");
    if (row?.dataset.historyUrl) window.location.href = row.dataset.historyUrl;
  };
  const onInboxClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const row = target.closest<HTMLElement>("[data-chat-uid]");
    if (row?.dataset.chatUid) void openChat(row.dataset.chatUid);
  };
  const onModalClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("[data-close-history]")) closeHistory();
    else if (target.closest("[data-clear-history]")) clearHistory();
    else if (target.closest("[data-close-profile]")) closeProfile();
    else if (target.closest("[data-profile-dm]")) {
      const dmTarget = profileDmTarget;
      closeProfile();
      if (dmTarget) openDmToUser(dmTarget.uid, dmTarget.name, dmTarget.avatar);
    } else if (target.closest("[data-close-notifications]")) closeNotifications();
    else if (target === historyModal) closeHistory();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey && event.target === messageInput) {
      event.preventDefault();
      void sendMessage();
    }
  };
  historyModal.addEventListener("click", onHistoryClick);
  document.addEventListener("click", onModalClick);
  inbox?.addEventListener("click", onInboxClick);
  byId("dm-close-btn")?.addEventListener("click", closeDm);
  byId("dm-back-btn")?.addEventListener("click", backToInbox);
  sendButton?.addEventListener("click", () => void sendMessage());
  messageInput?.addEventListener("keydown", onKeyDown);
  profileModal.addEventListener("click", (event) => {
    if (event.target === profileModal) closeProfile();
  });
  notificationModal.addEventListener("click", (event) => {
    if (event.target === notificationModal) closeNotifications();
  });

  Object.assign(legacy, {
    showHistory: displayHistory,
    closeHistory,
    saveReadingHistory: saveHistory,
    getReadingHistory: readHistory,
    deleteHistoryItem: deleteHistory,
    clearReadingHistory: clearHistory,
    showUserProfile: showProfile,
    closeProfileModal: closeProfile,
    loadDmInbox: loadInbox,
    openChat,
    openDmToUser,
    loadUserNotifications: loadNotifications,
    closeReplyNotifications: closeNotifications,
  });

  const restoreApi = (key: keyof typeof previousApi) => {
    const current = legacy[key];
    const installed = {
      showHistory: displayHistory,
      closeHistory,
      saveReadingHistory: saveHistory,
      getReadingHistory: readHistory,
      deleteHistoryItem: deleteHistory,
      clearReadingHistory: clearHistory,
      showUserProfile: showProfile,
      closeProfileModal: closeProfile,
      loadDmInbox: loadInbox,
      openChat,
      openDmToUser,
      loadUserNotifications: loadNotifications,
      closeReplyNotifications: closeNotifications,
    }[key];
    if (current !== installed) return;
    const previous = previousApi[key];
    if (previous) {
      Object.assign(legacy, { [key]: previous });
    } else {
      delete legacy[key];
    }
  };

  return () => {
    historyModal.removeEventListener("click", onHistoryClick);
    document.removeEventListener("click", onModalClick);
    inbox?.removeEventListener("click", onInboxClick);
    byId("dm-close-btn")?.removeEventListener("click", closeDm);
    byId("dm-back-btn")?.removeEventListener("click", backToInbox);
    messageInput?.removeEventListener("keydown", onKeyDown);
    [notificationModal, dmModal, profileModal, historyModal].forEach((element) => element.remove());
    style.remove();
    (Object.keys(previousApi) as Array<keyof typeof previousApi>).forEach(restoreApi);
  };
}

export default function UserModals() {
  useEffect(() => initializeUserModals(), []);
  return null;
}
