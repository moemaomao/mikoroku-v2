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
import { hasAdminPanelAccess } from "../lib/admin-access";
import { normalizeProfileLink } from "../lib/profile-link";
import { cacheUserStatsProfile } from "../../lib/user-stats-cache";
import {
  clearPendingCommentBackground,
  COMMENT_BACKGROUND_SYNCED_EVENT,
  getPendingCommentBackground,
  MAX_COMMENT_BACKGROUND_FILE_SIZE,
  queueCommentBackground,
} from "../../lib/comment-background-sync";
import styles from "./settings.module.css";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function getReadingChapterCount(data: unknown): number {
  if (!data || typeof data !== "object") return 0;
  const record = data as { readingStats?: unknown; totalChaptersRead?: unknown };
  const readingStats = record.readingStats && typeof record.readingStats === "object"
    ? record.readingStats as { totalChaptersRead?: unknown }
    : null;
  const total = readingStats?.totalChaptersRead ?? record.totalChaptersRead;
  return typeof total === "number" && Number.isFinite(total) ? Math.max(0, total) : 0;
}

function getCommentCount(data: unknown): number {
  if (!data || typeof data !== "object") return 0;
  const count = (data as { commentCount?: unknown }).commentCount;
  return typeof count === "number" && Number.isFinite(count) ? Math.max(0, count) : 0;
}

function normalizeAchievementBadges(value: unknown, chaptersRead: number, commentCount: number): string[] {
  if (!Array.isArray(value)) return [];
  const selectedIds = new Set(value.filter((id): id is string => typeof id === "string"));
  const readingBadge = readingMedals.find(
    (medal) => selectedIds.has(medal.id) && chaptersRead >= medal.chapters,
  )?.id;
  const commentBadge = commentMedals.find(
    (medal) => selectedIds.has(medal.id) && commentCount >= medal.comments,
  )?.id;
  const normalized: string[] = [];
  if (readingBadge) normalized.push(readingBadge);
  if (commentBadge) normalized.push(commentBadge);
  return normalized;
}


type Settings = {
  displayName: string;
  username: string;
  bio: string;
  bioLink: string;
  avatar: string;
  customBadge: string;
  customBadges: string[];
  achievementBadges: string[];
  customAvatarFrame: string;
  customFontStyle: string;
  customBorder: string;
  customShape: string;
  customCommentBg: string;
  gameRoles: string[];
  topCommenterEffect: "fireflies" | "firework" | "snow";
  disableAnimations: boolean;
  disableTopCommentFireflies: boolean;
};

type Account = {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
};

const anonymousAvatar = "https://ui-avatars.com/api/?name=User&background=7c3aed&color=fff";
function normalizeTopCommenterEffect(value: unknown): Settings["topCommenterEffect"] {
  return value === "firework" || value === "snow" ? value : "fireflies";
}

function getTopCommenterEffectName(effect: Settings["topCommenterEffect"]) {
  if (effect === "fireflies") return "Fireflies";
  if (effect === "firework") return "Firework";
  return "Snow";
}

function FireworkPreviewCanvas({ active, className }: { active: boolean; className: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !active) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) return;

    type Dot = {
      px: number;
      py: number;
      vx: number;
      vy: number;
      angle: number;
      life: number;
      color: string;
      dead: boolean;
    };
    type Flock = { x: number; y: number; dots: Dot[] };
    const flocks: Flock[] = [];
    const burstDelays = [400, 700, 2000];
    const colors = ["white", "#ffd166", "#ff5f6d", "#74b9ff", "#c77dff", "#4de0c1", "#ff9f1c"];
    let width = 0;
    let height = 0;
    let dpr = 1;
    let startedAt = 0;
    let lastFrameAt = 0;
    let nextBurst = 0;
    let animationFrame = 0;
    let visible = typeof IntersectionObserver === "undefined";
    let initialized = false;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const nextWidth = bounds.width;
      const nextHeight = bounds.height;
      const nextDpr = Math.min(window.devicePixelRatio || 1, 2);
      if (!nextWidth || !nextHeight) return;
      if (nextWidth === width && nextHeight === height && nextDpr === dpr) return;

      width = nextWidth;
      height = nextHeight;
      dpr = nextDpr;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const createFlock = (): Flock => ({
      x: width * Math.random(),
      y: height * Math.random(),
      dots: Array.from({ length: 150 }, (): Dot => ({
        px: 0,
        py: 0,
        vx: Math.random() * 4,
        vy: Math.random() * 4,
        angle: Math.random() * Math.PI * 2,
        life: 0.5 + Math.random(),
        color: Math.random() > 0.3 ? colors[1 + Math.floor(Math.random() * (colors.length - 1))] : colors[0],
        dead: false,
      })),
    });

    const schedule = () => {
      if (!animationFrame && visible && !document.hidden && !reducedMotion.matches) {
        animationFrame = window.requestAnimationFrame(draw);
      }
    };

    const draw = (timestamp: number) => {
      animationFrame = 0;
      if (!visible || document.hidden || reducedMotion.matches) return;

      resize();
      if (!width || !height) return;
      if (!initialized) {
        startedAt = timestamp;
        lastFrameAt = timestamp;
        flocks.push(createFlock());
        initialized = true;
      }

      const delta = Math.min(2, Math.max(0.5, (timestamp - lastFrameAt) / 16.67));
      lastFrameAt = timestamp;
      context.clearRect(0, 0, width, height);

      while (nextBurst < burstDelays.length && timestamp - startedAt >= burstDelays[nextBurst]) {
        flocks.push(createFlock());
        nextBurst += 1;
      }

      for (let flockIndex = 0; flockIndex < flocks.length; flockIndex += 1) {
        const flock = flocks[flockIndex];
        let allDead = true;
        for (const dot of flock.dots) {
          if (dot.dead) continue;

          dot.px += dot.vx * Math.cos(dot.angle) * delta;
          dot.py += dot.vy * Math.sin(dot.angle) * delta;
          dot.vx *= Math.pow(0.98, delta);
          dot.vy = dot.vy * Math.pow(0.98, delta) + (dot.angle > Math.PI ? -0.025 : 0.02) * delta;
          dot.life -= 0.009 * delta;
          if (dot.life < 0) {
            dot.dead = true;
            continue;
          }

          allDead = false;
          if (Math.random() > 0.95) continue;
          context.globalAlpha = Math.min(1, dot.life);
          context.fillStyle = dot.color;
          context.shadowColor = dot.color;
          context.shadowBlur = 10;
          context.beginPath();
          context.arc(flock.x + dot.px, flock.y + dot.py, Math.max(0.35, 0.55 + 1.1 * dot.life - dot.vy * 0.03), 0, Math.PI * 2);
          context.fill();
        }

        if (allDead) flocks[flockIndex] = createFlock();
      }

      context.globalAlpha = 1;
      context.shadowBlur = 0;
      schedule();
    };

    const visibilityObserver = typeof IntersectionObserver === "undefined"
      ? null
      : new IntersectionObserver((entries) => {
          visible = entries.some((entry) => entry.isIntersecting);
          schedule();
        });
    const resizeObserver = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(() => {
          resize();
          schedule();
        });
    const onVisibilityChange = () => schedule();
    const onMotionChange = () => schedule();

    visibilityObserver?.observe(canvas);
    resizeObserver?.observe(canvas);
    document.addEventListener("visibilitychange", onVisibilityChange);
    reducedMotion.addEventListener("change", onMotionChange);
    if (visible) schedule();

    return () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      visibilityObserver?.disconnect();
      resizeObserver?.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      reducedMotion.removeEventListener("change", onMotionChange);
    };
  }, [active]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}

function SnowPreview({ active, className }: { active: boolean; className: string }) {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer || !active) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = true;

    const updateSnowDistance = () => {
      layer.style.setProperty("--settings-snow-fall-y", `${Math.max(layer.clientHeight, 100) + 100}px`);
    };

    const syncAnimation = () => {
      const shouldRun = visible && !document.hidden && !reducedMotion.matches;
      layer.classList.toggle("is-paused", !shouldRun);
    };

    const visibilityObserver = typeof IntersectionObserver === "undefined"
      ? null
      : new IntersectionObserver((entries) => {
          visible = entries.some((entry) => entry.isIntersecting);
          syncAnimation();
        });
    const resizeObserver = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(updateSnowDistance);
    const onVisibilityChange = () => syncAnimation();
    const onMotionChange = () => syncAnimation();

    updateSnowDistance();
    visibilityObserver?.observe(layer);
    resizeObserver?.observe(layer);
    document.addEventListener("visibilitychange", onVisibilityChange);
    reducedMotion.addEventListener("change", onMotionChange);
    syncAnimation();

    return () => {
      visibilityObserver?.disconnect();
      resizeObserver?.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      reducedMotion.removeEventListener("change", onMotionChange);
    };
  }, [active]);

  return (
    <div ref={layerRef} className={cx(className, "is-paused")} aria-hidden="true">
      {active
        ? Array.from({ length: 20 }, (_, index) => (
            <span key={index} className={styles["settings-snowflake"]} />
          ))
        : null}
    </div>
  );
}

const readingMedals = [
  { id: "medal-first-spark", name: "First Spark", chapters: 10, image: "/assets/medals/1.webp", gradient: "linear-gradient(135deg, #fef3c7 0%, #fde68a 40%, #f59e0b 100%)", textColor: "#422006" },
  { id: "medal-page-scout", name: "Page Scout", chapters: 25, image: "/assets/medals/2.webp", gradient: "linear-gradient(135deg, #e2e8f0 0%, #94a3b8 45%, #64748b 100%)", textColor: "#0f172a" },
  { id: "medal-story-seeker", name: "Story Seeker", chapters: 50, image: "/assets/medals/3.webp", gradient: "linear-gradient(135deg, #ffedd5 0%, #fdba74 40%, #ea580c 100%)", textColor: "#431407" },
  { id: "medal-chapter-champion", name: "Chapter Champion", chapters: 100, image: "/assets/medals/4.webp", gradient: "linear-gradient(135deg, #ede9fe 0%, #a78bfa 40%, #7c3aed 100%)", textColor: "#fff" },
  { id: "medal-lore-keeper", name: "Lore Keeper", chapters: 250, image: "/assets/medals/5.webp", gradient: "linear-gradient(135deg, #dcfce7 0%, #86efac 40%, #16a34a 100%)", textColor: "#052e16" },
  { id: "medal-story-sage", name: "Story Sage", chapters: 500, image: "/assets/medals/6.webp", gradient: "linear-gradient(135deg, #fae8ff 0%, #e879f9 35%, #c026d3 70%, #86198f 100%)", textColor: "#fff" },
  { id: "medal-eternal-reader", name: "Eternal Reader", chapters: 1000, image: "/assets/medals/7.webp", gradient: "linear-gradient(135deg, #fef3c7 0%, #fbbf24 30%, #f59e0b 55%, #ea580c 80%, #c2410c 100%)", textColor: "#431407" },
  { id: "medal-infinity-archive", name: "Infinity Archive", chapters: 1500, image: "/assets/medals/8.webp", gradient: "linear-gradient(135deg, #a5f3fc 0%, #22d3ee 20%, #a78bfa 45%, #f472b6 70%, #fbbf24 100%)", textColor: "#164e63" },
] as const;
const commentMedals = [
  { id: "comment-medal-first-voice", name: "First Voice", comments: 10, image: "/assets/comment-medals/1.webp", gradient: "linear-gradient(135deg, #fef3c7 0%, #fde68a 40%, #f59e0b 100%)", textColor: "#422006" },
  { id: "comment-medal-conversation-starter", name: "Conversation Starter", comments: 25, image: "/assets/comment-medals/2.webp", gradient: "linear-gradient(135deg, #e2e8f0 0%, #94a3b8 45%, #64748b 100%)", textColor: "#0f172a" },
  { id: "comment-medal-regular-voice", name: "Regular Voice", comments: 50, image: "/assets/comment-medals/3.webp", gradient: "linear-gradient(135deg, #ffedd5 0%, #fdba74 40%, #ea580c 100%)", textColor: "#431407" },
  { id: "comment-medal-discussion-champion", name: "Discussion Champion", comments: 100, image: "/assets/comment-medals/4.webp", gradient: "linear-gradient(135deg, #ede9fe 0%, #a78bfa 40%, #7c3aed 100%)", textColor: "#fff" },
  { id: "comment-medal-community-voice", name: "Community Voice", comments: 250, image: "/assets/comment-medals/5.webp", gradient: "linear-gradient(135deg, #dcfce7 0%, #86efac 40%, #16a34a 100%)", textColor: "#052e16" },
  { id: "comment-medal-comment-sage", name: "Comment Sage", comments: 500, image: "/assets/comment-medals/6.webp", gradient: "linear-gradient(135deg, #fae8ff 0%, #e879f9 35%, #c026d3 70%, #86198f 100%)", textColor: "#fff" },
  { id: "comment-medal-community-legend", name: "Community Legend", comments: 1000, image: "/assets/comment-medals/7.webp", gradient: "linear-gradient(135deg, #fef3c7 0%, #fbbf24 30%, #f59e0b 55%, #ea580c 80%, #c2410c 100%)", textColor: "#431407" },
  { id: "comment-medal-infinite-conversationalist", name: "Infinite Conversationalist", comments: 1500, image: "/assets/comment-medals/8.webp", gradient: "linear-gradient(135deg, #a5f3fc 0%, #22d3ee 20%, #a78bfa 45%, #f472b6 70%, #fbbf24 100%)", textColor: "#164e63" },
] as const;
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

const COMMENT_LEADERBOARD_CACHE_KEY = "mikoroku:comment-leaderboard-top-users:v1";
const COMMENT_LEADERBOARD_CACHE_TTL_MS = 5 * 60 * 1000;

function getCommentFirestore() {
  const app = getApps().find((candidate) => candidate.name === "mikoroku-leaderboard") ??
    initializeApp(commentFirebaseConfig, "mikoroku-leaderboard");
  return getFirestore(app);
}

function getCachedTopCommenterRank(uid: string): number | null | undefined {
  try {
    const raw = localStorage.getItem(COMMENT_LEADERBOARD_CACHE_KEY);
    if (!raw) return undefined;
    const cache = JSON.parse(raw) as { updatedAt?: unknown; users?: unknown };
    if (
      typeof cache.updatedAt !== "number" ||
      Date.now() - cache.updatedAt > COMMENT_LEADERBOARD_CACHE_TTL_MS ||
      !Array.isArray(cache.users) ||
      !cache.users.every((userId) => typeof userId === "string")
    ) return undefined;

    const index = cache.users.indexOf(uid);
    return index >= 0 && index < 6 ? index + 1 : null;
  } catch (error) {
    console.warn("Cached commenter eligibility could not be read.", error);
    return undefined;
  }
}

async function getTopCommenterRank(uid: string): Promise<number | null> {
  const firestore = getCommentFirestore();
  let visibleRank = 0;
  let lastDocument: QueryDocumentSnapshot | undefined;

  while (true) {
    const leaderboardQuery = query(
      collection(firestore, "userStats"),
      orderBy("commentCount", "desc"),
      ...(lastDocument ? [startAfter(lastDocument)] : []),
      limit(10),
    );
    const snapshot = await getDocs(leaderboardQuery);
    for (const userDocument of snapshot.docs) {
      if (userDocument.data().leaderboardHidden === true) continue;
      visibleRank += 1;
      if (userDocument.id === uid) return visibleRank <= 6 ? visibleRank : null;
      if (visibleRank >= 6) return null;
    }

    if (snapshot.empty) return null;
    lastDocument = snapshot.docs.at(-1);
    if (!lastDocument) return null;
  }
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
  ["profile", "Profile"],
  ["achievements", "Achievement"],
  ["performance", "Performance"],
  ["custom-badges", "Custom Badges"],
  ["game-roles", "Game Roles"],
  ["avatar-frame", "Avatar Frame"],
  ["font-style", "Font Style"],
  ["border-effect", "Border Effect"],
  ["border-shape", "Border Shape"],
  ["comment-background", "Comment BG"],
] as const;
type SettingsSection = (typeof settingsSections)[number][0];

function SettingsSectionIcon({ section }: { section: SettingsSection }) {
  const commonProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  switch (section) {
    case "profile":
      return <svg {...commonProps}><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.7-3.5 3.2-5.3 7-5.3s6.3 1.8 7 5.3" /></svg>;
    case "achievements":
      return <svg {...commonProps}><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" /><path d="M8 6H5v2a4 4 0 0 0 4 4m7-6h3v2a4 4 0 0 1-4 4m-3 1v4m-4 3h8m-7-3h6" /></svg>;
    case "performance":
      return <svg {...commonProps}><path d="m13 2-9 12h7l-1 8 10-13h-7l1-7Z" /></svg>;
    case "custom-badges":
      return <svg {...commonProps}><circle cx="12" cy="9" r="5.5" /><path d="m8.5 13.2-1 8 4.5-2.7 4.5 2.7-1-8" /><path d="m10 9 1.3 1.3L14.5 7" /></svg>;
    case "game-roles":
      return <svg {...commonProps}><path d="M7.5 8h9a4 4 0 0 1 3.8 2.8l1.1 4a2.3 2.3 0 0 1-3.8 2.3l-2.2-2H8.6l-2.2 2a2.3 2.3 0 0 1-3.8-2.3l1.1-4A4 4 0 0 1 7.5 8Z" /><path d="M8 10.5v4m-2-2h4m6-1h.01M18 14h.01" /></svg>;
    case "avatar-frame":
      return <svg {...commonProps}><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></svg>;
    case "font-style":
      return <svg {...commonProps}><path d="M4 19 10 5h4l6 14M7 13h10M12 5v14" /></svg>;
    case "border-effect":
      return <svg {...commonProps}><path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Z" /><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" /></svg>;
    case "border-shape":
      return <svg {...commonProps}><path d="m12 2 9 5v10l-9 5-9-5V7l9-5Z" /></svg>;
    case "comment-background":
      return <svg {...commonProps}><path d="M12 3H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2v4l5-4h7a2 2 0 0 0 2-2V9" /><circle cx="16" cy="5" r="2" /><circle cx="20" cy="7" r="2" /><circle cx="18" cy="11" r="2" /></svg>;
  }
}

const initialSettings: Settings = {
  displayName: "",
  username: "",
  bio: "",
  bioLink: "",
  avatar: "",
  customBadge: "",
  customBadges: [],
  achievementBadges: [],
  customAvatarFrame: "",
  customFontStyle: "",
  customBorder: "",
  customShape: "",
  customCommentBg: "",
  gameRoles: [],
  topCommenterEffect: "fireflies",
  disableAnimations: false,
  disableTopCommentFireflies: false,
};

export default function SettingsPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const isAdminPreview = hasAdminPanelAccess(account);
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [status, setStatus] = useState<"loading" | "guest" | "ready" | "error">("loading");
  const [topCommenterAccess, setTopCommenterAccess] = useState<"checking" | "allowed" | "denied" | "error">("checking");
  const [topCommenterRank, setTopCommenterRank] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"info" | "success" | "error">("info");
  const [saving, setSaving] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [allBadgesExpanded, setAllBadgesExpanded] = useState(false);
  const [badgeLimit, setBadgeLimit] = useState(1);
  const [userLevel, setUserLevel] = useState(0);
  const [readingChapterCount, setReadingChapterCount] = useState(0);
  const [userCommentCount, setUserCommentCount] = useState(0);
  const [customBgError, setCustomBgError] = useState("");
  const [customBgUploading, setCustomBgUploading] = useState(false);
  const [activeSection, setActiveSection] = useState<SettingsSection>("profile");
  const settingsContentRef = useRef<HTMLDivElement>(null);
  const commentBgPreviewUrlRef = useRef("");

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    let attempts = 0;

    const applyUser = async (user: Account & { photoURL?: string | null }) => {
      setAccount(user);
      const adminPreview = hasAdminPanelAccess(user);
      if (adminPreview) {
        setTopCommenterRank(null);
        setTopCommenterAccess("allowed");
      } else {
        setTopCommenterRank(null);
        setTopCommenterAccess("checking");
      }
      let pendingCommentBgUrl = "";
      try {
        const pendingImage = await getPendingCommentBackground(user.uid);
        if (active && pendingImage) {
          pendingCommentBgUrl = URL.createObjectURL(pendingImage);
          if (commentBgPreviewUrlRef.current) {
            URL.revokeObjectURL(commentBgPreviewUrlRef.current);
          }
          commentBgPreviewUrlRef.current = pendingCommentBgUrl;
        }
      } catch (cacheError) {
        console.warn("The pending comment background could not be loaded from IndexedDB.", cacheError);
      }
      if (!active) return;
      if (!adminPreview) {
        const cachedRank = getCachedTopCommenterRank(user.uid);
        setTopCommenterRank(cachedRank ?? null);
        setTopCommenterAccess(
          cachedRank === undefined ? "checking" : cachedRank ? "allowed" : "denied",
        );
        void getTopCommenterRank(user.uid).then((rank) => {
          if (!active) return;
          setTopCommenterRank(rank);
          setTopCommenterAccess(rank ? "allowed" : "denied");
        }).catch((error: unknown) => {
          console.error("Top commenter eligibility failed to load.", error);
          if (active) {
            setTopCommenterRank(null);
            setTopCommenterAccess("error");
            showNotification("Top commenter status could not be verified. This setting stays locked.", "error");
          }
        });
      }

      try {
        const cached = localStorage.getItem("userSettingsPreview");
        if (cached) {
          const parsed = JSON.parse(cached) as Partial<Settings>;
          const cachedChapterCount = getReadingChapterCount(parsed);
          const cachedCommentCount = getCommentCount(parsed);
          setReadingChapterCount(cachedChapterCount);
          setUserCommentCount(cachedCommentCount);
          setSettings({
            ...initialSettings,
            ...parsed,
            customCommentBg: pendingCommentBgUrl || (
              String(parsed.customCommentBg || "").startsWith("blob:")
                ? ""
                : String(parsed.customCommentBg || "")
            ),
            displayName: String(parsed.displayName || user.displayName || ""),
            bioLink: String(parsed.bioLink || ""),
            avatar: String(parsed.avatar || user.photoURL || anonymousAvatar),
            customBadge: String(parsed.customBadge || parsed.customBadges?.[0] || ""),
            customBadges: normalizeBadges(parsed),
            achievementBadges: normalizeAchievementBadges(parsed.achievementBadges, cachedChapterCount, cachedCommentCount),
            gameRoles: Array.isArray(parsed.gameRoles) ? parsed.gameRoles.map(String) : [],
            topCommenterEffect: normalizeTopCommenterEffect(parsed.topCommenterEffect),
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
        const data = (snapshot.exists ? snapshot.data() || {} : {}) as Partial<Settings> & {
          commentCount?: unknown;
          readingStats?: unknown;
          totalChaptersRead?: unknown;
        };
        if (!active) return;
        const chapterCount = getReadingChapterCount(data);
        const commentCount = getCommentCount(data);
        setReadingChapterCount(chapterCount);
        setUserCommentCount(commentCount);
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
          achievementBadges: normalizeAchievementBadges(data.achievementBadges, chapterCount, commentCount),
          customAvatarFrame: String(data.customAvatarFrame || ""),
          customFontStyle: String(data.customFontStyle || ""),
          customBorder: String(data.customBorder || ""),
          customShape: String(data.customShape || ""),
          customCommentBg: pendingCommentBgUrl || String(data.customCommentBg || ""),
          gameRoles: Array.isArray(data.gameRoles) ? data.gameRoles.map(String) : [],
          topCommenterEffect: normalizeTopCommenterEffect(data.topCommenterEffect),
          disableAnimations: data.disableAnimations === true ||
            localStorage.getItem("commentWidget_disableAnimations") === "true",
          disableTopCommentFireflies: data.disableTopCommentFireflies === true ||
            localStorage.getItem("commentWidget_disableTopCommentFireflies") === "true",
        });
        setStatus("ready");
      } catch (error) {
        console.error("User settings failed to load.", error);
        if (active) {
          if (!adminPreview) setTopCommenterAccess("error");
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
          setTopCommenterRank(null);
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
        if (commentBgPreviewUrlRef.current) {
          URL.revokeObjectURL(commentBgPreviewUrlRef.current);
          commentBgPreviewUrlRef.current = "";
        }
      };
    }

    return () => {
      active = false;
      unsubscribe?.();
      if (commentBgPreviewUrlRef.current) {
        URL.revokeObjectURL(commentBgPreviewUrlRef.current);
        commentBgPreviewUrlRef.current = "";
      }
    };
  }, []);

  useEffect(() => {
    const onCommentBackgroundSynced = (event: Event) => {
      const { uid, url } = (event as CustomEvent<{ uid: string; url: string }>).detail;
      if (uid !== account?.uid || !url) return;
      const previewUrl = commentBgPreviewUrlRef.current;
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        commentBgPreviewUrlRef.current = "";
      }
      setSettings((current) => {
        if (!previewUrl || current.customCommentBg !== previewUrl) return current;
        return { ...current, customCommentBg: url };
      });
    };
    window.addEventListener(COMMENT_BACKGROUND_SYNCED_EVENT, onCommentBackgroundSynced);
    return () => window.removeEventListener(COMMENT_BACKGROUND_SYNCED_EVENT, onCommentBackgroundSynced);
  }, [account?.uid]);

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

  function selectCommentBackground(value: string) {
    if (account) {
      void clearPendingCommentBackground(account.uid).catch((error: unknown) => {
        console.error("The queued comment background could not be cleared.", error);
      });
    }
    if (commentBgPreviewUrlRef.current) {
      URL.revokeObjectURL(commentBgPreviewUrlRef.current);
      commentBgPreviewUrlRef.current = "";
    }
    update("customCommentBg", value);
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

  function toggleAchievementBadge(badgeId: string) {
    const earnedIds = new Set<string>(
      [
        ...readingMedals.filter((medal) => readingChapterCount >= medal.chapters),
        ...commentMedals.filter((medal) => userCommentCount >= medal.comments),
      ].map((medal) => medal.id),
    );
    if (!earnedIds.has(badgeId)) return;
    const isCommentMedal = commentMedals.some((medal) => medal.id === badgeId);
    const categoryIds = new Set<string>(
      (isCommentMedal ? commentMedals : readingMedals).map((medal) => medal.id),
    );
    const withoutCategory = settings.achievementBadges.filter((id) => !categoryIds.has(id));
    update(
      "achievementBadges",
      settings.achievementBadges.includes(badgeId)
        ? withoutCategory
        : [...withoutCategory, badgeId],
    );
  }

  function toggleTopCommentFireflies() {
    if (topCommenterAccess !== "allowed") return;
    update("disableTopCommentFireflies", !settings.disableTopCommentFireflies);
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
    if (!file.type.startsWith("image/")) {
      setCustomBgError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_COMMENT_BACKGROUND_FILE_SIZE) {
      setCustomBgError("Background images must be 20 MB or smaller.");
      return;
    }
    if (!account) {
      setCustomBgError("Sign in to save a custom comment background.");
      return;
    }

    setCustomBgUploading(true);
    const previousBackground = settings.customCommentBg;
    const previewUrl = URL.createObjectURL(file);
    if (commentBgPreviewUrlRef.current) {
      URL.revokeObjectURL(commentBgPreviewUrlRef.current);
    }
    commentBgPreviewUrlRef.current = previewUrl;
    update("customCommentBg", previewUrl);
    showNotification("Saving the background on this device...", "info");
    try {
      await queueCommentBackground(account.uid, file);
      showNotification("Background saved on this device. Syncing in the background.", "success");
    } catch (error) {
      console.error("Custom comment background could not be saved locally.", error);
      URL.revokeObjectURL(previewUrl);
      if (commentBgPreviewUrlRef.current === previewUrl) commentBgPreviewUrlRef.current = "";
      update("customCommentBg", previousBackground);
      setCustomBgError(error instanceof Error
        ? error.message
        : "The background image could not be saved on this device.");
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
      achievementBadges: normalizeAchievementBadges(
        settings.achievementBadges,
        readingChapterCount,
        userCommentCount,
      ),
      disableTopCommentFireflies: topCommenterAccess === "denied"
        ? false
        : settings.disableTopCommentFireflies,
      topCommenterEffect: topCommenterAccess === "denied"
        ? "fireflies"
        : settings.topCommenterEffect,
      displayName: settings.displayName.trim() || "Anonymous",
      username: sanitizedUsername,
      bio: settings.bio.trim(),
      bioLink,
    };
    const settingsToPersist: Partial<Settings> = { ...next };
    if (settingsToPersist.customCommentBg?.startsWith("blob:")) {
      delete settingsToPersist.customCommentBg;
    }
    try {
      await window.firebase.firestore().collection("userStats").doc(account.uid).set(settingsToPersist, { merge: true });
      localStorage.setItem("commentWidget_disableAnimations", next.disableAnimations ? "true" : "false");
      localStorage.setItem(
        "commentWidget_disableTopCommentFireflies",
        next.disableTopCommentFireflies ? "true" : "false",
      );
      const previewSettings: Partial<Settings> = { ...next };
      if (previewSettings.customCommentBg?.startsWith("blob:")) {
        delete previewSettings.customCommentBg;
      }
      localStorage.setItem(
        "userSettingsPreview",
        JSON.stringify({
          ...previewSettings,
          totalChaptersRead: readingChapterCount,
          commentCount: userCommentCount,
        }),
      );
      window.userStatsCache = window.userStatsCache || {};
      const currentStatsCache = window.userStatsCache[account.uid] || {};
      const cacheChapterCount = Math.max(readingChapterCount, getReadingChapterCount(currentStatsCache));
      window.userStatsCache[account.uid] = {
        ...currentStatsCache,
        ...settingsToPersist,
        totalChaptersRead: cacheChapterCount,
      };
      cacheUserStatsProfile(account.uid, window.userStatsCache[account.uid]);
      try {
        const cachedStats = localStorage.getItem("userStatsCache_v1");
        const statsCache = cachedStats ? JSON.parse(cachedStats) as Record<string, unknown> : {};
        const existing = statsCache[account.uid] && typeof statsCache[account.uid] === "object"
          ? statsCache[account.uid] as Record<string, unknown>
          : {};
        statsCache[account.uid] = {
          ...existing,
          ...settingsToPersist,
          totalChaptersRead: Math.max(readingChapterCount, getReadingChapterCount(existing)),
        };
        localStorage.setItem("userStatsCache_v1", JSON.stringify(statsCache));
      } catch (cacheError) {
        console.warn("The local comment profile cache could not be updated.", cacheError);
      }
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
  const earnedMedals = readingMedals.filter((medal) => readingChapterCount >= medal.chapters);
  const earnedCommentMedals = commentMedals.filter((medal) => userCommentCount >= medal.comments);
  const topCommenterPreviewEnabled = !settings.disableAnimations;

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
                    {settingsSections.map(([id, label]) => (
                      <button
                        type="button"
                        key={id}
                        className={cx(styles['settings-nav-item'], activeSection === id && styles['is-active'])}
                        aria-current={activeSection === id ? "page" : undefined}
                        onClick={() => {
                          setActiveSection(id);
                          if (window.matchMedia("(max-width: 860px)").matches) {
                            window.requestAnimationFrame(() => {
                              settingsContentRef.current?.scrollIntoView({
                                behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
                                  ? "auto"
                                  : "smooth",
                                block: "start",
                              });
                            });
                            return;
                          }
                          settingsContentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        <span className={styles['settings-nav-icon']}><SettingsSectionIcon section={id} /></span>
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

                    {/* ACHIEVEMENTS */}
                    <section className={styles['settings-section']} hidden={activeSection !== "achievements"}>
                      <div className={styles['settings-section-header']}>
                        <h2>Achievement</h2>
                        <p>Choose one earned Reading Medal and one earned Comment Medal to display on your comments.</p>
                      </div>
                      <div className={styles['settings-card']}>
                        <p className={styles['settings-hint-sm']}>
                          {earnedMedals.length} of {readingMedals.length} Reading Medals earned · {readingChapterCount.toLocaleString()} chapters read
                        </p>
                        {earnedMedals.length > 0 ? (
                          <div className={cx(styles['settings-badge-grid'], styles['settings-achievement-grid'])}>
                            {earnedMedals.map((medal) => {
                              const shown = settings.achievementBadges.includes(medal.id);
                              return (
                                <button
                                  type="button"
                                  key={medal.id}
                                  className={cx(
                                    styles['settings-badge-chip'],
                                    styles['settings-achievement-item'],
                                    shown && styles['is-selected'],
                                  )}
                                  style={{
                                    background: shown ? medal.gradient : undefined,
                                    color: shown ? medal.textColor : undefined,
                                  }}
                                  aria-pressed={shown}
                                  aria-label={`${shown ? "Hide" : "Show"} ${medal.name} on comments`}
                                  onClick={() => toggleAchievementBadge(medal.id)}
                                >
                                  <img src={medal.image} alt="" />
                                  <span className={styles['settings-achievement-name']}>{medal.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <p className={styles['settings-empty-state']}>
                            No Reading Medals earned yet. Read at least 10 chapters to unlock your first medal.
                          </p>
                        )}
                        <p className={cx(styles['settings-hint-sm'], styles['settings-achievement-heading'])}>
                          {earnedCommentMedals.length} of {commentMedals.length} Comment Medals earned · {userCommentCount.toLocaleString()} comments
                        </p>
                        {earnedCommentMedals.length > 0 ? (
                          <div className={cx(styles['settings-badge-grid'], styles['settings-achievement-grid'])}>
                            {earnedCommentMedals.map((medal) => {
                              const selected = settings.achievementBadges.includes(medal.id);
                              return (
                                <button
                                  type="button"
                                  key={medal.id}
                                  className={cx(
                                    styles['settings-badge-chip'],
                                    styles['settings-achievement-item'],
                                    selected && styles['is-selected'],
                                  )}
                                  style={{
                                    background: selected ? medal.gradient : undefined,
                                    color: selected ? medal.textColor : undefined,
                                  }}
                                  aria-pressed={selected}
                                  aria-label={`${selected ? "Hide" : "Show"} ${medal.name} on comments`}
                                  onClick={() => toggleAchievementBadge(medal.id)}
                                >
                                  <img src={medal.image} alt="" />
                                  <span className={styles['settings-achievement-name']}>{medal.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <p className={styles['settings-empty-state']}>
                            No Comment Medals earned yet. Post at least 10 comments to unlock your first medal.
                          </p>
                        )}
                        <div className={styles['settings-fireflies-panel']}>
                          <div className={styles['settings-fireflies-heading']}>
                            <div className={styles['settings-toggle-info']}>
                              <strong>Top Commenter Background</strong>
                              <span>
                                {isAdminPreview
                                  ? "Admin debug preview · Effect selection is available without a Top 6 rank."
                                  : topCommenterAccess === "allowed"
                                  ? `Rank #${topCommenterRank} · Choose a background effect for your comments.`
                                  : topCommenterAccess === "checking"
                                    ? "Preview available to everyone · Checking Top 6 selection access..."
                                    : topCommenterAccess === "error"
                                      ? "Preview available to everyone · Selection is locked until verified."
                                      : "Preview available to everyone · Selection is limited to the Top 6 commenters."}
                              </span>
                            </div>
                            <button
                              type="button"
                              className={styles['settings-fireflies-toggle']}
                              disabled={topCommenterAccess !== "allowed"}
                              aria-label={topCommenterAccess === "allowed"
                                ? `${settings.disableTopCommentFireflies ? "Show" : "Disable"} background effect`
                                : "Background effect locked to Top 6 commenters"}
                              aria-pressed={topCommenterAccess === "allowed" && !settings.disableTopCommentFireflies}
                              onClick={toggleTopCommentFireflies}
                            >
                              {topCommenterAccess !== "allowed"
                                ? "Locked"
                                : settings.disableTopCommentFireflies
                                  ? "Show"
                                  : "Disable"}
                            </button>
                          </div>
                          <div
                            className={styles['settings-top-comment-effect-options']}
                            role="group"
                            aria-label="Top Commenter background effect"
                          >
                            {(["fireflies", "firework", "snow"] as const).map((effect) => (
                              <button
                                type="button"
                                key={effect}
                                className={cx(
                                  styles['settings-top-comment-effect-option'],
                                  settings.topCommenterEffect === effect && styles['is-selected'],
                                )}
                                aria-label={topCommenterAccess === "allowed"
                                  ? `Select ${getTopCommenterEffectName(effect)} background effect`
                                  : `${getTopCommenterEffectName(effect)} preview; selection is limited to Top 6 commenters`}
                                aria-pressed={settings.topCommenterEffect === effect}
                                disabled={topCommenterAccess !== "allowed"}
                                onClick={() => update("topCommenterEffect", effect)}
                              >
                                <span className={styles['settings-top-comment-effect-option-header']}>
                                  <strong>{getTopCommenterEffectName(effect)}</strong>
                                  <span>
                                    {isAdminPreview
                                      ? settings.topCommenterEffect === effect
                                        ? "Previewing"
                                        : "Preview effect"
                                      : topCommenterAccess !== "allowed"
                                      ? "Top 6 only"
                                      : settings.topCommenterEffect === effect
                                        ? "Selected"
                                        : "Select effect"}
                                  </span>
                                </span>
                                <div
                                  className={cx(
                                    styles['settings-fireflies-preview'],
                                    styles[`settings-fireflies-rank-${topCommenterRank || 1}`],
                                    // Only the currently selected effect should play its live preview
                                    topCommenterPreviewEnabled &&
                                      settings.topCommenterEffect === effect &&
                                      styles['is-active'],
                                  )}
                                >
                                  {effect === "fireflies" ? (
                                    // Fireflies particles only animate when this option is selected
                                    topCommenterPreviewEnabled && settings.topCommenterEffect === effect ? (
                                      <div className={styles['settings-fireflies-particles']} aria-hidden="true">
                                        {Array.from({ length: 10 }, (_, index) => (
                                          <span key={index} />
                                        ))}
                                      </div>
                                    ) : null
                                  ) : (
                                    effect === "firework" ? (
                                      <FireworkPreviewCanvas
                                        active={topCommenterPreviewEnabled && settings.topCommenterEffect === effect}
                                        className={styles['settings-fireworks-canvas']}
                                      />
                                    ) : (
                                      <SnowPreview
                                        active={topCommenterPreviewEnabled && settings.topCommenterEffect === effect}
                                        className={styles['settings-snow-layer']}
                                      />
                                    )
                                  )}
                                  <div className={styles['settings-fireflies-comment']}>
                                    <span className={styles['settings-fireflies-rank']}>
                                      {topCommenterRank ? `TOP ${topCommenterRank}` : "TOP COMMENTER"}
                                    </span>
                                    <strong>
                                      {effect === "fireflies"
                                        ? "Fireflies preview"
                                        : effect === "firework"
                                          ? "Firework preview"
                                          : "Snow preview"}
                                    </strong>
                                    <span>
                                      {effect === "fireflies"
                                        ? "Fireflies glow behind Top Commenter comments."
                                        : effect === "firework"
                                          ? "Firework bursts sparkle behind Top Commenter comments."
                                          : "Snow falls gently behind Top Commenter comments."}
                                    </span>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                          <p className={styles['settings-hint-sm']}>
                            {settings.disableAnimations
                              ? "All previews are paused because all animations are disabled."
                              : isAdminPreview
                                ? settings.disableTopCommentFireflies
                                  ? "Admin debug preview is on. The selected effect is disabled on comments but previews remain active."
                                  : "Admin debug preview is on. Select an effect to preview it here; Top 6 eligibility for comments is unchanged."
                              : topCommenterAccess === "allowed"
                                ? settings.disableTopCommentFireflies
                                  ? "The selected effect is disabled on comments; previews remain active."
                                  : "Select an effect, then save Settings to apply it to your comments."
                                : "All three effects are previewed here; only Top 6 commenters can choose or disable them."}
                          </p>
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
                            disabled={userLevel < 110 || customBgUploading}
                            onClick={() => selectCommentBackground("")}
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
                                disabled={userLevel < 110 || customBgUploading}
                                style={{ backgroundImage: `url("${url}")` }}
                                onClick={() => selectCommentBackground(url)}
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
