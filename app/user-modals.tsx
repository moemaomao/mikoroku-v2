"use client";

import { useEffect } from "react";
import {
  clearReadingHistory as clearStoredReadingHistory,
  deleteReadingHistoryEntry,
  upsertReadingHistoryEntry,
} from "../lib/reading-history";
import { normalizeProfileLink } from "./lib/profile-link";

type DataRecord = Record<string, unknown>;
type CompatTimestamp = {
  toDate?: () => Date;
  toMillis?: () => number;
  seconds?: number;
  nanoseconds?: number;
};
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
  update: (data: DataRecord) => Promise<void>;
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
type CompatAuth = {
  currentUser: CompatUser | null;
};
type CompatSdk = {
  auth?: () => CompatAuth;
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
type UserProfileCacheEntry = {
  cachedAt: number;
  data: DataRecord;
};
type HistoryEntry = {
  series?: string;
  title?: string;
  chapter?: string;
  cover?: string;
  slug?: string;
  url: string;
  time: number;
  progress?: number;
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
  showUserProfile?: (uid: string, leaderboardRank?: number, avatar?: string) => Promise<void>;
  closeProfileModal?: () => void;
  openMikorokuDmInbox?: () => Promise<void>;
  openMikorokuDmToUser?: (uid: string, name?: string, avatar?: string) => void;
  openMikorokuNotifications?: () => void;
  loadDmInbox?: () => Promise<void>;
  openChat?: (uid: string) => Promise<void>;
  openDmToUser?: (uid: string, name?: string, avatar?: string) => void;
  loadUserNotifications?: () => void;
  closeReplyNotifications?: () => void;
  userStatsCache?: Record<string, DataRecord>;
};

const HISTORY_KEY = "readingHistory";
const USER_PROFILE_CACHE_KEY = "mikoroku:user-profile-cache:v1";
const USER_PROFILE_CACHE_LIMIT = 100;
const pendingUserProfileRequests = new Map<string, Promise<DataRecord>>();
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
#user-profile-modal,#dm-modal,#mikoroku-dm-modal,#reply-notif-overlay{display:none;position:fixed;inset:0;z-index:999999;align-items:center;justify-content:center;padding:16px;box-sizing:border-box}
#user-profile-modal{background:rgba(0,0,0,.6);z-index:99999}
.profile-box{background:#1f1f2e;width:100%;max-width:380px;max-height:calc(100vh - 32px);overflow-y:auto;border-radius:14px;padding:18px;position:relative;color:white;box-sizing:border-box}
.profile-box.leaderboard-profile{isolation:isolate;border:1px solid rgb(var(--profile-rank-color)/55%);box-shadow:0 0 28px rgb(var(--profile-rank-color)/24%)}
.profile-box.leaderboard-profile:before{position:absolute;z-index:0;inset:0;border-radius:inherit;background:linear-gradient(115deg,transparent 25%,rgb(var(--profile-rank-color)/8%) 38%,rgb(var(--profile-rank-color)/42%) 50%,rgb(var(--profile-rank-color)/8%) 62%,transparent 75%);background-size:250% 250%;animation:leaderboard-profile-gradient 3.5s ease-in-out infinite alternate;content:"";pointer-events:none}
.profile-box.leaderboard-profile>*{position:relative;z-index:1}
.profile-box.leaderboard-profile>.profile-close{position:absolute;z-index:2}
.profile-box.leaderboard-rank-1{--profile-rank-color:139 92 246}
.profile-box.leaderboard-rank-2{--profile-rank-color:244 63 94}
.profile-box.leaderboard-rank-3{--profile-rank-color:249 115 22}
.profile-box.leaderboard-rank-4{--profile-rank-color:234 179 8}
.profile-box.leaderboard-rank-5{--profile-rank-color:59 130 246}
.profile-box.leaderboard-rank-6{--profile-rank-color:34 197 94}
.profile-box.leaderboard-rank-1{background:linear-gradient(145deg,#f2e8ff,#d8b4fe)}
.profile-box.leaderboard-rank-2{background:linear-gradient(145deg,#ffe4e6,#fecdd3)}
.profile-box.leaderboard-rank-3{background:linear-gradient(145deg,#ffedd5,#fed7aa)}
.profile-box.leaderboard-rank-4{background:linear-gradient(145deg,#fef9c3,#fde68a)}
.profile-box.leaderboard-rank-5{background:linear-gradient(145deg,#dbeafe,#bfdbfe)}
.profile-box.leaderboard-rank-6{background:linear-gradient(145deg,#dcfce7,#bbf7d0)}
html.dark .profile-box.leaderboard-rank-1{background:linear-gradient(145deg,#3b1f5b,#21152f)}
html.dark .profile-box.leaderboard-rank-2{background:linear-gradient(145deg,#5b2027,#30161b)}
html.dark .profile-box.leaderboard-rank-3{background:linear-gradient(145deg,#5b321c,#301d12)}
html.dark .profile-box.leaderboard-rank-4{background:linear-gradient(145deg,#514816,#302c12)}
html.dark .profile-box.leaderboard-rank-5{background:linear-gradient(145deg,#1e3a5f,#15283f)}
html.dark .profile-box.leaderboard-rank-6{background:linear-gradient(145deg,#1d4b2b,#142b1d)}
.leaderboard-profile .profile-stats{border:1px solid rgb(var(--profile-rank-color)/35%);background:inherit}
@keyframes leaderboard-profile-gradient{from{background-position:0% 50%}to{background-position:100% 50%}}
@media(prefers-reduced-motion:reduce){.profile-box.leaderboard-profile:before{animation:none}}
.profile-close{position:absolute;top:10px;right:14px;background:none;border:0;font-size:24px;color:#aaa;cursor:pointer}
.profile-top{display:flex;align-items:flex-start;gap:14px;margin-bottom:16px}.profile-avatar{width:80px;height:80px;border-radius:15px;border:3px solid #7c3aed;object-fit:cover}
.profile-bio-link{display:block;width:fit-content;max-width:100%;margin-top:8px;color:#93c5fd;font-size:.82rem;line-height:1.35;overflow-wrap:anywhere;text-decoration:underline;text-underline-offset:2px}.profile-bio-link:hover{color:#bfdbfe}.profile-bio-link[hidden]{display:none}
.profile-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:12px}
.profile-dm,.profile-stats-link{display:flex;align-items:center;justify-content:center;width:auto;height:34px;min-width:0;box-sizing:border-box;margin:0;border-radius:8px;font-size:12px;font-weight:600;line-height:1.2;text-align:center;text-decoration:none;white-space:nowrap}
.profile-dm{background:transparent;color:#22c55e;border:1px solid #22c55e;cursor:pointer}
.profile-stats-link{border:1px solid #f472b6;color:#f9a8d4;transition:background .2s,color .2s}.profile-stats-link:hover{background:rgba(244,114,182,.12);color:#fff}
.profile-stats{background:#28283a;border-radius:12px;padding:14px;margin-bottom:14px;display:grid;grid-template-columns:1fr 1fr;gap:12px;text-align:center}.profile-stat-label{color:#aaa;font-size:.75rem}.profile-badge-title{display:flex;align-items:center;gap:10px;margin:12px 0;color:#ddd;font-size:13px;font-weight:700}.profile-badge-title:after{content:"";flex:1;height:1px;background:rgba(255,255,255,.15)}
.user-custom-badge{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;height:var(--mikoroku-badge-height,24px);min-height:var(--mikoroku-badge-height,24px);padding:0 var(--mikoroku-badge-padding-x,8px);border:1px solid transparent;border-radius:var(--mikoroku-badge-radius,6px);background:linear-gradient(45deg,#7c3aed,#ec4899);color:white;font-size:var(--mikoroku-badge-font-size,11px);font-weight:600;line-height:1;white-space:nowrap;margin:2px}.game-role{display:inline-flex;padding:4px 9px;border-radius:8px;background:transparent;color:white;font-size:.78rem;font-weight:600;margin:2px}
#dm-modal{z-index:30000;background:rgba(0,0,0,.45);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
.dm-wrapper{width:100%;max-width:720px;height:78vh;display:flex;flex-direction:column;overflow:hidden;border-radius:22px;background:rgba(2,7,2,.92);border:1px solid rgba(77,255,101,.18);box-shadow:0 20px 60px rgba(0,0,0,.5)}
.dm-header{display:flex;align-items:center;justify-content:space-between;min-height:64px;padding:0 24px;background:rgba(133,255,77,.04);border-bottom:1px solid rgba(255,255,255,.06)}
.dm-header h2{margin:0;color:#b0ff8c;font-size:1.25rem}.dm-header-btn{width:42px;height:42px;border:0;border-radius:12px;background:rgba(255,255,255,.06);color:white;font-size:20px;cursor:pointer}
.dm-body{flex:1;display:flex;overflow:hidden}#dm-inbox{width:240px;min-width:240px;overflow-y:auto;border-right:1px solid rgba(255,255,255,.06)}
.dm-user-item{padding:12px 14px;display:flex;align-items:center;gap:12px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,.04);color:white}.dm-user-item:hover{background:rgba(255,255,255,.05)}
.dm-user-avatar{width:42px;height:42px;border-radius:50%;object-fit:cover;border:1px solid rgba(255,255,255,.1)}.dm-user-info{flex:1;min-width:0}.dm-user-name,.dm-user-lastmsg{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dm-user-name{font-size:14px;font-weight:600}.dm-user-lastmsg{font-size:12px;color:#a1a1a1;margin-top:2px}.dm-user-time{font-size:11px;color:#777}
#dm-chat-area{flex:1;display:none;flex-direction:column;min-width:0;color:white}.dm-chat-header{display:flex;align-items:center;gap:14px;min-height:64px;padding:0 20px;border-bottom:1px solid rgba(255,255,255,.06)}
#dm-chat-avatar{width:36px;height:36px;flex:0 0 36px;border-radius:50%;object-fit:cover;border:2px solid rgba(77,255,77,.5)}#dm-chat-name{font-weight:700}#dm-chat-status{color:#fbbf24;font-size:.85rem}
#mikoroku-dm-modal #mikoroku-dm-chat-avatar{display:block;width:36px;height:36px;flex:0 0 36px;border-radius:50%;object-fit:cover;border:2px solid rgba(77,255,77,.5)}
#dm-chat-messages{flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:12px}.dm-message{max-width:75%;padding:11px 16px;border-radius:18px;word-break:break-word;line-height:1.4;background:#334155}.dm-message.me{align-self:flex-end;background:#2563eb}.dm-message.other{align-self:flex-start}.dm-message-time{font-size:.72rem;opacity:.7;margin-top:4px;text-align:right;display:block}
.dm-input{padding:16px 18px;border-top:1px solid rgba(255,255,255,.06)}.dm-input-wrap{display:flex;align-items:flex-end;gap:12px}#dm-text{flex:1;min-height:48px;max-height:120px;padding:12px 16px;border:0;border-radius:16px;background:rgba(255,255,255,.08);color:white;resize:vertical;font:inherit}.dm-send-btn{width:48px;height:48px;border:0;border-radius:14px;background:linear-gradient(135deg,#62ff4d,#4adc26);color:white;font-size:18px;cursor:pointer}
.dm-empty{height:100%;display:flex;align-items:center;justify-content:center;color:#777;text-align:center;padding:30px;box-sizing:border-box}.dm-chat-header[hidden]{display:none!important}
#reply-notif-overlay{z-index:99999;background:rgba(0,20,40,.45)}.notif-box{background:rgba(30,41,59,.97);border:1px solid rgba(96,165,250,.25);color:#e2e8f0;padding:20px;border-radius:16px;max-width:420px;width:92%;max-height:80vh;overflow-y:auto;position:relative}
.notif-close{position:absolute;top:12px;right:16px;background:none;border:0;color:#93c5fd;font-size:22px;cursor:pointer}.notif-item{padding:14px 16px;margin-bottom:12px;border:1px solid rgba(94,145,255,.4);border-radius:14px;background:rgba(75,102,255,.12)}
@media(max-width:768px){#dm-modal{padding:8px}.dm-wrapper{height:94vh;max-height:94vh;border-radius:18px}.dm-header{position:relative;z-index:20;padding:0 12px}.dm-header h2{flex:1;text-align:center;margin:0 10px}.dm-body{position:relative;min-height:0}#dm-inbox{width:100%;min-width:100%;height:100%}#dm-chat-area{position:absolute;inset:0;z-index:5;background:rgba(2,7,2,.97)}.dm-chat-header{min-height:64px;padding:0 14px}.dm-chat-header[hidden]{display:none!important}#dm-chat-messages{padding:16px 12px}.dm-input{padding:12px}.dm-input-wrap{gap:8px}#dm-text{min-height:46px}.dm-send-btn{width:46px;height:46px}}
@media(max-width:480px){.dm-wrapper{height:96vh;max-height:96vh;border-radius:16px}.dm-header{min-height:58px;padding:0 8px}.dm-header h2{font-size:1rem}.dm-chat-header{min-height:58px}#dm-chat-avatar{width:32px;height:32px;flex-basis:32px}#dm-chat-messages{padding:12px 10px}.dm-message{max-width:85%}}
#mikoroku-dm-modal{z-index:100001;background:rgba(0,0,0,.45);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
#mikoroku-dm-modal .dm-wrapper{width:100%;max-width:720px;height:78vh;display:flex;flex-direction:column;overflow:hidden;border-radius:22px;background:rgba(2,7,2,.92);border:1px solid rgba(77,255,101,.18);box-shadow:0 20px 60px rgba(0,0,0,.5)}
#mikoroku-dm-modal .dm-body{flex:1;display:flex;overflow:hidden;min-height:0}
#mikoroku-dm-modal #mikoroku-dm-inbox{width:240px;min-width:240px;overflow-y:auto;border-right:1px solid rgba(255,255,255,.06)}
#mikoroku-dm-modal #mikoroku-dm-chat-area{flex:1;display:none;flex-direction:column;min-width:0;min-height:0;color:white}
#mikoroku-dm-modal #mikoroku-dm-chat-messages{flex:1;min-height:0;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:12px}
#mikoroku-dm-modal .dm-input{flex-shrink:0;padding:16px 18px;border-top:1px solid rgba(255,255,255,.06)}
#mikoroku-dm-modal #mikoroku-dm-text{flex:1;min-height:48px;max-height:120px;padding:12px 16px;border:0;border-radius:16px;background:rgba(255,255,255,.08);color:white;resize:vertical;font:inherit}
#mikoroku-dm-modal .dm-send-btn{width:48px;height:48px;border:0;border-radius:14px;background:linear-gradient(135deg,#62ff4d,#4adc26);color:white;font-size:18px;cursor:pointer}
#mikoroku-dm-modal #mikoroku-dm-chat-area .dm-chat-header[hidden]{display:none!important}
#mikoroku-dm-modal .dm-message{position:relative}
#mikoroku-dm-modal .dm-message-actions{position:absolute;top:4px;right:-18px;z-index:5}
#mikoroku-dm-modal .dm-menu-trigger{display:flex;width:24px;height:24px;align-items:center;justify-content:center;padding:0;border:0;border-radius:0;background:transparent;color:white;cursor:pointer}
#mikoroku-dm-modal .dm-menu-trigger:hover,#mikoroku-dm-modal .dm-message-actions.is-open .dm-menu-trigger{background:transparent}
#mikoroku-dm-modal .dm-message-menu{position:absolute;top:25px;right:0;display:none;flex-direction:column;gap:2px;min-width:36px;padding:4px;border:1px solid rgba(255,255,255,.12);border-radius:9px;background:#1f2937;box-shadow:0 8px 20px rgba(0,0,0,.35)}
#mikoroku-dm-modal .dm-message-actions.is-open .dm-message-menu{display:flex}
#mikoroku-dm-modal .dm-menu-item{display:flex;width:32px;height:32px;align-items:center;justify-content:center;padding:0;border:0;border-radius:7px;background:transparent;cursor:pointer}
#mikoroku-dm-modal .dm-menu-item:hover{background:rgba(255,255,255,.1)}
#mikoroku-dm-modal .dm-menu-item-edit{color:#60a5fa}
#mikoroku-dm-modal .dm-menu-item-delete{color:#ff6b6b}
@media(max-width:768px){#mikoroku-dm-modal{padding:8px}#mikoroku-dm-modal .dm-wrapper{height:94vh;max-height:94vh;border-radius:18px}#mikoroku-dm-modal .dm-body{position:relative;min-height:0}#mikoroku-dm-modal #mikoroku-dm-inbox{width:100%;min-width:100%;height:100%}#mikoroku-dm-modal #mikoroku-dm-chat-area{position:absolute;inset:0;z-index:5;background:rgba(2,7,2,.97)}#mikoroku-dm-modal #mikoroku-dm-chat-messages{padding:16px 12px}#mikoroku-dm-modal .dm-input{padding:12px}#mikoroku-dm-modal .dm-send-btn{width:46px;height:46px}}
@media(max-width:768px){#mikoroku-dm-modal .dm-message-actions{right:-10px}}
@media(max-width:480px){#mikoroku-dm-modal .dm-wrapper{height:96vh;max-height:96vh;border-radius:16px}#mikoroku-dm-modal #mikoroku-dm-chat-messages{padding:12px 10px}.dm-message{max-width:85%}}
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

function getUserProfileCacheData(data: DataRecord): DataRecord {
  const cached: DataRecord = {};
  for (const key of [
    "displayName",
    "username",
    "avatar",
    "bio",
    "bioLink",
    "commentCount",
    "points",
    "reputation",
    "customBadges",
    "customBadge",
    "gameRoles",
  ]) {
    if (data[key] !== undefined) cached[key] = data[key];
  }
  const joinedAt = timestampMillis(data.joinedAt || data.createdAt);
  if (joinedAt) cached.joinedAt = joinedAt;
  return cached;
}

function readUserProfileCache(uid: string, legacy: LegacyModalWindow): DataRecord | null {
  const inMemory = legacy.userStatsCache?.[uid];
  if (inMemory && !inMemory._empty && Object.keys(inMemory).length > 0) return inMemory;

  try {
    const raw = window.localStorage.getItem(USER_PROFILE_CACHE_KEY);
    if (raw) {
      const cache = asRecord(JSON.parse(raw));
      const entry = asRecord(cache[uid]) as UserProfileCacheEntry;
      if (entry.data && typeof entry.cachedAt === "number") {
        legacy.userStatsCache ||= {};
        legacy.userStatsCache[uid] = entry.data;
        return entry.data;
      }
    }

    const legacyCache = asRecord(JSON.parse(window.localStorage.getItem("userStatsCache_v1") || "null"));
    const legacyEntry = asRecord(legacyCache[uid]);
    if (Object.keys(legacyEntry).length && !legacyEntry._empty) {
      legacy.userStatsCache ||= {};
      legacy.userStatsCache[uid] = legacyEntry;
      return legacyEntry;
    }
  } catch (error) {
    console.warn("Cached user profile could not be read.", error);
  }
  return null;
}

function writeUserProfileCache(uid: string, data: DataRecord, legacy: LegacyModalWindow): void {
  const cachedData = getUserProfileCacheData(data);
  legacy.userStatsCache ||= {};
  legacy.userStatsCache[uid] = { ...legacy.userStatsCache[uid], ...cachedData };
  try {
    const cache = asRecord(JSON.parse(window.localStorage.getItem(USER_PROFILE_CACHE_KEY) || "{}"));
    cache[uid] = { cachedAt: Date.now(), data: cachedData } satisfies UserProfileCacheEntry;
    const entries = Object.entries(cache)
      .sort((left, right) => numberValue(asRecord(right[1]).cachedAt) - numberValue(asRecord(left[1]).cachedAt))
      .slice(0, USER_PROFILE_CACHE_LIMIT);
    window.localStorage.setItem(USER_PROFILE_CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch (error) {
    console.warn("User profile cache could not be saved.", error);
  }
}

function loadUserProfile(
  firestore: CompatFirestore,
  uid: string,
): Promise<DataRecord> {
  const pending = pendingUserProfileRequests.get(uid);
  if (pending) return pending;
  const request = firestore.collection("userStats").doc(uid).get()
    .then((snapshot) => snapshot.exists ? asRecord(snapshot.data()) : {});
  pendingUserProfileRequests.set(uid, request);
  const clearPending = () => {
    if (pendingUserProfileRequests.get(uid) === request) pendingUserProfileRequests.delete(uid);
  };
  void request.then(clearPending, clearPending);
  return request;
}

function timestampMillis(value: unknown): number {
  if (typeof value === "number" || typeof value === "string") {
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (!value || typeof value !== "object") return 0;
  const timestamp = value as CompatTimestamp;
  try {
    if (typeof timestamp.toMillis === "function") return timestamp.toMillis();
    if (typeof timestamp.toDate === "function") return timestamp.toDate().getTime();
  } catch {
    // Fall back to the serialized timestamp fields below.
  }
  return typeof timestamp.seconds === "number"
    ? timestamp.seconds * 1000 + numberValue(timestamp.nanoseconds) / 1_000_000
    : 0;
}

function formatTimestamp(value: unknown, style: "date" | "time" = "date"): string {
  const time = timestampMillis(value);
  if (!time) return "";
  const date = new Date(time);
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
  return /^https?:\/\//i.test(cover) ? cover : FALLBACK_COVER;
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
    openMikorokuDmInbox: legacy.openMikorokuDmInbox,
    openMikorokuDmToUser: legacy.openMikorokuDmToUser,
    openMikorokuNotifications: legacy.openMikorokuNotifications,
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

  const profileModal = createElement("div");
  profileModal.id = "user-profile-modal";
  profileModal.innerHTML = `<section class="profile-box"><button type="button" class="profile-close" data-close-profile aria-label="Close">×</button><div class="profile-top"><div><img class="profile-avatar" data-profile="avatar" src="${DEFAULT_AVATAR}" alt="User avatar"><div style="margin-top:8px;font-size:.78em;color:#aaa"><div style="color:#777">Joined</div><div data-profile="joined" style="color:#60a5fa;font-weight:600">—</div></div></div><div style="flex:1;min-width:0"><h2 data-profile="displayName" style="margin:0;font-size:1.15rem;line-height:1.3;word-break:break-word">Loading...</h2><p data-profile="username" style="margin:4px 0;color:#aaa;font-size:.85rem"></p><p data-profile="bio" style="margin:6px 0 0;color:#ccc;font-size:.85rem;line-height:1.4;word-break:break-word"></p></div></div><div class="profile-actions"><button type="button" class="profile-dm" data-profile-dm>Message</button><a class="profile-stats-link" data-profile-stats href="#">View Reading Stats</a></div><div class="profile-stats"><div><div class="profile-stat-label">Level</div><div data-profile="level"></div></div><div><div class="profile-stat-label">Points</div><div data-profile="points"></div></div><div><div class="profile-stat-label">Comments</div><div data-profile="comments"></div></div><div><div class="profile-stat-label">Reputation</div><div data-profile="reputation"></div></div></div><div class="profile-badge-title">Badge Collection</div><div data-profile="badges" style="text-align:center;min-height:32px"></div><div data-profile="roles"></div></section>`;
  const bioLink = document.createElement("a");
  bioLink.className = "profile-bio-link";
  bioLink.dataset.profile = "bioLink";
  bioLink.target = "_blank";
  bioLink.rel = "noopener noreferrer";
  bioLink.hidden = true;
  profileModal.querySelector('[data-profile="bio"]')?.after(bioLink);

  const dmModal = createElement("div");
  dmModal.id = "mikoroku-dm-modal";
  dmModal.innerHTML = `<div class="dm-wrapper"><div class="dm-header"><button type="button" id="mikoroku-dm-back-btn" class="dm-header-btn" style="display:none" aria-label="Back">←</button><h2>Direct Messages</h2><button type="button" id="mikoroku-dm-close-btn" class="dm-header-btn" aria-label="Close">✕</button></div><div class="dm-body"><div id="mikoroku-dm-inbox"></div><div id="mikoroku-dm-chat-area"><div class="dm-chat-header" id="mikoroku-dm-chat-header" hidden><img id="mikoroku-dm-chat-avatar" src="${DEFAULT_AVATAR}" alt="avatar"><div><div id="mikoroku-dm-chat-name">User</div><div id="mikoroku-dm-chat-status">@username</div></div></div><div id="mikoroku-dm-chat-messages"><div class="dm-empty">Select a conversation to start chatting</div></div><div class="dm-input"><div class="dm-input-wrap"><textarea id="mikoroku-dm-text" placeholder="Select a conversation first" disabled></textarea><button type="button" id="mikoroku-dm-send-btn" class="dm-send-btn" disabled aria-label="Send">➤</button></div></div></div></div></div>`;

  const notificationModal = createElement("div");
  notificationModal.id = "reply-notif-overlay";
  notificationModal.innerHTML = `<section class="notif-box"><button type="button" class="notif-close" data-close-notifications aria-label="Close">×</button><h3 style="margin:0 0 16px;text-align:center;color:#93c5fd">Notifications</h3><div id="reply-notif-list"></div></section>`;
  document.body.append(profileModal, dmModal, notificationModal);

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
  const waitForFirestore = async (): Promise<CompatFirestore> => {
    const existing = db();
    if (existing) return existing;

    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        window.clearTimeout(timeout);
        window.removeEventListener("firebaseCompatReady", onReady);
      };
      const onReady = () => {
        const firestore = db();
        if (!firestore) return;
        cleanup();
        resolve();
      };
      const timeout = window.setTimeout(() => {
        cleanup();
        reject(new Error("Firebase Firestore initialization timed out."));
      }, 15000);

      window.addEventListener("firebaseCompatReady", onReady);
      onReady();
    });

    const firestore = db();
    if (!firestore) throw new Error("Firebase Firestore is unavailable after initialization.");
    return firestore;
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
    if (window.location.pathname !== "/history") window.location.assign("/history");
  };
  const closeHistory = () => {
    if (window.location.pathname === "/history") window.history.back();
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
    const previous = readHistory().find((entry) => entry.url === data.url);
    void upsertReadingHistoryEntry({
      series: data.series || data.title || "",
      title: data.title || "Unknown",
      chapter: data.chapter || "",
      cover,
      slug: data.slug || "",
      url: data.url,
      time: Date.now(),
      progress: previous?.progress ?? 0,
    }).then(() => {
      window.dispatchEvent(new Event("mikoroku:reading-history-updated"));
    }).catch((error: unknown) => console.error("Could not save reading history.", error));
  };
  const deleteHistory = (url: string) => {
    if (!window.confirm("Remove this item from reading history?")) return;
    void deleteReadingHistoryEntry(url).then(() => {
      window.dispatchEvent(new Event("mikoroku:reading-history-updated"));
    }).catch((error: unknown) => console.error("Could not remove reading history entry.", error));
  };
  const clearHistory = () => {
    if (!window.confirm("Clear all reading history from this browser?")) return;
    void clearStoredReadingHistory().then(() => {
      window.dispatchEvent(new Event("mikoroku:reading-history-updated"));
    }).catch((error: unknown) => console.error("Could not clear reading history.", error));
  };

  let profileDmTarget: { uid: string; name: string; avatar: string } | null = null;
  let activeProfileUid: string | null = null;
  const renderUserProfile = (uid: string, data: DataRecord, preferredAvatar?: string) => {
    const displayName = stringValue(data.displayName, "Anonymous");
    const avatarUrl = stringValue(preferredAvatar) ||
      stringValue(data.avatar) ||
      stringValue(legacy.userStatsCache?.[uid]?.avatar, DEFAULT_AVATAR) ||
      DEFAULT_AVATAR;
    profileDmTarget = { uid, name: displayName, avatar: avatarUrl };
    const avatar = profileField("avatar") as HTMLImageElement | null;
    if (avatar) {
      avatar.onerror = () => {
        avatar.onerror = null;
        avatar.src = "/assets/icons/favicon.ico";
      };
      avatar.src = avatarUrl;
    }
    setText(profileField("displayName"), displayName);
    setText(profileField("username"), data.username ? `@${String(data.username)}` : "");
    setText(profileField("bio"), stringValue(data.bio, "Belum ada bio."));
    const bioLinkElement = profileField("bioLink") as HTMLAnchorElement | null;
    const safeBioLink = normalizeProfileLink(data.bioLink);
    if (bioLinkElement) {
      bioLinkElement.hidden = !safeBioLink;
      if (safeBioLink) {
        bioLinkElement.href = safeBioLink;
        bioLinkElement.textContent = safeBioLink;
      } else {
        bioLinkElement.removeAttribute("href");
        bioLinkElement.textContent = "";
      }
    }

    const joinedTimestamp = timestampMillis(data.joinedAt || data.createdAt) ||
      (legacy.currentUser?.uid === uid
        ? timestampMillis(legacy.currentUser.metadata?.creationTime)
        : 0);
    setText(
      profileField("joined"),
      joinedTimestamp
        ? new Date(joinedTimestamp).toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
        : "—",
    );

    const comments = numberValue(data.commentCount);
    const points = numberValue(data.points);
    const reputation = numberValue(data.reputation);
    setText(profileField("level"), `Lv. ${Math.floor(comments / 5) + 1}`);
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

    const badgeContainer = profileField("badges");
    const rolesContainer = profileField("roles");
    badgeContainer?.replaceChildren();
    rolesContainer?.replaceChildren();
    const customBadges = Array.isArray(data.customBadges)
      ? data.customBadges.filter((badge): badge is string => typeof badge === "string")
      : [];
    const primaryCustomBadge = stringValue(data.customBadge);
    if (primaryCustomBadge) customBadges.push(primaryCustomBadge);
    if (badgeContainer) {
      [...new Set(customBadges)].forEach((customBadge) => {
        const badgeLabel = BADGE_LABELS.get(customBadge);
        if (!badgeLabel) return;
        const badge = createElement(
          "span",
          `user-custom-badge settings-badge-option profile-custom-badge badge-${customBadge}`,
          badgeLabel,
        );
        badgeContainer.appendChild(badge);
      });
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
  };
  const showProfile = async (
    uid: string,
    leaderboardRank?: number,
    commentAvatar?: string,
  ): Promise<void> => {
    if (!uid) return;
    activeProfileUid = uid;
    profileModal.dataset.profileUid = uid;
    const statsLink = profileModal.querySelector<HTMLAnchorElement>("[data-profile-stats]");
    if (statsLink) statsLink.href = `/stats/${encodeURIComponent(uid)}`;
    const profileBox = profileModal.querySelector<HTMLElement>(".profile-box");
    profileBox?.classList.remove(
      "leaderboard-profile",
      "leaderboard-rank-1",
      "leaderboard-rank-2",
      "leaderboard-rank-3",
      "leaderboard-rank-4",
      "leaderboard-rank-5",
      "leaderboard-rank-6",
    );
    if (
      profileBox &&
      typeof leaderboardRank === "number" &&
      Number.isInteger(leaderboardRank) &&
      leaderboardRank >= 1 &&
      leaderboardRank <= 6
    ) {
      profileBox.classList.add("leaderboard-profile", `leaderboard-rank-${leaderboardRank}`);
    }
    profileModal.style.display = "flex";
    profileDmTarget = { uid, name: "Anonymous", avatar: DEFAULT_AVATAR };
    if (commentAvatar && !legacy.userStatsCache?.[uid]?.avatar) {
      legacy.userStatsCache ||= {};
      legacy.userStatsCache[uid] = {
        ...legacy.userStatsCache[uid],
        avatar: commentAvatar,
      };
    }
    const cachedProfile = readUserProfileCache(uid, legacy);
    if (cachedProfile) {
      renderUserProfile(uid, cachedProfile, commentAvatar);
    } else {
      setText(profileField("displayName"), "Loading...");
      setText(profileField("username"), "");
      setText(profileField("bio"), "Belum ada bio.");
      setText(profileField("level"), "");
      setText(profileField("points"), "");
      setText(profileField("comments"), "");
      setText(profileField("reputation"), "");
      setText(profileField("joined"), "—");
      const bioLinkElement = profileField("bioLink") as HTMLAnchorElement | null;
      if (bioLinkElement) {
        bioLinkElement.hidden = true;
        bioLinkElement.removeAttribute("href");
        bioLinkElement.textContent = "";
      }
      const avatar = profileField("avatar") as HTMLImageElement | null;
      if (avatar) avatar.src = DEFAULT_AVATAR;
      profileField("badges")?.replaceChildren();
      profileField("roles")?.replaceChildren();
    }
    try {
      const firestore = await waitForFirestore();
      const data = await loadUserProfile(firestore, uid);
      writeUserProfileCache(uid, data, legacy);
      if (activeProfileUid === uid) {
        renderUserProfile(uid, data, commentAvatar);
      }
    } catch (error) {
      console.error("User profile could not be refreshed.", error);
      if (activeProfileUid === uid && !cachedProfile) {
        setText(profileField("displayName"), "Profile unavailable");
        setText(profileField("joined"), "—");
      }
    }
  };
  const closeProfile = () => {
    activeProfileUid = null;
    delete profileModal.dataset.profileUid;
    profileModal.style.display = "none";
  };

  const dmById = <T extends HTMLElement>(id: string): T | null =>
    dmModal.querySelector(`#${id}`) as T | null;
  const inbox = dmById<HTMLDivElement>("mikoroku-dm-inbox");
  const messageArea = dmById<HTMLDivElement>("mikoroku-dm-chat-messages");
  const messageInput = dmById<HTMLTextAreaElement>("mikoroku-dm-text");
  const sendButton = dmById<HTMLButtonElement>("mikoroku-dm-send-btn");
  const chatArea = dmById<HTMLDivElement>("mikoroku-dm-chat-area");
  const chatHeader = dmById<HTMLDivElement>("mikoroku-dm-chat-header");
  const resetChat = () => {
    if (chatHeader) chatHeader.hidden = true;
    messageArea?.replaceChildren(createElement("div", "dm-empty", "Select a conversation to start chatting"));
    if (messageInput) {
      messageInput.disabled = true;
      messageInput.placeholder = "Select a conversation first";
    }
    if (sendButton) sendButton.disabled = true;
  };
  const closeMessageMenus = () => {
    dmModal.querySelectorAll<HTMLElement>(".dm-message-actions.is-open").forEach((actions) => {
      actions.classList.remove("is-open");
      actions.querySelector("[data-dm-menu-trigger]")?.setAttribute("aria-expanded", "false");
    });
  };
  const loadInbox = async (): Promise<void> => {
    dmModal.style.display = "flex";
    if (!inbox) return;
    resetChat();
    inbox.replaceChildren(createElement("div", "dm-empty", "Loading..."));
    try {
      const firestore = await waitForFirestore();
      const user = legacy.currentUser ||
        legacy.firebase?.auth?.().currentUser ||
        (window as Window & { currentUser?: CompatUser | null }).currentUser;
      if (!user) {
        inbox.replaceChildren(createElement("div", "dm-empty", "Login dulu untuk melihat DM"));
        return;
      }
      legacy.currentUser = user;

      const messages = firestore.collection("directMessages");
      const inboxSnapshot = await messages
        .where("participants", "array-contains", user.uid)
        .orderBy("timestamp", "desc")
        .limit(50)
        .get();
      const sortedMessages = [...inboxSnapshot.docs].sort(
        (left, right) => timestampMillis(asRecord(right.data()).timestamp) -
          timestampMillis(asRecord(left.data()).timestamp),
      );
      const chats = new Map<string, { name: string; avatar: string; last: string; time: string }>();
      sortedMessages.forEach((doc) => {
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
      if (window.innerWidth > 768) {
        const latestChatUid = chats.keys().next().value;
        if (latestChatUid) await openChat(latestChatUid);
      }
    } catch (error) {
      console.error("DM Inbox error:", error);
      const detail = error instanceof Error ? error.message : String(error);
      inbox.replaceChildren(createElement("div", "dm-empty", `Gagal memuat inbox: ${detail}`));
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
    const backButton = dmById<HTMLButtonElement>("mikoroku-dm-back-btn");
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
    setText(dmById("mikoroku-dm-chat-name"), name);
    setText(dmById("mikoroku-dm-chat-status"), `@${name.toLowerCase().replace(/\s+/g, "") || "user"}`);
    const avatar = dmById<HTMLImageElement>("mikoroku-dm-chat-avatar");
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
      const messages = firestore.collection("directMessages");
      const conversationSnapshot = await messages
        .where("participants", "array-contains", user.uid)
        .get();
      const sortedMessages = conversationSnapshot.docs
        .filter((doc) => {
          const data = asRecord(doc.data());
          return (
            (data.from === user.uid && data.to === uid) ||
            (data.from === uid && data.to === user.uid)
          );
        })
        .sort(
          (left, right) => timestampMillis(asRecord(left.data()).timestamp) -
            timestampMillis(asRecord(right.data()).timestamp),
        );
      messageArea.replaceChildren();
      let count = 0;
      sortedMessages.forEach((doc) => {
        const data = asRecord(doc.data());
        const isCurrentConversation =
          (data.from === user.uid && data.to === uid) ||
          (data.from === uid && data.to === user.uid);
        if (!isCurrentConversation) return;
        count += 1;
        const message = createElement("div", `dm-message ${data.from === user.uid ? "me" : "other"}`);
        message.appendChild(createElement("div", undefined, data.deleted ? "Message deleted" : stringValue(data.text)));
        message.appendChild(
          createElement(
            "span",
            "dm-message-time",
            `${formatTimestamp(data.timestamp, "time")}${data.edited ? " • edited" : ""}`,
          ),
        );
        if (data.from === user.uid && !data.deleted) {
          const actions = createElement("div", "dm-message-actions");
          const menuButton = createElement("button", "dm-menu-trigger");
          menuButton.type = "button";
          menuButton.setAttribute("data-dm-menu-trigger", "");
          menuButton.setAttribute("aria-label", "Opsi pesan");
          menuButton.setAttribute("aria-haspopup", "menu");
          menuButton.setAttribute("aria-expanded", "false");
          menuButton.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>`;
          const menu = createElement("div", "dm-message-menu");
          menu.setAttribute("role", "menu");
          const editButton = createElement("button", "dm-menu-item dm-menu-item-edit");
          editButton.type = "button";
          editButton.setAttribute("aria-label", "Edit message");
          editButton.setAttribute("role", "menuitem");
          editButton.title = "Edit";
          editButton.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>`;
          editButton.addEventListener("click", async () => {
            closeMessageMenus();
            const currentText = stringValue(data.text);
            const updatedText = window.prompt("Edit message:", currentText)?.trim();
            if (!updatedText || updatedText === currentText) return;
            try {
              const editedAt = legacy.firebase?.firestore?.FieldValue?.serverTimestamp?.();
              await firestore.collection("directMessages").doc(doc.id).update({
                text: updatedText,
                edited: true,
                ...(editedAt ? { editedAt } : {}),
              });
              await openChat(uid);
            } catch (error) {
              console.error("Gagal mengedit pesan DM.", error);
              window.alert("Gagal mengedit pesan.");
            }
          });
          const deleteButton = createElement("button", "dm-menu-item dm-menu-item-delete");
          deleteButton.type = "button";
          deleteButton.setAttribute("aria-label", "Hapus pesan");
          deleteButton.setAttribute("role", "menuitem");
          deleteButton.title = "Hapus";
          deleteButton.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>`;
          deleteButton.addEventListener("click", async () => {
            closeMessageMenus();
            if (!window.confirm("Hapus pesan ini?")) return;
            try {
              await firestore.collection("directMessages").doc(doc.id).update({
                deleted: true,
                text: "",
              });
              await openChat(uid);
            } catch (error) {
              console.error("Gagal menghapus pesan DM.", error);
              window.alert("Gagal menghapus pesan.");
            }
          });
          menu.append(editButton, deleteButton);
          actions.append(menuButton, menu);
          message.appendChild(actions);
        }
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
    const backButton = dmById<HTMLButtonElement>("mikoroku-dm-back-btn");
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

  const onInboxClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const row = target.closest<HTMLElement>("[data-chat-uid]");
    if (row?.dataset.chatUid) void openChat(row.dataset.chatUid);
  };
  const onModalClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const menuButton = target.closest<HTMLButtonElement>("[data-dm-menu-trigger]");
    if (menuButton) {
      const actions = menuButton.closest<HTMLElement>(".dm-message-actions");
      const shouldOpen = !actions?.classList.contains("is-open");
      closeMessageMenus();
      if (actions && shouldOpen) {
        actions.classList.add("is-open");
        menuButton.setAttribute("aria-expanded", "true");
      }
      return;
    }
    if (!target.closest(".dm-message-actions")) closeMessageMenus();
    if (target.closest("[data-close-profile]")) closeProfile();
    else if (target.closest("[data-profile-dm]")) {
      const dmTarget = profileDmTarget;
      closeProfile();
      if (dmTarget) openDmToUser(dmTarget.uid, dmTarget.name, dmTarget.avatar);
    }     else if (target.closest("[data-close-notifications]")) closeNotifications();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey && event.target === messageInput) {
      event.preventDefault();
      void sendMessage();
    }
  };
  document.addEventListener("click", onModalClick);
  inbox?.addEventListener("click", onInboxClick);
  dmById("mikoroku-dm-close-btn")?.addEventListener("click", closeDm);
  dmById("mikoroku-dm-back-btn")?.addEventListener("click", backToInbox);
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
    openMikorokuDmInbox: loadInbox,
    openMikorokuDmToUser: openDmToUser,
    openMikorokuNotifications: loadNotifications,
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
      openMikorokuDmInbox: loadInbox,
      openMikorokuDmToUser: openDmToUser,
      openMikorokuNotifications: loadNotifications,
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
    document.removeEventListener("click", onModalClick);
    inbox?.removeEventListener("click", onInboxClick);
    dmById("mikoroku-dm-close-btn")?.removeEventListener("click", closeDm);
    dmById("mikoroku-dm-back-btn")?.removeEventListener("click", backToInbox);
    messageInput?.removeEventListener("keydown", onKeyDown);
    [notificationModal, dmModal, profileModal].forEach((element) => element.remove());
    style.remove();
    (Object.keys(previousApi) as Array<keyof typeof previousApi>).forEach(restoreApi);
  };
}

export default function UserModals() {
  useEffect(() => initializeUserModals(), []);
  return null;
}
