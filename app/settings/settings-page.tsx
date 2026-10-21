"use client";

import { useEffect, useState } from "react";
import SiteChrome from "../site-chrome";
import "./settings.css";

type Settings = {
  displayName: string;
  username: string;
  bio: string;
  avatar: string;
  customBadge: string;
  customAvatarFrame: string;
  customFontStyle: string;
  customBorder: string;
  customShape: string;
  customCommentBg: string;
  gameRoles: string[];
  disableAnimations: boolean;
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
const initialSettings: Settings = {
  displayName: "",
  username: "",
  bio: "",
  avatar: "",
  customBadge: "",
  customAvatarFrame: "",
  customFontStyle: "",
  customBorder: "",
  customShape: "",
  customCommentBg: "",
  gameRoles: [],
  disableAnimations: false,
};

export default function SettingsPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [status, setStatus] = useState<"loading" | "guest" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [allBadgesExpanded, setAllBadgesExpanded] = useState(false);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    let attempts = 0;
    const poll = window.setInterval(() => {
      attempts += 1;
      if (!window.firebase?.auth) {
        if (attempts >= 100 && active) {
          window.clearInterval(poll);
          setStatus("error");
          setMessage("Authentication service is unavailable.");
        }
        return;
      }
      window.clearInterval(poll);
      unsubscribe = window.firebase.auth().onAuthStateChanged(async (user) => {
        if (!active) return;
        if (!user) {
          setAccount(null);
          setStatus("guest");
          return;
        }
        setAccount(user);
        try {
          const snapshot = await window.firebase!.firestore().collection("userStats").doc(user.uid).get();
          const data = snapshot.exists ? snapshot.data() || {} : {};
          if (!active) return;
          setSettings({
            ...initialSettings,
            displayName: String(data.displayName || user.displayName || ""),
            username: String(data.username || ""),
            bio: String(data.bio || ""),
            avatar: String(data.avatar || user.photoURL || anonymousAvatar),
            customBadge: String(data.customBadge || ""),
            customAvatarFrame: String(data.customAvatarFrame || ""),
            customFontStyle: String(data.customFontStyle || ""),
            customBorder: String(data.customBorder || ""),
            customShape: String(data.customShape || ""),
            customCommentBg: String(data.customCommentBg || ""),
            gameRoles: Array.isArray(data.gameRoles) ? data.gameRoles.map(String) : [],
            disableAnimations: data.disableAnimations === true ||
              localStorage.getItem("commentWidget_disableAnimations") === "true",
          });
          setStatus("ready");
        } catch (error) {
          console.error("User settings failed to load.", error);
          if (active) {
            setStatus("error");
            setMessage("Your settings could not be loaded. Check your connection and try again.");
          }
        }
      });
    }, 100);

    return () => {
      active = false;
      window.clearInterval(poll);
      unsubscribe?.();
    };
  }, []);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function toggleRole(role: string) {
    update("gameRoles", settings.gameRoles.includes(role)
      ? settings.gameRoles.filter((item) => item !== role)
      : [...settings.gameRoles, role]);
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

  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!account || !window.firebase) return;
    setSaving(true);
    setMessage("");
    const sanitizedUsername = settings.username.toLowerCase().replace(/[^a-z0-9._-]/g, "");
    const next: Settings = {
      ...settings,
      displayName: settings.displayName.trim() || "Anonymous",
      username: sanitizedUsername,
      bio: settings.bio.trim(),
    };
    try {
      await window.firebase.firestore().collection("userStats").doc(account.uid).set(next, { merge: true });
      localStorage.setItem("commentWidget_disableAnimations", next.disableAnimations ? "true" : "false");
      localStorage.setItem("userSettingsPreview", JSON.stringify(next));
      window.userStatsCache = window.userStatsCache || {};
      window.userStatsCache[account.uid] = next;
      setSettings(next);
      setMessage("Your settings have been saved.");
    } catch (error) {
      console.error("User settings failed to save.", error);
      setMessage("Your settings could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const knownRoles = new Set(roles.map(([id]) => id));
  const extraRoles = settings.gameRoles.filter((role) => !knownRoles.has(role));

  return (
    <>
      <SiteChrome showFooter={false} />
      <main className="settings-page">
        <section className="settings-panel">
          <header className="settings-header"><h1>⚙️ User Settings</h1><p>Customize your profile and comment appearance.</p></header>
          {status === "loading" && <p className="settings-state" role="status">Checking your account...</p>}
          {status === "guest" && <p className="settings-state" role="status">Log in using the Account button to manage your settings.</p>}
          {status === "error" && <p role="alert">{message}</p>}
          {status === "ready" && (
            <form onSubmit={saveSettings}>
              <section className="settings-section">
                <h2>Avatar</h2>
                <div className="settings-avatar-row">
                  <span className="settings-avatar-wrap">
                    <img className="settings-avatar-preview" src={settings.avatar || anonymousAvatar} alt="Avatar preview" />
                    {settings.customAvatarFrame && <img className="settings-avatar-frame" src={settings.customAvatarFrame} alt="" />}
                  </span>
                  <label className="settings-upload-label">Upload Avatar<input type="file" accept="image/*" onChange={(event) => void selectAvatar(event.target.files?.[0])} /></label>
                </div>
                {avatarError && <p className="settings-error" role="alert">{avatarError}</p>}
              </section>

              <section className="settings-section">
                <h2>Display Name</h2>
                <input type="text" value={settings.displayName} maxLength={50} onChange={(event) => update("displayName", event.target.value)} placeholder="Name shown in comments..." />
              </section>

              <section className="settings-section">
                <h2>Username <span className="settings-muted">(@handle)</span></h2>
                <input type="text" value={settings.username} maxLength={30} onChange={(event) => update("username", event.target.value)} placeholder="username" />
              </section>

              <section className="settings-section">
                <h2>Bio <span className="settings-muted">(max 160 characters)</span></h2>
                <textarea value={settings.bio} maxLength={160} onChange={(event) => update("bio", event.target.value)} placeholder="Describe yourself..." />
              </section>

              <section className="settings-section">
                <h2>Performance</h2>
                <label className="settings-performance">
                  <input type="checkbox" checked={settings.disableAnimations} onChange={(event) => update("disableAnimations", event.target.checked)} />
                  <span><strong>Disable All Animations</strong><small>Makes comments load faster.</small></span>
                </label>
              </section>

              <section className="settings-section">
                <h2>Custom Badges</h2>
                <div className="settings-badge-grid">
                  {(allBadgesExpanded ? badges : badges.slice(0, 16)).map(([id, name]) => (
                    <button type="button" key={id || "none"} className={`settings-badge-option badge-${id || "none"}${settings.customBadge === id ? " selected" : ""}`}
                      onClick={() => update("customBadge", id)}>{name}</button>
                  ))}
                  {settings.customBadge && !badges.some(([id]) => id === settings.customBadge) && (
                    <button type="button" className="settings-badge-option selected" onClick={() => update("customBadge", settings.customBadge)}>{settings.customBadge}</button>
                  )}
                </div>
                <button type="button" className="settings-expand" onClick={() => setAllBadgesExpanded((expanded) => !expanded)}>
                  {allBadgesExpanded ? "↑ Show Fewer Badges" : "↓ Expand All Badges"}
                </button>
              </section>

              <section className="settings-section">
                <h2>Game Player Roles</h2>
                <p className="settings-hint">Multiple selections allowed.</p>
                <div className="settings-role-grid">
                  {roles.map(([id, name]) => <label key={id}><input type="checkbox" checked={settings.gameRoles.includes(id)} onChange={() => toggleRole(id)} />{name}</label>)}
                  {extraRoles.map((role) => <label key={role}><input type="checkbox" checked onChange={() => toggleRole(role)} />{role}</label>)}
                </div>
              </section>

              <section className="settings-section">
                <h2>Avatar Frame</h2>
                <div className="settings-frame-grid">
                  <button type="button" className={`settings-frame-option${settings.customAvatarFrame ? "" : " selected"}`} onClick={() => update("customAvatarFrame", "")}>None</button>
                  {Array.from({ length: 30 }, (_, index) => {
                    const url = `/assets/hakoroku/avatar-frames/${index + 1}.png`;
                    return <button type="button" key={url} title={`Frame ${index + 1}`}
                      className={`settings-frame-option${settings.customAvatarFrame === url ? " selected" : ""}`}
                      onClick={() => update("customAvatarFrame", url)}>
                      <img src={url} alt="" loading="lazy" /><span>Frame {index + 1}</span>
                    </button>;
                  })}
                </div>
              </section>

              <section className="settings-section">
                <h2>Font Style</h2>
                <div className="settings-choice-grid">
                  {fonts.map(([id, name, preview]) => <button type="button" key={id || "default"}
                    className={`settings-font-option${settings.customFontStyle === (id ? `font-${id}` : "") ? " selected" : ""}`}
                    onClick={() => update("customFontStyle", id ? `font-${id}` : "")}>
                    <small>{name}</small><span className={id ? `font-${id}` : ""}>{preview}</span>
                  </button>)}
                </div>
              </section>

              <section className="settings-section">
                <h2>Visual Border Effect</h2>
                <div className="settings-choice-grid">
                  {borders.map(([id, name]) => <button type="button" key={id || "default"}
                    className={`settings-border-option ${id ? `border-${id}` : ""}${settings.customBorder === (id ? `border-${id}` : "") ? " selected" : ""}`}
                    onClick={() => update("customBorder", id ? `border-${id}` : "")}>{name}</button>)}
                </div>
              </section>

              <section className="settings-section">
                <h2>Border Shape</h2>
                <div className="settings-shape-grid">
                  {shapes.map(([id, name]) => <button type="button" key={id || "default"}
                    className={`settings-shape-option ${id ? `shape-${id}` : ""}${settings.customShape === (id ? `shape-${id}` : "") ? " selected" : ""}`}
                    onClick={() => update("customShape", id ? `shape-${id}` : "")}>{name}</button>)}
                </div>
              </section>

              <section className="settings-section">
                <h2>Comment Background <span className="settings-premium">(Lv 110 Transcendent Only)</span></h2>
                <div className="settings-background-grid">
                  <button type="button" className={`settings-background-option settings-background-default${settings.customCommentBg ? "" : " selected"}`}
                    onClick={() => update("customCommentBg", "")}><span>Default</span></button>
                  {Array.from({ length: 8 }, (_, index) => {
                    const url = `/assets/hakoroku/backgrounds/${index + 1}.jpg`;
                    return <button type="button" key={url} className={`settings-background-option${settings.customCommentBg === url ? " selected" : ""}`}
                      style={{ backgroundImage: `url("${url}")` }} onClick={() => update("customCommentBg", url)}>
                      <span>Background {index + 1}</span>
                    </button>;
                  })}
                </div>
                {settings.customCommentBg && <div className="settings-background-preview">
                  <img src={settings.customCommentBg} alt="Selected comment background preview" />
                  <button type="button" onClick={() => update("customCommentBg", "")}>🗑 Reset Background</button>
                </div>}
              </section>

              <button className="settings-save" type="submit" disabled={saving}>{saving ? "Saving..." : "Save Settings"}</button>
              {message && status === "ready" && <p role="status">{message}</p>}
            </form>
          )}
        </section>
      </main>
      <SiteChrome showChrome={false} />
    </>
  );
}
