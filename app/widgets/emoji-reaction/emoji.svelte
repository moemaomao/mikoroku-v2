<svelte:options customElement={{ tag: "mikoroku-emoji-reaction" }} />

<script lang="ts">
  import { onMount } from "svelte";

  type ReactionKey = "like" | "haha" | "wow" | "sad" | "angry2";
  type FirebaseApi = {
    initializeApp: (config: { apiKey: string; projectId: string }, name: string) => unknown;
    getFirestore: (app: unknown) => unknown;
    getAuth: (app: unknown) => unknown;
    doc: (db: unknown, collection: string, id: string) => unknown;
    setDoc: (ref: unknown, data: Record<string, unknown>, options: { merge: boolean }) => Promise<void>;
    increment: (value: number) => unknown;
    onSnapshot: (ref: unknown, next: (snapshot: { data: () => Record<string, unknown> }) => void, error: (error: unknown) => void) => () => void;
    onAuthStateChanged: (auth: unknown, callback: (user: { uid: string } | null) => void) => () => void;
    enableIndexedDbPersistence: (db: unknown) => Promise<void>;
  };

  export let pageId = "";

  const firebaseVersion = "10.12.5";
  const reactionKeys: ReactionKey[] = ["like", "haha", "wow", "sad", "angry2"];
  const images: Record<ReactionKey, string> = {
    like: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEis9ZOW9esFuwM3vo5mtv16K8iK2NT2XpQFCxlEx2F7joVOd0BZWfSfdd9QPLwzAGa4UV4xEiVq8j5uIgYzT2GS1LGqQSJkB73XHwsZMDQJbgr1mlrbO_6PqsKtu0-jqzbKZO_32AG_FKhpUc5iM4L-IRTcRCLvdC14NP3gyeBMdGxJ7K1F6nm7_xrsZrE/s100/Untitled183_20260422193737.png",
    haha: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgveI8BS46sAgH4T-NemtemNvDPld6CKqG7xvbb4N6zErUMeOn-Dz6M1a4Fp3iquJv65HkuPEqZDSsFLGmTclRV-FZ2TkY42IBLO3jAaa_iVgH01-IFeFdIXQJSHUBDcwjShsXOac3C8gxGVASTHMOhv5xmbwX_v5ZdvPUysLfONpZjZG0R9bjTaS-ELCE/s100/Image_rof2zdrof2zdrof2.png",
    wow: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgaAnwz4Li06jCLLBrD8lpAuoiLkHs8il6r8OOYzaFUppECfsVlmoPAAZO0-f-p0hHfxPVclVRii4Duuky44n0_zZgmXo_mAS0HlWb9gAFeYySGXVNY2xw5W-xS_cOfi-muzfQUEMpqj-7gpZ0fQ1LxTMPyMuix7uCIrddJMdstb2RniNUsKhNH164Ar7I/s100/Crot.png",
    sad: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhBL_MNansQeOnqFrEl2xO-N4WA6T85OOV09eoV446UTUe1IDpN4UZKh_wSaHGhX8tbYFUwtP-7xuymqXyh94e8vd4kHigB9T19u0BwtEjFqS2PTu6R-Wf03PSzdARay2L9AyJO1S5L8_wnTKbK-KPlc12jS_q7HzZH5rSSOb-X1WmxFcghTFg7ClBdbW8/s100/sad.png",
    angry2: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh8l9NDdzOD9NrZmf4EJ0A0deOeUhb0kCPNYJlYyIn5U1X2bpmUCAP_Ww9bAQWpnkRq6y3lfnVlkssLpUp1jTskIwlYMgpGd1SFXclS7k4ZiPYlyd2GeLS3W9TstQ1zH7eU5Pf3fwk6Rs_4g-B144VvgJ0Rv5dPk_O_QXT9QbrDPJqZuyk-go1YQuPAiew/s100/angry.png",
  };
  const labels: Record<ReactionKey, string> = { like: "LIKE", haha: "LOL", wow: "CUM", sad: "SAD", angry2: "MAD" };
  const countsCacheKey = "emojiReactionCounts_v1";
  const adminUid = "qcrJ0azJRvSlShzcvXv178KrmMA2";

  let counts = Object.fromEntries(reactionKeys.map((key) => [key, 0])) as Record<ReactionKey, number>;
  let activePageId = "";
  let currentUser: { uid: string } | null = null;
  let firebase: FirebaseApi | null = null;
  let firebaseApp: unknown = null;
  let currentRef: unknown = null;
  let unsubscribeSnapshot: (() => void) | null = null;
  let unsubscribeAuth: (() => void) | null = null;
  let connecting: Promise<void> | null = null;
  const lockedClicks = new Set<string>();
  const pending = new Set<ReactionKey>();

  const pageDocumentId = (value: string) => `emoji_${value || "global_0"}`.replace(/\W/g, "_");
  const readCache = (id: string) => {
    try {
      const cache = JSON.parse(localStorage.getItem(countsCacheKey) || "{}") as Record<string, Record<string, number>>;
      return cache[id];
    } catch (error) {
      console.warn("Could not read cached emoji counts.", error);
      return null;
    }
  };
  const saveCache = (id: string) => {
    try {
      const cache = JSON.parse(localStorage.getItem(countsCacheKey) || "{}") as Record<string, Record<ReactionKey, number>>;
      cache[id] = { ...counts };
      const ids = Object.keys(cache);
      ids.slice(0, Math.max(0, ids.length - 20)).forEach((key) => delete cache[key]);
      localStorage.setItem(countsCacheKey, JSON.stringify(cache));
    } catch (error) {
      console.warn("Could not save cached emoji counts.", error);
    }
  };
  const normalize = (value: Record<string, unknown>) => Object.fromEntries(
    reactionKeys.map((key) => [key, typeof value[key] === "number" && Number.isFinite(value[key]) ? value[key] : 0]),
  ) as Record<ReactionKey, number>;

  async function loadFirebase() {
    if (firebase) return firebase;
    const [app, firestore, auth] = await Promise.all([
      import(/* @vite-ignore */ `https://www.gstatic.com/firebasejs/${firebaseVersion}/firebase-app.js`),
      import(/* @vite-ignore */ `https://www.gstatic.com/firebasejs/${firebaseVersion}/firebase-firestore.js`),
      import(/* @vite-ignore */ `https://www.gstatic.com/firebasejs/${firebaseVersion}/firebase-auth.js`),
    ]);
    firebase = { ...app, ...firestore, ...auth } as unknown as FirebaseApi;
    return firebase;
  }

  async function connect(nextPageId: string) {
    if (!nextPageId || nextPageId === activePageId) return;
    activePageId = nextPageId;
    unsubscribeSnapshot?.();
    const api = await loadFirebase();
    firebaseApp ??= api.initializeApp({ apiKey: "AIzaSyAwXK4q1t_0HVA-eZN22PIlKgJ3zYXIuAs", projectId: "emoji-reaction-fb044" }, "mikoroku-emoji-reaction");
    const db = api.getFirestore(firebaseApp);
    const auth = api.getAuth(firebaseApp);
    const id = pageDocumentId(nextPageId);
    const cached = readCache(id);
    if (cached) counts = normalize(cached);
    currentRef = api.doc(db, "emoji_reactions", id);
    api.enableIndexedDbPersistence(db).catch((error: unknown) => console.warn("Emoji persistence unavailable.", error));
    unsubscribeAuth ??= api.onAuthStateChanged(auth, (user) => { currentUser = user; });
    unsubscribeSnapshot = api.onSnapshot(
      currentRef,
      (snapshot) => {
        const server = normalize(snapshot.data());
        counts = Object.fromEntries(reactionKeys.map((key) => [key, pending.has(key) && counts[key] > server[key] ? counts[key] : server[key]])) as Record<ReactionKey, number>;
        saveCache(id);
      },
      (error) => console.warn("Emoji listener failed.", error),
    );
  }

  function showBubble(button: HTMLElement, message: string) {
    const bubble = document.createElement("span");
    bubble.className = "bubble";
    bubble.textContent = message;
    button.appendChild(bubble);
    setTimeout(() => bubble.remove(), 1900);
  }

  function animate(button: HTMLElement, key: ReactionKey) {
    if (document.documentElement.classList.contains("no-animations") || document.body.classList.contains("no-animations")) return;
    const image = button.querySelector("img");
    if (!image) return;
    image.classList.remove("active");
    void image.offsetWidth;
    image.classList.add("active", key);
    if (key === "like") fireEffect(button, image);
    if (key === "haha") pinballEffect(button, image);
    if (key === "wow") {
      image.classList.remove("active", key);
      slimeEffect(button);
    }
    if (key === "sad") tearsEffect(button);
    if (key === "angry2") {
      image.classList.remove("active", key);
      angryEffect(button, image);
    }
  }

  function fireEffect(button: HTMLElement, image: HTMLImageElement) {
    const rect = button.getBoundingClientRect();
    for (let index = 0; index < 14; index += 1) {
      const particle = document.createElement("i");
      const angle = Math.random() * Math.PI * 2;
      const distance = 70 + Math.random() * 80;
      Object.assign(particle.style, {
        position: "fixed", left: `${rect.left + rect.width / 2}px`, top: `${rect.top + rect.height / 2}px`,
        width: "10px", height: "10px", borderRadius: "50%", pointerEvents: "none", zIndex: "9999",
        background: "radial-gradient(circle, #fff176, #ff9800, #ff5722)", filter: "blur(1px)",
      });
      document.body.appendChild(particle);
      particle.animate(
        [{ transform: "translate(0,0) scale(1)", opacity: 1 }, { transform: `translate(${Math.cos(angle) * distance}px,${Math.sin(angle) * distance}px) scale(.5)`, opacity: 0 }],
        { duration: 700, easing: "ease-out" },
      ).finished.then(() => particle.remove()).catch(() => particle.remove());
    }
    image.animate(
      [{ transform: "rotate(0deg) scale(1)" }, { transform: "rotate(1440deg) scale(1.15)" }],
      { duration: 5200, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" },
    );
  }

  function pinballEffect(button: HTMLElement, image: HTMLImageElement) {
    const rect = button.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;
    const points = [{ x: 0, y: 0 }];
    let x = startX;
    let y = startY;
    let vx = (Math.random() * 6 + 4) * (Math.random() > .5 ? 1 : -1);
    let vy = (Math.random() * 6 + 4) * (Math.random() > .5 ? 1 : -1);
    for (let index = 0; index < 6; index += 1) {
      x += vx * 80; y += vy * 80;
      if (x < 0 || x > innerWidth) vx *= -1;
      if (y < 0 || y > innerHeight) vy *= -1;
      points.push({ x: Math.max(0, Math.min(innerWidth, x)) - startX, y: Math.max(0, Math.min(innerHeight, y)) - startY });
    }
    points.push({ x: 0, y: 0 });
    image.animate(points.map((point) => ({ transform: `translate(${point.x}px,${point.y}px)` })), { duration: 3000, easing: "cubic-bezier(.2,.8,.2,1)" });
  }

  function slimeEffect(button: HTMLElement) {
    const rect = button.getBoundingClientRect();
    let box = document.getElementById("mikoroku-emoji-slime");
    if (!box) {
      box = document.createElement("div");
      box.id = "mikoroku-emoji-slime";
      Object.assign(box.style, { position: "fixed", inset: "0", pointerEvents: "none", zIndex: "9999", filter: "url(#mikoroku-emoji-goo)" });
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("aria-hidden", "true");
      svg.style.cssText = "position:absolute;width:0;height:0";
      svg.innerHTML = `<defs><filter id="mikoroku-emoji-goo"><feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur"/><feColorMatrix in="blur" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 20 -8" result="goo"/><feComposite in="SourceGraphic" in2="goo" operator="atop"/></filter></defs>`;
      box.appendChild(svg);
      document.body.appendChild(box);
    }
    for (let index = 0; index < 14; index += 1) {
      const blob = document.createElement("i");
      const size = 22 + Math.random() * 40;
      Object.assign(blob.style, {
        position: "absolute", left: `${rect.left + rect.width / 2 - size / 2}px`, top: `${rect.top + rect.height / 2 - size * 1.2 / 2}px`,
        width: `${size}px`, height: `${size * 1.5}px`, borderRadius: "50%", pointerEvents: "none", zIndex: "9999",
        background: "white", opacity: "0",
      });
      box.appendChild(blob);
      const dx = Math.random() * 200 - 100;
      const up = -250 - Math.random() * 200;
      const dx2 = dx * 1.1 + (Math.random() * 60 - 30);
      const delay = 1400 + Math.random() * 400;
      const splash = blob.animate(
        [{ transform: "translate(0,0) scale(.4,1.6)", opacity: 0 }, { transform: `translate(${dx}px,${up}px) scale(1.4,.9)`, opacity: .95 }],
        { duration: 2200, delay: Math.random() * 400, easing: "cubic-bezier(.2,.8,.3,1)", fill: "forwards" },
      );
      window.setTimeout(() => {
        splash.cancel();
        const drip = blob.animate(
          [{ transform: `translate(${dx}px,${up}px) scale(1.3,1)`, opacity: .9 }, { transform: `translate(${dx2}px,110vh) scale(.9,1.4)`, opacity: 0 }],
          { duration: 4800, easing: "ease-in", fill: "forwards" },
        );
        drip.finished.then(() => blob.remove()).catch(() => blob.remove());
      }, delay);
    }
  }

  function tearsEffect(button: HTMLElement) {
    const rect = button.getBoundingClientRect();
    for (let index = 0; index < 18; index += 1) {
      const tear = document.createElement("i");
      const size = 5 + Math.random() * 7;
      Object.assign(tear.style, {
        position: "fixed", left: `${rect.left + rect.width / 2 + Math.random() * 22 - 11}px`, top: `${rect.top + 10}px`,
        width: `${size}px`, height: `${size * 1.8}px`, borderRadius: "50%", pointerEvents: "none", zIndex: "9999",
        background: "linear-gradient(transparent,#81d4fa,#29b6f6)", boxShadow: "0 0 6px #81d4fa",
      });
      document.body.appendChild(tear);
      tear.animate([{ transform: "translate(0,0) scale(.4)", opacity: .9 }, { transform: `translate(${Math.random() * 45 - 22}px,210px) scale(1.15)`, opacity: 0 }], { duration: 2400 + Math.random() * 1000, delay: index * 65 }).finished.then(() => tear.remove()).catch(() => tear.remove());
    }
  }

  function angryEffect(button: HTMLElement, image: HTMLImageElement) {
    image.animate(
      [
        { transform: "scale(1) translate(0,0) rotate(0deg)" },
        { transform: "scale(1.14) translate(-7px,4px) rotate(-7deg)" },
        { transform: "scale(1.2) translate(8px,-5px) rotate(7deg)" },
        { transform: "scale(1.3) translate(-14px,8px) rotate(-12deg)" },
        { transform: "scale(1.36) translate(15px,-10px) rotate(13deg)" },
        { transform: "scale(1.38) translate(-17px,11px) rotate(-15deg)" },
        { transform: "scale(1.36) translate(17px,-11px) rotate(15deg)" },
        { transform: "scale(1.4) translate(-18px,12px) rotate(-16deg)" },
        { transform: "scale(1.38) translate(18px,-12px) rotate(16deg)" },
        { transform: "scale(1.42) translate(-15px,10px) rotate(-14deg)", filter: "drop-shadow(0 0 18px red) saturate(2)" },
        { transform: "scale(1.34) translate(12px,-8px) rotate(11deg)" },
        { transform: "scale(1.28) translate(-10px,6px) rotate(-9deg)" },
        { transform: "scale(1.18) translate(6px,-4px) rotate(6deg)" },
        { transform: "scale(1.1) translate(-3px,2px) rotate(-3deg)" },
        { transform: "scale(1) translate(0,0) rotate(0deg)", filter: "drop-shadow(0 0 0 red)" },
      ],
      { duration: 3000, easing: "linear" },
    );
    button.animate([{ filter: "brightness(1.4) saturate(1.8)" }, { filter: "none" }], { duration: 300 });
  }

  async function react(key: ReactionKey, button: HTMLElement) {
    const voteKey = `${activePageId}_${key}`;
    if (lockedClicks.has(voteKey)) return;
    lockedClicks.add(voteKey);
    const lock = `reacted_${activePageId}_${key}`;
    try {
      const isAdmin = currentUser?.uid === adminUid;
      if (!isAdmin && localStorage.getItem(lock)) {
        showBubble(button, "Already selected!");
        return;
      }
      if (!currentRef || !firebase) throw new Error("Emoji reaction page is not ready.");
      counts = { ...counts, [key]: counts[key] + 1 };
      pending.add(key);
      animate(button, key);
      navigator.vibrate?.(30);
      if (!isAdmin) localStorage.setItem(lock, "1");
      await firebase.setDoc(currentRef, { [key]: firebase.increment(1) }, { merge: true });
      saveCache(pageDocumentId(activePageId));
      setTimeout(() => pending.delete(key), 1500);
    } catch (error) {
      counts = { ...counts, [key]: Math.max(0, counts[key] - 1) };
      if (error instanceof Error) console.error("Failed to save emoji reaction.", error);
      showBubble(button, "Failed to save. Try again.");
      try { localStorage.removeItem(lock); } catch (storageError) { console.warn("Could not clear emoji vote lock.", storageError); }
    } finally {
      lockedClicks.delete(voteKey);
    }
  }

  onMount(() => {
    connecting = connect(pageId)
      .catch((error: unknown) => console.error("Failed to initialize emoji reaction.", error))
      .finally(() => { connecting = null; });
    return () => {
      unsubscribeSnapshot?.();
      unsubscribeAuth?.();
      unsubscribeSnapshot = null;
      unsubscribeAuth = null;
    };
  });

  $: if (pageId && pageId !== activePageId && !connecting) {
    connecting = connect(pageId).finally(() => { connecting = null; });
  }
</script>

<div class="reaction" aria-label="Emoji reactions">
  {#each reactionKeys as key}
    <button type="button" aria-label={labels[key]} on:click={(event) => react(key, event.currentTarget)}>
      <img src={images[key]} alt={labels[key]} width="45" height="45" loading="lazy" decoding="async" />
      <span class="count">{counts[key]}</span>
      <small>{labels[key]}</small>
    </button>
  {/each}
</div>

<style>
  :host { display: block; }
  .reaction { display: flex; justify-content: center; align-items: flex-start; gap: 14px; flex-wrap: wrap; margin: 25px 0; text-align: center; }
  button { width: 45px; height: 45px; min-width: 45px; border: 0; background: none; cursor: pointer; position: relative; padding: 0; }
  img { width: 45px; height: 45px; object-fit: contain; border-radius: 50%; display: block; transform-origin: center; }
  :global(img.active) { animation: react 0.52s cubic-bezier(.2,.8,.2,1); }
  :global(img.like) { animation: spin 5.2s cubic-bezier(.2,.8,.2,1); }
  :global(img.haha) { animation: bounce .2s ease; }
  :global(img.wow) { animation: burst .8s ease; }
  :global(img.sad) { animation: sad 1.8s ease; }
  :global(img.angry2) { animation: angry .8s ease; }
  .count { position: absolute; top: -8px; right: -10px; background: #ff4081; color: white; font: bold 12px/1 sans-serif; padding: 4px 8px; border-radius: 999px; min-width: 22px; box-sizing: border-box; }
  small { display: block; margin-top: 4px; color: #a1a1a1; font: 11px sans-serif; user-select: none; white-space: nowrap; }
  :global(.bubble) { position: absolute; left: 50%; bottom: calc(100% + 10px); transform: translateX(-50%); background: white; color: black; font: 12px sans-serif; padding: 6px 10px; border: 2px solid black; border-radius: 12px; white-space: nowrap; z-index: 2; animation: bubble .6s ease; }
  @keyframes react { 50% { transform: scale(1.2); } }
  @keyframes spin { to { transform: rotate(1440deg) scale(1.15); } }
  @keyframes bounce { 50% { transform: scale(1.2,.8); } }
  @keyframes burst { 50% { transform: scale(1.3); filter: brightness(1.3); } }
  @keyframes sad { 50% { transform: scale(.88) translateY(12px) rotate(-8deg); } }
  @keyframes angry { 20%, 40%, 60% { transform: translateX(-6px) rotate(-6deg) scale(1.2); } }
  @keyframes bubble { from { opacity: 0; transform: translate(-50%, 8px) scale(.8); } }
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; } }
</style>
