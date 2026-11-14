"use client";

import { useEffect, useRef, useState } from "react";
import { getApps, initializeApp } from "firebase/app";
import {
  collection,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  startAfter,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import SiteChrome from "../site-chrome";
import { normalizeProfileLink } from "../lib/profile-link";
import styles from "./settings.module.css";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}


type Settings = {
  displayName: string;
  username: string;
  bio: string;
  bioLink: string;
  avatar: string;
  customBadge: string;
  customBadges: string[];
  customAvatarFrame: string;
  customFontStyle: string;
  customBorder: string;
  customShape: string;
  customCommentBg: string;
  gameRoles: string[];
  disableAnimations: boolean;
  disableTopCommentFireflies: boolean;
};

type Account = { uid: string; displayName?: string | null; photoURL?: string | null };

const anonymousAvatar = "https://ui-avatars.com/api/?name=User&background=7c3aed&color=fff";
const badges = [
  ["", "None"], ["milf", "Milf Lover"], ["horny", "Team Horny"], ["night-owl", "Night Owl"],
  ["chaos-entity", "Chaos Entity"], ["yandere-energy", "Yandere Energy"], ["cultured", "Cultured"],
  ["npc", "NPC"], ["lore-master", "Lore Master"], ["touch-grass", "Touch Grass"],
  ["gremlin", "Gremlin"], ["certified-degenerate", "Certified Degenerate"], ["waifu-collector", "Waifu Collector"],
  ["manga-addict", "Manga Addict"], ["sleep-deprived", "Sleep Deprived"], ["horny-jail-escapee", "Horny Jail Escapee"],
  ["elite-reader", "Elite Reader"], ["keyboard-warrior", "Keyboard Warrior"], ["dungeon-master", "Dungeon Master"],
  ["gacha-victim", "Gacha Victim"], ["onee-san-hunter", "Onee-san Hunter"], ["tsundere", "Tsundere"],
  ["baka-squad", "Baka Squad"], ["void-walker", "Void Walker"], ["brain-not-found", "404 Brain Not Found"],
  ["professional-lurker", "Professional Lurker"], ["cosmic-simp", "Cosmic Simp"], ["schizo-poster", "Schizo Poster"],
  ["doomer", "Doomer"], ["coomer", "Coomer"], ["terminally-online", "Terminally Online"],
  ["egirl-hunter", "E-girl Hunter"], ["chuuni", "Chuuni"], ["neet-lord", "NEET Lord"],
  ["incognito-degen", "Incognito Degenerate"], ["rage-baiter", "Rage Baiter"], ["shipper-supreme", "Shipper Supreme"],
  ["lurker-god", "Lurker God"], ["menhera", "Menhera"], ["power-bottom", "Power Bottom"],
  ["salaryman-slave", "Salaryman Slave"], ["isekai-protagonist", "Isekai Protagonist"], ["trash-taste", "Trash Taste Enjoyer"],
  ["paradox-simp", "Paradoxical Simp"], ["fourchan-refugee", "4chan Refugee"], ["cope-enjoyer", "Cope Enjoyer"],
  ["seethe-lord", "Seethe Lord"], ["ratio-touch-grass", "Ratio + Touch Grass"], ["based-department", "Based Department"],
  ["cringe-overlord", "Cringe Overlord"], ["malding-champion", "Malding Champion"], ["hikikomori-emperor", "Hikikomori Emperor"],
  ["yabai-energy", "Yabai Energy"], ["sugoi-desu", "Sugoi Desu"], ["ara-ara-enjoyer", "Ara Ara Enjoyer"],
  ["onii-chan-protector", "Onii-chan Protector"], ["imouto-collector", "Imouto Collector"], ["genshin-addict", "Genshin Addict"],
  ["fomo-victim", "FOMO Victim"], ["doom-scroller", "Doom Scroller"], ["reply-guy", "Reply Guy"],
  ["main-character-syndrome", "Main Character Syndrome"], ["final-boss-of-simping", "Final Boss of Simping"], ["weeb-supreme", "Weeb Supreme"],
  ["otaku-overlord", "Otaku Overlord"], ["waifu-defender", "Waifu Defender"], ["two-d-only", "2D Only"],
  ["isekai-veteran", "Isekai Veteran"], ["senpai-noticer", "Senpai Noticer"], ["ara-ara-collector", "Ara Ara Collector"],
  ["light-novel-degen", "Light Novel Degenerate"], ["chuuni-lord", "Chuuni Lord"], ["trap-connoisseur", "Trap Connoisseur"],
  ["yuri-enjoyer", "Yuri Enjoyer"], ["kawaii-overlord", "Kawaii Overlord"], ["hololive-simp", "Hololive Simp"],
  ["visual-novel-addict", "Visual Novel Addict"], ["mecha-pilot", "Mecha Pilot"], ["figurine-hoarder", "Figurine Hoarder"],
  ["anime-onahole", "Anime Onahole"], ["raid-boss", "Raid Boss"], ["anime-speedrunner", "Anime Speedrunner"],
  ["isekai-truck-victim", "Truck-kun Victim"], ["vtuber-rabbit-hole", "VTuber Rabbit Hole"], ["wifi-warrior", "WiFi Warrior"],
  ["ranked-demon", "Ranked Demon"], ["afk-legend", "AFK Legend"], ["loot-goblin", "Loot Goblin"],
  ["fps-sweat", "FPS Sweat"], ["combo-dropper", "Combo Dropper"], ["maid-cafe-regular", "Maid Cafe Regular"],
  ["goblin-mode", "Goblin Mode"], ["anime-marathoner", "Anime Marathoner"], ["patch-note-reader", "Patch Note Reader"],
  ["boss-music-enjoyer", "Boss Music Enjoyer"], ["daily-quest-slave", "Daily Quest Slave"], ["ping-999", "Ping 999"],
  ["anime-ending-destroyed-me", "Ending Destroyed Me"], ["waifu-meta-abuser", "Waifu Meta Abuser"], ["controller-thrower", "Controller Thrower"],
  ["opening-skipper", "Opening Skipper"], ["ending-enjoyer", "Ending Enjoyer"], ["gacha-god", "Gacha God"],
  ["skill-issue", "Skill Issue"], ["anime-ost-addict", "OST Addict"], ["last-online-3am", "Last Online 3AM"],
  ["npc-dialogue-skipper", "Dialogue Skipper"], ["cutscene-enjoyer", "Cutscene Enjoyer"], ["voice-actor-enjoyer", "Seiyuu Enjoyer"],
  ["achaaan", "Nyaa~"], ["white-hair-enjoyer", "White Hair Enjoyer"], ["silver-hair-simp", "Silver Hair Simp"],
  ["twin-tail-lover", "Twintail Lover"], ["kuudere-enjoyer", "Kuudere Enjoyer"], ["gyaru-enjoyer", "Gyaru Enjoyer"],
  ["glasses-supremacy", "Glasses Supremacy"], ["short-hair-propaganda", "Short Hair Propaganda"], ["long-hair-cult", "Long Hair Cult"],
  ["catgirl-enjoyer", "Catgirl Enjoyer"], ["fox-girl-follower", "Fox Girl Follower"], ["maid-enjoyer", "Maid Enjoyer"],
  ["goth-girl-enjoyer", "Goth Girl Enjoyer"], ["muscle-waifu-appreciator", "Muscle Waifu Appreciator"],
  ["hoodie-waifu-enjoyer", "Hoodie Waifu Enjoyer"], ["fang-lover", "Fang Lover"], ["thigh-high-supremacy", "Thigh High Supremacy"],
  ["office-lady-enjoyer", "Office Lady Enjoyer"], ["dark-elf-believer", "Dark Elf Believer"], ["school-uniform-lover", "Uniform Aesthetic"],
  ["red-eyes-enjoyer", "Red Eyes Enjoyer"], ["flat-is-justice", "Flat Is Justice"], ["medium-is-premium", "Medium Is Premium"],
  ["oppai-enjoyer", "Oppai Enjoyer"], ["boing-boing-energy", "Boing Boing Energy"], ["petite-supremacy", "Petite Supremacy"],
  ["balanced-build", "Balanced Build"], ["anime-physics-believer", "Anime Physics"], ["isekai-enjoyer", "Isekai Enjoyer"],
  ["romcom-addict", "RomCom Addict"], ["slice-of-life-soul", "Slice of Life Soul"], ["psychological-damage", "Psychological Damage"],
  ["mecha-enjoyer", "Mecha Enjoyer"], ["dark-fantasy-cult", "Dark Fantasy Cult"], ["shounen-bloodline", "Shounen Bloodline"],
  ["seinen-enjoyer", "Seinen Enjoyer"], ["yuri-propaganda", "Yuri Propaganda"], ["horror-route", "Horror Route"],
  ["fantasy-guild-member", "Fantasy Guild"], ["cyberpunk-mindset", "Cyberpunk Mindset"], ["school-festival-arc", "School Festival Arc"],
  ["sports-anime-energy", "Sports Anime Energy"], ["idol-hell", "Idol Hell"], ["visual-novel-route", "Visual Novel Route"],
  ["gacha-lore-reader", "Gacha Lore Reader"], ["post-apocalyptic-vibes", "Post-Apocalyptic"], ["cute-girls-doing-things", "CGDCT Enjoyer"],
  ["villainess-route", "Villainess Route"], ["drama-victim", "Drama Victim"], ["emotional-damage", "Emotional Damage"],
  ["toxic-romance-reader", "Toxic Romance"], ["pain-arc-enjoyer", "Pain Arc Enjoyer"], ["betrayal-route", "Betrayal Route"],
  ["red-flag-collector", "Red Flag Collector"], ["copium-inhaler", "Copium Inhaler"], ["suffering-build", "Suffering Build"],
  ["ntr-enjoyer", "NTR Enjoyer"],
];

function getBadgeSelectionLimit(commentCount: unknown) {
  return getCommentLevel(commentCount) >= 110 ? 2 : 1;
}

function getCommentLevel(commentCount: unknown) {
  const count = typeof commentCount === "number" && Number.isFinite(commentCount)
    ? Math.max(0, commentCount)
    : 0;
  return Math.floor(count / 5) + 1;
}

const commentFirebaseConfig = {
  apiKey: "AIzaSyCxufJubuS95zQnvctINvzj-H8WSIgsse4",
  authDomain: "widget-comment.firebaseapp.com",
  projectId: "widget-comment",
  storageBucket: "widget-comment.firebasestorage.app",
  messagingSenderId: "249700505242",
  appId: "1:249700505242:web:dab240af09caf30ad7f123",
};

function getCommentFirestore() {
  const app = getApps().find((candidate) => candidate.name === "mikoroku-leaderboard") ??
    initializeApp(commentFirebaseConfig, "mikoroku-leaderboard");
  return getFirestore(app);
}

async function isTopCommenter(uid: string): Promise<boolean> {
  const firestore = getCommentFirestore();
  let visibleRank = 0;
  let lastDocument: QueryDocumentSnapshot | undefined;

  while (true) {
    const leaderboardQuery = query(
      collection(firestore, "userStats"),
      orderBy("commentCount", "desc"),
      ...(lastDocument ? [startAfter(lastDocument)] : []),
      limit(100),
    );
    const snapshot = await getDocs(leaderboardQuery);
    for (const userDocument of snapshot.docs) {
      if (userDocument.data().leaderboardHidden === true) continue;
      visibleRank += 1;
      if (userDocument.id === uid) return visibleRank <= 6;
      if (visibleRank >= 6) return false;
    }

    if (snapshot.empty) return false;
    lastDocument = snapshot.docs.at(-1);
    if (!lastDocument) return false;
  }
}

const IMGBB_API_KEY = "751e8d146b32b8a00499aef04f568e30";
const MAX_COMMENT_BACKGROUND_FILE_SIZE = 20 * 1024 * 1024;

function compressCommentBackground(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    createImageBitmap(file).then((bitmap) => {
      const scale = Math.min(1, 1600 / bitmap.width, 1600 / bitmap.height);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) {
        bitmap.close();
        reject(new Error("Browser image processing is unavailable."));
        return;
      }

      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("The background image could not be compressed."));
      }, "image/webp", 0.72);
    }).catch((error: unknown) => {
      reject(error instanceof Error ? error : new Error("The background image could not be processed."));
    });
  });
}

async function uploadCommentBackground(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }
  if (file.size > MAX_COMMENT_BACKGROUND_FILE_SIZE) {
    throw new Error("Background images must be 20 MB or smaller.");
  }

  const compressedImage = await compressCommentBackground(file);
  const formData = new FormData();
  formData.append("image", compressedImage, "comment-background.webp");
  const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: "POST",
    body: formData,
  });
  const result: {
    success?: boolean;
    data?: { url?: string };
    error?: { message?: string };
  } = await response.json();
  if (!response.ok || !result.success || !result.data?.url) {
    throw new Error(result.error?.message || `Image upload failed (${response.status}).`);
  }
  return result.data.url;
}

function normalizeBadges(data: Partial<Settings> & { commentCount?: unknown }) {
  const saved = Array.isArray(data.customBadges)
    ? data.customBadges.map(String)
    : data.customBadge
      ? [String(data.customBadge)]
      : [];
  const known = new Set(badges.map(([id]) => id));
  return [...new Set(saved.filter((id) => known.has(id)))].slice(0, getBadgeSelectionLimit(data.commentCount));
}

const roles = [
  ["genshin", "Genshin Impact"], ["honkai-star-rail", "Honkai: Star Rail"],
  ["zenless-zone-zero", "Zenless Zone Zero"], ["azur-lane", "Azur Lane"],
  ["blue-archive", "Blue Archive"], ["nikke", "Goddess of Victory: Nikke"],
  ["arknights", "Arknights"], ["punishing-gray-raven", "Punishing: Gray Raven"],
  ["wuthering-waves", "Wuthering Waves"], ["tower-of-fantasy", "Tower of Fantasy"],
  ["mobile-legends", "Mobile Legends"], ["league-of-legends", "League of Legends"],
  ["wild-rift", "League of Legends: Wild Rift"], ["dota-2", "Dota 2"],
  ["valorant", "Valorant"], ["counter-strike-2", "Counter-Strike 2"],
  ["call-of-duty", "Call of Duty"], ["warzone", "Warzone"], ["apex-legends", "Apex Legends"],
  ["overwatch-2", "Overwatch 2"], ["rainbow-six-siege", "Rainbow Six Siege"],
  ["pubg", "PUBG"], ["free-fire", "Free Fire"], ["fortnite", "Fortnite"],
  ["minecraft", "Minecraft"], ["terraria", "Terraria"], ["roblox", "Roblox"], ["palworld", "Palworld"],
  ["elden-ring", "Elden Ring"], ["dark-souls", "Dark Souls"], ["monster-hunter", "Monster Hunter"],
  ["final-fantasy-xiv", "Final Fantasy XIV"], ["skyrim", "Skyrim"], ["the-witcher-3", "The Witcher 3"],
  ["world-of-warcraft", "World of Warcraft"], ["black-desert", "Black Desert Online"], ["runescape", "RuneScape"],
  ["forza-horizon-5", "Forza Horizon 5"], ["gran-turismo-7", "Gran Turismo 7"],
  ["need-for-speed", "Need for Speed"], ["ea-fc-26", "EA Sports FC"], ["nba-2k", "NBA 2K"],
  ["resident-evil", "Resident Evil"], ["dead-by-daylight", "Dead by Daylight"],
  ["silent-hill", "Silent Hill"], ["pokemon", "Pokémon"], ["zelda", "The Legend of Zelda"],
  ["mario", "Super Mario"], ["tekken-8", "Tekken 8"], ["street-fighter-6", "Street Fighter 6"],
  ["mortal-kombat-1", "Mortal Kombat 1"], ["hollow-knight", "Hollow Knight"],
  ["stardew-valley", "Stardew Valley"], ["among-us", "Among Us"],
];
const fonts = [
  ["", "Default", "System Font"], ["anime", "Anime", "やあ、元気？"],
  ["comic", "Comic Bold", "POW! BOOM!"], ["cyberpunk", "Cyberpunk", "N E O N"],
  ["typewriter", "Typewriter", "Dear Diary..."], ["elegant", "Elegant", "Once upon a time"],
  ["retro", "Retro Game", "8 BIT VIBES"], ["handwritten", "Handwritten", "Love Letter"],
  ["gothic", "Gothic", "Dark Soul"], ["bold-impact", "Impact", "MAXIMUM"],
  ["pixel", "Pixel Game", "GAME OVER"], ["kawaii", "Kawaii", "Kyaa~ ✨"],
  ["horror", "Horror", "RUN..."], ["magic", "Magic Spell", "Abracadabra"],
  ["hacker", "Hacker", "ACCESS GRANTED"], ["fantasy", "Fantasy", "Dragonborn"],
  ["modern", "Modern Sans", "Clean Vibes"], ["script", "Elegant Script", "Sincerely"],
  ["bold-sans", "Bold Sans", "HEADLINE"], ["vaporwave", "Vaporwave", "ＡＥＳＴＨＥＴＩＣ"],
];
const borders = [
  ["", "Default"], ["shake", "Shake"], ["glitch-lite", "Glitch Lite"], ["flicker", "Flicker"],
  ["float", "Float"], ["pulse", "Pulse"], ["spectrum", "Spectrum"], ["breath", "Breath"],
  ["drift", "Drift"], ["chaos", "Chaos"],
];
const shapes = [
  ["", "Default"], ["box", "Box"], ["rounded", "Rounded"], ["octagon", "Octagon"],
  ["cyber", "Cyber Cut"], ["corner", "Corner Only"], ["corner-alt", "Corner Alt"],
  ["corner-top", "Corner Top"], ["corner-bottom", "Corner Bottom"], ["blob", "Blob"],
  ["dashed", "Dashed"], ["dotted", "Dotted"], ["diagonal", "Diagonal Line"],
  ["zigzag", "Zigzag"], ["grid", "Tech Grid"],
];
const settingsSections = [
  ["profile", "Profile", "👤"],
  ["performance", "Performance", "⚡"],
  ["custom-badges", "Custom Badges", "🏅"],
  ["game-roles", "Game Roles", "🎮"],
  ["avatar-frame", "Avatar Frame", "🖼️"],
  ["font-style", "Font Style", "🔤"],
  ["border-effect", "Border Effect", "✨"],
  ["border-shape", "Border Shape", "⬡"],
  ["comment-background", "Comment BG", "🎨"],
] as const;
type SettingsSection = (typeof settingsSections)[number][0];

const initialSettings: Settings = {
  displayName: "",
  username: "",
  bio: "",
  bioLink: "",
  avatar: "",
  customBadge: "",
  customBadges: [],
  customAvatarFrame: "",
  customFontStyle: "",
  customBorder: "",
  customShape: "",
  customCommentBg: "",
  gameRoles: [],
  disableAnimations: false,
  disableTopCommentFireflies: false,
};

export default function SettingsPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [status, setStatus] = useState<"loading" | "guest" | "ready" | "error">("loading");
  const [topCommenterAccess, setTopCommenterAccess] = useState<"checking" | "allowed" | "denied" | "error">("checking");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"info" | "success" | "error">("info");
  const [saving, setSaving] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [allBadgesExpanded, setAllBadgesExpanded] = useState(false);
  const [badgeLimit, setBadgeLimit] = useState(1);
  const [userLevel, setUserLevel] = useState(0);
  const [customBgError, setCustomBgError] = useState("");
  const [customBgUploading, setCustomBgUploading] = useState(false);
  const [activeSection, setActiveSection] = useState<SettingsSection>("profile");
  const settingsContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    let attempts = 0;

    const applyUser = async (user: Account & { photoURL?: string | null }) => {
      setAccount(user);
      setTopCommenterAccess("checking");

      try {
        const cached = localStorage.getItem("userSettingsPreview");
        if (cached) {
          const parsed = JSON.parse(cached) as Partial<Settings>;
          setSettings({
            ...initialSettings,
            ...parsed,
            displayName: String(parsed.displayName || user.displayName || ""),
            bioLink: String(parsed.bioLink || ""),
            avatar: String(parsed.avatar || user.photoURL || anonymousAvatar),
            customBadge: String(parsed.customBadge || parsed.customBadges?.[0] || ""),
            customBadges: normalizeBadges(parsed),
            gameRoles: Array.isArray(parsed.gameRoles) ? parsed.gameRoles.map(String) : [],
            disableAnimations: parsed.disableAnimations === true ||
              localStorage.getItem("commentWidget_disableAnimations") === "true",
            disableTopCommentFireflies: parsed.disableTopCommentFireflies === true ||
              localStorage.getItem("commentWidget_disableTopCommentFireflies") === "true",
          });
          setStatus("ready");
        }
      } catch { /* ignore bad cache */ }

      try {
        const snapshot = await window.firebase!.firestore().collection("userStats").doc(user.uid).get();
        const data = (snapshot.exists ? snapshot.data() || {} : {}) as Partial<Settings> & { commentCount?: unknown };
        if (!active) return;
        setUserLevel(getCommentLevel(data.commentCount));
        setBadgeLimit(getBadgeSelectionLimit(data.commentCount));
        setSettings({
          ...initialSettings,
          displayName: String(data.displayName || user.displayName || ""),
          username: String(data.username || ""),
          bio: String(data.bio || ""),
          bioLink: String(data.bioLink || ""),
          avatar: String(data.avatar || user.photoURL || anonymousAvatar),
          customBadge: String(data.customBadge || data.customBadges?.[0] || ""),
          customBadges: normalizeBadges(data),
          customAvatarFrame: String(data.customAvatarFrame || ""),
          customFontStyle: String(data.customFontStyle || ""),
          customBorder: String(data.customBorder || ""),
          customShape: String(data.customShape || ""),
          customCommentBg: String(data.customCommentBg || ""),
          gameRoles: Array.isArray(data.gameRoles) ? data.gameRoles.map(String) : [],
          disableAnimations: data.disableAnimations === true ||
            localStorage.getItem("commentWidget_disableAnimations") === "true",
          disableTopCommentFireflies: data.disableTopCommentFireflies === true ||
            localStorage.getItem("commentWidget_disableTopCommentFireflies") === "true",
        });
        setStatus("ready");

        try {
          const isEligible = await isTopCommenter(user.uid);
          if (active) setTopCommenterAccess(isEligible ? "allowed" : "denied");
        } catch (error) {
          console.error("Top commenter eligibility failed to load.", error);
          if (active) {
            setTopCommenterAccess("error");
            showNotification("Top commenter status could not be verified. This setting stays locked.", "error");
          }
        }
      } catch (error) {
        console.error("User settings failed to load.", error);
        if (active) {
          setTopCommenterAccess("error");
          setStatus((prev) => {
            if (prev === "ready") return prev;
            setMessageType("error");
            setMessage("Your settings could not be loaded. Check your connection and try again.");
            return "error";
          });
        }
      }
    };

    const attach = () => {
      if (!window.firebase?.auth) return false;
      const auth = window.firebase.auth();
      const current = auth.currentUser as (Account & { photoURL?: string | null }) | null;
      if (current) void applyUser(current);

      unsubscribe = auth.onAuthStateChanged((user) => {
        if (!active) return;
        if (!user) {
          setAccount(null);
          setTopCommenterAccess("denied");
          setStatus("guest");
          return;
        }
        void applyUser(user as Account & { photoURL?: string | null });
      });
      return true;
    };

    if (!attach()) {
      const poll = window.setInterval(() => {
        attempts += 1;
        if (attach()) {
          window.clearInterval(poll);
          return;
        }
        if (attempts >= 50 && active) {
          window.clearInterval(poll);
          setStatus("error");
          setMessageType("error");
          setMessage("Authentication service is unavailable.");
        }
      }, 100);

      return () => {
        active = false;
        window.clearInterval(poll);
        unsubscribe?.();
      };
    }

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!message || status !== "ready" || customBgUploading) return;
    const timeout = window.setTimeout(() => setMessage(""), messageType === "error" ? 7000 : 5000);
    return () => window.clearTimeout(timeout);
  }, [message, messageType, status, customBgUploading]);

  function showNotification(text: string, type: "info" | "success" | "error") {
    setMessageType(type);
    setMessage(text);
  }

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function toggleRole(role: string) {
    update("gameRoles", settings.gameRoles.includes(role)
      ? settings.gameRoles.filter((item) => item !== role)
      : [...settings.gameRoles, role]);
  }

  function toggleBadge(badge: string) {
    const selected = settings.customBadges;
    const nextBadges = badge === ""
      ? []
      : selected.includes(badge)
        ? selected.filter((item) => item !== badge)
        : [...selected, badge].slice(-badgeLimit);
    update("customBadges", nextBadges);
    update("customBadge", nextBadges[0] || "");
  }

  async function selectAvatar(file?: File) {
    setAvatarError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setAvatarError("Please choose an image file.");
      return;
    }
    if (file.size > 512 * 1024) {
      setAvatarError("Avatar images must be 512 KB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") update("avatar", reader.result);
      else setAvatarError("The avatar image could not be read.");
    };
    reader.onerror = () => setAvatarError("The avatar image could not be read.");
    reader.readAsDataURL(file);
  }

  async function uploadCustomCommentBg(file?: File, input?: HTMLInputElement) {
    setCustomBgError("");
    if (!file) return;
    if (userLevel < 120) {
      setCustomBgError("Custom comment backgrounds unlock at level 120.");
      return;
    }

    setCustomBgUploading(true);
    showNotification("Compressing and uploading the background...", "info");
    try {
      const url = await uploadCommentBackground(file);
      update("customCommentBg", url);
      showNotification("Custom comment background uploaded. Save settings to apply it.", "success");
    } catch (error) {
      console.error("Custom comment background upload failed.", error);
      setCustomBgError(error instanceof Error ? error.message : "The background image could not be uploaded.");
      setMessage("");
    } finally {
      setCustomBgUploading(false);
      if (input) input.value = "";
    }
  }

  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!account || !window.firebase) return;
    const bioLink = normalizeProfileLink(settings.bioLink);
    if (settings.bioLink.trim() && !bioLink) {
      showNotification("Enter a valid website URL.", "error");
      return;
    }
    setSaving(true);
    setMessage("");
    const sanitizedUsername = settings.username.toLowerCase().replace(/[^a-z0-9._-]/g, "");
    const next: Settings = {
      ...settings,
      customBadges: settings.customBadges.slice(0, badgeLimit),
      customBadge: settings.customBadges[0] || "",
      displayName: settings.displayName.trim() || "Anonymous",
      username: sanitizedUsername,
      bio: settings.bio.trim(),
      bioLink,
    };
    try {
      await window.firebase.firestore().collection("userStats").doc(account.uid).set(next, { merge: true });
      localStorage.setItem("commentWidget_disableAnimations", next.disableAnimations ? "true" : "false");
      localStorage.setItem(
        "commentWidget_disableTopCommentFireflies",
        next.disableTopCommentFireflies ? "true" : "false",
      );
      localStorage.setItem("userSettingsPreview", JSON.stringify(next));
      window.userStatsCache = window.userStatsCache || {};
      window.userStatsCache[account.uid] = next;
      setSettings(next);
      showNotification("Your settings have been saved.", "success");
    } catch (error) {
      console.error("User settings failed to save.", error);
      showNotification("Your settings could not be saved. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  }

  const knownRoles = new Set(roles.map(([id]) => id));
  const extraRoles = settings.gameRoles.filter((role) => !knownRoles.has(role));

  return (
    <>
      <SiteChrome showFooter={false} />
      <main className={cx(styles['settings-page'], 'route-page-background')}>
        <div className={styles['settings-shell']}>
          <header className={styles['settings-hero']}>
            <div className={styles['settings-hero-content']}>
              <div className={styles['settings-hero-badge']}>Settings</div>
              <h1>User Settings</h1>
              <p>Customize your profile, badges, and comment appearance.</p>
            </div>
            {status === "ready" && (
              <div className={styles['settings-level-pill']}>
                <span className={styles['settings-level-label']}>Level</span>
                <span className={styles['settings-level-value']}>{userLevel}</span>
              </div>
            )}
          </header>

          {status === "loading" && (
            <div className={styles['settings-state-card']}>
              <div className={styles['settings-spinner']} />
              <p>Checking your account...</p>
            </div>
          )}
          {status === "guest" && (
            <div className={styles['settings-state-card']}>
              <p>Log in using the Account button to manage your settings.</p>
            </div>
          )}
          {status === "error" && (
            <div className={cx(styles['settings-state-card'], styles['settings-state-error'])} role="alert">
              <p>{message}</p>
            </div>
          )}

          {status === "ready" && (
            <form onSubmit={saveSettings} className={styles['settings-form']}>
              <div className={styles['settings-layout']}>
                <nav className={styles['settings-nav']} aria-label="Settings sections">
                  <div className={styles['settings-nav-inner']}>
                    {settingsSections.map(([id, label, icon]) => (
                      <button
                        type="button"
                        key={id}
                        className={cx(styles['settings-nav-item'], activeSection === id && styles['is-active'])}
                        aria-current={activeSection === id ? "page" : undefined}
                        onClick={() => {
                          setActiveSection(id);
                          settingsContentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        <span className={styles['settings-nav-icon']}>{icon}</span>
                        <span className={styles['settings-nav-label']}>{label}</span>
                      </button>
                    ))}
                  </div>
                </nav>

                <div className={styles['settings-main']}>
                  <div className={styles['settings-content']} ref={settingsContentRef}>
                    {/* PROFILE */}
                    <section className={styles['settings-section']} hidden={activeSection !== "profile"}>
                      <div className={styles['settings-section-header']}>
                        <h2>Profile</h2>
                        <p>Your public identity across comments and lists.</p>
                      </div>

                      <div className={styles['settings-card']}>
                        <div className={styles['settings-avatar-block']}>
                          <div className={styles['settings-avatar-preview-wrap']}>
                            <img
                              className={styles['settings-avatar-img']}
                              src={settings.avatar || anonymousAvatar}
                              alt="Avatar preview"
                            />
                            {settings.customAvatarFrame && (
                              <img
                                className={styles['settings-avatar-frame-overlay']}
                                src={settings.customAvatarFrame}
                                alt=""
                              />
                            )}
                          </div>
                          <div className={styles['settings-avatar-actions']}>
                            <label className={cx(styles['settings-btn'], styles['settings-btn-secondary'])}>
                              <span>Upload Avatar</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => void selectAvatar(e.target.files?.[0])}
                              />
                            </label>
                            <p className={styles['settings-hint-sm']}>Max 512 KB · JPG/PNG/WebP</p>
                            {avatarError && (
                              <p className={styles['settings-error-text']} role="alert">{avatarError}</p>
                            )}
                          </div>
                        </div>

                        <div className={styles['settings-fields-grid']}>
                          <div className={styles['settings-field']}>
                            <label htmlFor="settings-display-name">Display Name</label>
                            <input
                              id="settings-display-name"
                              type="text"
                              value={settings.displayName}
                              maxLength={50}
                              onChange={(e) => update("displayName", e.target.value)}
                              placeholder="Name shown in comments..."
                            />
                          </div>

                          <div className={styles['settings-field']}>
                            <label htmlFor="settings-username">
                              Username <span className={styles['settings-muted']}>(@handle)</span>
                            </label>
                            <input
                              id="settings-username"
                              type="text"
                              value={settings.username}
                              maxLength={30}
                              onChange={(e) => update("username", e.target.value)}
                              placeholder="username"
                            />
                          </div>

                          <div className={cx(styles['settings-field'], styles['settings-field-full'])}>
                            <label htmlFor="settings-bio-link">
                              Bio Link <span className={styles['settings-muted']}>(optional)</span>
                            </label>
                            <input
                              id="settings-bio-link"
                              type="text"
                              inputMode="url"
                              value={settings.bioLink}
                              maxLength={2048}
                              onChange={(e) => update("bioLink", e.target.value)}
                              placeholder="https://example.com"
                            />
                            <p className={styles['settings-hint-sm']}>
                              Domains without a scheme automatically use HTTPS.
                            </p>
                          </div>

                          <div className={cx(styles['settings-field'], styles['settings-field-full'])}>
                            <label htmlFor="settings-bio">
                              Bio <span className={styles['settings-muted']}>(max 160)</span>
                            </label>
                            <textarea
                              id="settings-bio"
                              value={settings.bio}
                              maxLength={160}
                              onChange={(e) => update("bio", e.target.value)}
                              placeholder="Describe yourself..."
                              rows={3}
                            />
                            <div className={styles['settings-char-count']}>
                              {settings.bio.length}/160
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* PERFORMANCE */}
                    <section className={styles['settings-section']} hidden={activeSection !== "performance"}>
                      <div className={styles['settings-section-header']}>
                        <h2>Performance</h2>
                        <p>Reduce motion for faster comment loading.</p>
                      </div>
                      <div className={styles['settings-card']}>
                        <label className={styles['settings-toggle-row']}>
                          <div className={styles['settings-toggle-info']}>
                            <strong>Disable All Animations</strong>
                            <span>Comments load faster and feel lighter.</span>
                          </div>
                          <div className={styles['settings-toggle']}>
                            <input
                              type="checkbox"
                              checked={settings.disableAnimations}
                              onChange={(e) => update("disableAnimations", e.target.checked)}
                            />
                            <span className={styles['settings-toggle-track']} />
                          </div>
                        </label>
                        <label className={cx(
                          styles['settings-toggle-row'],
                          topCommenterAccess !== "allowed" && styles['settings-toggle-row-locked'],
                        )}>
                          <div className={styles['settings-toggle-info']}>
                            <strong>Disable Top Commenter Fireflies</strong>
                            <span>
                              {topCommenterAccess === "allowed"
                                ? "Hide the rank-colored particles on Top 6 commenters' comments."
                                : topCommenterAccess === "checking"
                                  ? "Checking Top 6 commenter eligibility..."
                                  : topCommenterAccess === "error"
                                    ? "Top commenter status could not be verified; this setting is locked."
                                    : "Only users in the Top 6 commenters can change this setting."}
                            </span>
                          </div>
                          <div className={styles['settings-toggle']}>
                            <input
                              type="checkbox"
                              checked={settings.disableTopCommentFireflies}
                              disabled={topCommenterAccess !== "allowed"}
                              onChange={(e) => update("disableTopCommentFireflies", e.target.checked)}
                            />
                            <span className={styles['settings-toggle-track']} />
                          </div>
                        </label>
                      </div>
                    </section>

                    {/* CUSTOM BADGES */}
                    <section className={styles['settings-section']} hidden={activeSection !== "custom-badges"}>
                      <div className={styles['settings-section-header']}>
                        <h2>Custom Badges</h2>
                        <p>
                          {badgeLimit > 1
                            ? "LV 110+ — select up to 2 badges."
                            : "Choose 1 badge. Reach LV 110 for a second slot."}
                        </p>
                      </div>
                      <div className={styles['settings-card']}>
                        <div className={styles['settings-badge-grid']}>
                          {(allBadgesExpanded ? badges : badges.slice(0, 20)).map(([id, name]) => {
                            const selected = id
                              ? settings.customBadges.includes(id)
                              : settings.customBadges.length === 0;
                            return (
                              <button
                                type="button"
                                key={id || "none"}
                                className={cx(styles['settings-badge-chip'], `badge-${id || 'none'}`, selected && styles['is-selected'])}
                                aria-pressed={selected}
                                onClick={() => toggleBadge(id)}
                              >
                                {name}
                              </button>
                            );
                          })}
                          {settings.customBadges
                            .filter((selected) => !badges.some(([id]) => id === selected))
                            .map((selected) => (
                              <button
                                type="button"
                                key={selected}
                                className={cx(styles['settings-badge-chip'], styles['is-selected'])}
                                aria-pressed={true}
                                onClick={() => toggleBadge(selected)}
                              >
                                {selected}
                              </button>
                            ))}
                        </div>
                        <button
                          type="button"
                          className={cx(styles['settings-btn'], styles['settings-btn-ghost'], styles['settings-expand-btn'])}
                          onClick={() => setAllBadgesExpanded((v) => !v)}
                        >
                          {allBadgesExpanded ? "Show fewer badges" : "Show all badges"}
                        </button>
                      </div>
                    </section>

                    {/* GAME ROLES */}
                    <section className={styles['settings-section']} hidden={activeSection !== "game-roles"}>
                      <div className={styles['settings-section-header']}>
                        <h2>Game Player Roles</h2>
                        <p>Multiple selections allowed.</p>
                      </div>
                      <div className={styles['settings-card']}>
                        <div className={styles['settings-role-grid']}>
                          {roles.map(([id, name]) => (
                            <label key={id} className={styles['settings-role-item']}>
                              <input
                                type="checkbox"
                                checked={settings.gameRoles.includes(id)}
                                onChange={() => toggleRole(id)}
                              />
                              <span>{name}</span>
                            </label>
                          ))}
                          {extraRoles.map((role) => (
                            <label key={role} className={styles['settings-role-item']}>
                              <input
                                type="checkbox"
                                checked
                                onChange={() => toggleRole(role)}
                              />
                              <span>{role}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </section>

                    {/* AVATAR FRAME */}
                    <section className={styles['settings-section']} hidden={activeSection !== "avatar-frame"}>
                      <div className={styles['settings-section-header']}>
                        <h2>Avatar Frame</h2>
                        <p>Pick a decorative frame for your avatar.</p>
                      </div>
                      <div className={styles['settings-card']}>
                        <div className={styles['settings-frame-grid']}>
                          <button
                            type="button"
                            className={cx(styles['settings-frame-item'], (!settings.customAvatarFrame ? styles['is-selected'] : undefined))}
                            onClick={() => update("customAvatarFrame", "")}
                          >
                            <span className={styles['settings-frame-none']}>None</span>
                          </button>
                          {Array.from({ length: 30 }, (_, index) => {
                            const url = `/assets/hakoroku/avatar-frames/${index + 1}.png`;
                            return (
                              <button
                                type="button"
                                key={url}
                                title={`Frame ${index + 1}`}
                                className={cx(styles['settings-frame-item'], (settings.customAvatarFrame === url ? styles['is-selected'] : undefined))}
                                onClick={() => update("customAvatarFrame", url)}
                              >
                                <img src={url} alt="" loading="lazy" />
                                <span>#{index + 1}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </section>

                    {/* FONT STYLE */}
                    <section className={styles['settings-section']} hidden={activeSection !== "font-style"}>
                      <div className={styles['settings-section-header']}>
                        <h2>Font Style</h2>
                        <p>Choose how your comments look.</p>
                      </div>
                      <div className={styles['settings-card']}>
                        <div className={styles['settings-choice-grid']}>
                          {fonts.map(([id, name, preview]) => (
                            <button
                              type="button"
                              key={id || "default"}
                              className={cx(styles['settings-choice-item'], settings.customFontStyle === (id ? `font-${id}` : "") && styles['is-selected'])}
                              onClick={() => update("customFontStyle", id ? `font-${id}` : "")}
                            >
                              <small>{name}</small>
                              <span className={id ? `font-${id}` : undefined}>{preview}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </section>

                    {/* BORDER EFFECT */}
                    <section className={styles['settings-section']} hidden={activeSection !== "border-effect"}>
                      <div className={styles['settings-section-header']}>
                        <h2>Visual Border Effect</h2>
                        <p>Animated borders for your comments.</p>
                      </div>
                      <div className={styles['settings-card']}>
                        <div className={styles['settings-choice-grid']}>
                          {borders.map(([id, name]) => {
                            const selected = settings.customBorder === (id ? `border-${id}` : "");
                            return (
                              <button
                                type="button"
                                key={id || "default"}
                                className={cx(styles['settings-choice-item'], styles['settings-border-preview'], id && `border-${id}`, selected && styles['is-selected'])}
                                aria-pressed={selected}
                                onClick={() => update("customBorder", id ? `border-${id}` : "")}
                              >
                                {name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </section>

                    {/* BORDER SHAPE */}
                    <section className={styles['settings-section']} hidden={activeSection !== "border-shape"}>
                      <div className={styles['settings-section-header']}>
                        <h2>Border Shape</h2>
                        <p>Shape the outline of your comments.</p>
                      </div>
                      <div className={styles['settings-card']}>
                        <div className={styles['settings-choice-grid']}>
                          {shapes.map(([id, name]) => (
                            <button
                              type="button"
                              key={id || "default"}
                              className={cx(styles['settings-choice-item'], styles['settings-shape-preview'], id && `shape-${id}`, settings.customShape === (id ? `shape-${id}` : "") && styles['is-selected'])}
                              onClick={() => update("customShape", id ? `shape-${id}` : "")}
                            >
                              {name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </section>

                    {/* COMMENT BACKGROUND */}
                    <section className={styles['settings-section']} hidden={activeSection !== "comment-background"}>
                      <div className={styles['settings-section-header']}>
                        <h2>
                          Comment Background{" "}
                          <span className={styles['settings-premium-tag']}>Lv 110+</span>
                        </h2>
                        <p>
                          {userLevel < 110
                            ? `Locked — reach level 110. Current level: ${userLevel}.`
                            : "Choose a background for your comments."}
                        </p>
                      </div>
                      <div className={styles['settings-card']}>
                        <div className={cx(styles['settings-bg-grid'], (userLevel < 110 ? styles['is-locked'] : undefined))}>
                          <button
                            type="button"
                            className={cx(styles['settings-bg-item'], styles['settings-bg-default'], (!settings.customCommentBg ? styles['is-selected'] : undefined))}
                            disabled={userLevel < 110}
                            onClick={() => update("customCommentBg", "")}
                          >
                            <span>Default</span>
                          </button>
                          {Array.from({ length: 8 }, (_, index) => {
                            const url = `/assets/hakoroku/backgrounds/${index + 1}.jpg`;
                            return (
                              <button
                                type="button"
                                key={url}
                                className={cx(styles['settings-bg-item'], (settings.customCommentBg === url ? styles['is-selected'] : undefined))}
                                disabled={userLevel < 110}
                                style={{ backgroundImage: `url("${url}")` }}
                                onClick={() => update("customCommentBg", url)}
                              >
                                <span>BG {index + 1}</span>
                              </button>
                            );
                          })}
                          {userLevel >= 120 && (
                            <label
                              className={cx(styles['settings-bg-item'], styles['settings-bg-upload'], (settings.customCommentBg && !settings.customCommentBg.startsWith("/assets/hakoroku/backgrounds/") ? styles['is-selected'] : undefined), (customBgUploading ? styles['is-uploading'] : undefined))}
                              style={
                                settings.customCommentBg &&
                                !settings.customCommentBg.startsWith("/assets/hakoroku/backgrounds/")
                                  ? { backgroundImage: `url("${settings.customCommentBg}")` }
                                  : undefined
                              }
                            >
                              <input
                                type="file"
                                accept="image/*"
                                disabled={customBgUploading}
                                onChange={(e) =>
                                  void uploadCustomCommentBg(e.currentTarget.files?.[0], e.currentTarget)
                                }
                              />
                              <span>{customBgUploading ? "Uploading…" : "Upload Custom"}</span>
                            </label>
                          )}
                        </div>

                        {userLevel >= 120 ? (
                          <p className={styles['settings-hint-sm']}>
                            Level 120+ · Images are resized ≤1600px and compressed to WebP.
                          </p>
                        ) : (
                          <p className={styles['settings-hint-sm']}>
                            Custom uploads unlock at level 120. Current level: {userLevel}.
                          </p>
                        )}

                        {customBgError && (
                          <p className={styles['settings-error-text']} role="alert">{customBgError}</p>
                        )}

                        {settings.customCommentBg && userLevel >= 110 && (
                          <div className={styles['settings-bg-preview']}>
                            <img src={settings.customCommentBg} alt="Selected background preview" />
                            <button
                              type="button"
                              className={cx(styles['settings-btn'], styles['settings-btn-danger'])}
                              disabled={userLevel < 110 || customBgUploading}
                              onClick={() => update("customCommentBg", "")}
                            >
                              Reset Background
                            </button>
                          </div>
                        )}
                      </div>
                    </section>
                  </div>

                  <div className={styles['settings-footer-actions']}>
                    <button
                      className={cx(styles['settings-btn'], styles['settings-btn-primary'])}
                      type="submit"
                      disabled={saving || customBgUploading}
                    >
                      {saving
                        ? "Saving…"
                        : customBgUploading
                          ? "Uploading Background…"
                          : "Save Settings"}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        {message && status === "ready" && (
          <div
            className={cx(styles['settings-toast'], styles[`settings-toast-${messageType}`])}
            role={messageType === "error" ? "alert" : "status"}
            aria-live={messageType === "error" ? "assertive" : "polite"}
          >
            <span>{message}</span>
            <button type="button" aria-label="Dismiss" onClick={() => setMessage("")}>
              ×
            </button>
          </div>
        )}
      </main>
      <SiteChrome showChrome={false} />
    </>
  );
}
