<svelte:options
  customElement={{
    tag: "mikoroku-comment-widget",
    shadow: "none",
    props: { pageId: { attribute: "page-id", type: "String" } },
  }}
/>

<script lang="ts">
  // The legacy runtime is kept intact during the first migration phase because
  // it owns a large document-level feature set (auth, replies, DM and moderation).
  // The Svelte custom element now owns loading, lifecycle and framework integration.
  // @ts-nocheck
  import { onMount } from "svelte";
  import legacyMarkup from "./comment-markup.html?raw";
  import "./comment.css";

  export let pageId = "home";

  const legacyRuntimeSrc = "/widgets/comment-runtime.js?v=comment-login-route-1";
  const featureStyleHrefs = {
    dm: "/widgets/comment-dm.css",
    report: "/widgets/comment-report.css",
    settings: "/widgets/comment-settings.css",
    effects: "/widgets/comment-effects.css?v=avatar-frame-fit-2",
  };
  const externalScripts = [
    ["https://cdn.jsdelivr.net/npm/dompurify@3.2.7/dist/purify.min.js", () => Boolean(window.DOMPurify)],
    ["https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js", () => Boolean(window.firebase)],
    ["https://www.gstatic.com/firebasejs/10.14.0/firebase-auth-compat.js", () => Boolean(window.firebase?.auth)],
    ["https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore-compat.js", () => Boolean(window.firebase?.firestore)],
    ["https://cdn.jsdelivr.net/npm/md5@2.3.0/dist/md5.min.js", () => Boolean(window.md5)],
  ] as const;

  let runtimeStarted = false;
  const scriptLoads = new Map<string, Promise<void>>();
  let runtimeSource: Promise<string> | null = null;

  function loadRuntimeSource(): Promise<string> {
    if (runtimeSource) return runtimeSource;
    runtimeSource = fetch(legacyRuntimeSrc).then((response) => {
      if (!response.ok) throw new Error(`Failed to load ${legacyRuntimeSrc}: ${response.status}`);
      return response.text();
    });
    return runtimeSource;
  }

  async function initializeCommentFirestoreCache() {
    const firebaseApp = window.firebase.apps.find((app) => app.name === "[DEFAULT]")
      || window.firebase.initializeApp({
        apiKey: "AIzaSyCxufJubuS95zQnvctINvzj-H8WSIgsse4",
        authDomain: "widget-comment.firebaseapp.com",
        projectId: "widget-comment",
        storageBucket: "widget-comment.firebasestorage.app",
        messagingSenderId: "249700505242",
        appId: "1:249700505242:web:dab240af09caf30ad7f123",
      });
    if (firebaseApp.options.projectId !== "widget-comment") {
      throw new Error("The default Firebase app must use the shared comment authentication project.");
    }

    const firestore = await import(
      /* @vite-ignore */ "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js"
    );
    try {
      firestore.initializeFirestore(firebaseApp._delegate, {
        localCache: firestore.persistentLocalCache({
          tabManager: firestore.persistentMultipleTabManager(),
        }),
      });
    } catch (error) {
      console.warn("Comment Firestore persistent cache unavailable; using the default Firestore cache.", error);
    }
  }

  function loadCommentStyles(styleHref: string) {
    if (document.head.querySelector(`link[href="${styleHref}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = styleHref;
    link.dataset.mikorokuCommentStyle = "";
    document.head.appendChild(link);
  }

  function loadFeatureStyles(feature: keyof typeof featureStyleHrefs) {
    loadCommentStyles(featureStyleHrefs[feature]);
  }

  function loadExternalScript(src: string, isLoaded: () => boolean): Promise<void> {
    if (isLoaded()) return Promise.resolve();
    const existing = scriptLoads.get(src);
    if (existing) return existing;

    const absoluteSrc = new URL(src, document.baseURI).href;
    const existingScript = Array.from(document.scripts)
      .find((script) => script.src === absoluteSrc);
    const promise = new Promise<void>((resolve, reject) => {
      if (existingScript) {
        if (existingScript.dataset.loaded === "true") {
          reject(new Error(`Script loaded without initializing its library: ${src}`));
          return;
        }
        existingScript.addEventListener("load", () => {
          if (isLoaded()) {
            existingScript.dataset.loaded = "true";
            resolve();
          } else {
            reject(new Error(`Script loaded without initializing its library: ${src}`));
          }
        }, { once: true });
        existingScript.addEventListener("error", () => {
          existingScript.remove();
          reject(new Error(`Failed to load ${src}`));
        }, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.addEventListener("load", () => {
        script.dataset.loaded = "true";
        resolve();
      }, { once: true });
      script.addEventListener("error", () => {
        script.remove();
        reject(new Error(`Failed to load ${src}`));
      }, { once: true });
      document.head.appendChild(script);
    });
    scriptLoads.set(src, promise);
    void promise.catch(() => {
      if (scriptLoads.get(src) === promise) scriptLoads.delete(src);
    });
    return promise;
  }

  async function startLegacyRuntime() {
    const runtimeSourcePromise = loadRuntimeSource();
    const [domPurify, firebaseApp, md5] = externalScripts;
    await Promise.all([
      loadExternalScript(domPurify[0], domPurify[1]),
      loadExternalScript(md5[0], md5[1]),
    ]);
    await loadExternalScript(firebaseApp[0], firebaseApp[1]);
    await Promise.all(
      externalScripts.slice(2, 4).map(([src, isLoaded]) => loadExternalScript(src, isLoaded)),
    );
    await initializeCommentFirestoreCache();

    if (!runtimeStarted) {
      const script = document.createElement("script");
      script.textContent = await runtimeSourcePromise;
      document.body.appendChild(script);
      runtimeStarted = true;
    }

    window.setCommentCommunityPageId?.(pageId || "home");
  }

  onMount(() => {
    loadCommentStyles("/widgets/comment-widget.css?v=reply-buttons-6");
    window.loadCommentFeatureStyles = loadFeatureStyles;
    const commentForm = document.getElementById("comment-form");
    const preventNativeCommentSubmit = (event: Event) => event.preventDefault();
    commentForm?.addEventListener("submit", preventNativeCommentSubmit, true);
    const idle = "requestIdleCallback" in window
      ? window.requestIdleCallback(() => loadFeatureStyles("effects"), { timeout: 2500 })
      : window.setTimeout(() => loadFeatureStyles("effects"), 2500);
    void startLegacyRuntime().catch((error: unknown) => {
      console.error("Comment widget failed to initialize.", error);
    });

    return () => {
      if (typeof idle === "number") window.clearTimeout(idle);
      commentForm?.removeEventListener("submit", preventNativeCommentSubmit, true);
      if (window.loadCommentFeatureStyles === loadFeatureStyles) {
        delete window.loadCommentFeatureStyles;
      }
    };
  });

  $: if (runtimeStarted && pageId) {
    window.setCommentCommunityPageId?.(pageId);
  }
</script>

{@html legacyMarkup}
