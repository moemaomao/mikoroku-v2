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

  const legacyRuntimeSrc = "/widgets/comment-runtime.js";
  const featureStyleHrefs = {
    dm: "/widgets/comment-dm.css",
    report: "/widgets/comment-report.css",
    settings: "/widgets/comment-settings.css",
    effects: "/widgets/comment-effects.css",
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

    const promise = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.addEventListener("load", () => resolve(), { once: true });
      script.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
      document.head.appendChild(script);
    });
    scriptLoads.set(src, promise);
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

    if (!runtimeStarted) {
      const script = document.createElement("script");
      script.textContent = await runtimeSourcePromise;
      document.body.appendChild(script);
      runtimeStarted = true;
    }

    window.setCommentCommunityPageId?.(pageId || "home");
  }

  onMount(() => {
    loadCommentStyles("/widgets/comment-widget.css");
    window.loadCommentFeatureStyles = loadFeatureStyles;
    const idle = "requestIdleCallback" in window
      ? window.requestIdleCallback(() => loadFeatureStyles("effects"), { timeout: 2500 })
      : window.setTimeout(() => loadFeatureStyles("effects"), 2500);
    void startLegacyRuntime().catch((error: unknown) => {
      console.error("Comment widget failed to initialize.", error);
    });

    return () => {
      if (typeof idle === "number") window.clearTimeout(idle);
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
