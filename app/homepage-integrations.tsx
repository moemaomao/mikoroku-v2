"use client";

import { useEffect } from "react";

type ScriptSource = {
  src?: string;
  type?: string;
  code?: string;
};

const scripts: ScriptSource[] = [
  { src: "/header.js" },
  { src: "/manga-data.js" },
  { src: "/githubmangapost.js" },
  { src: "https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js" },
  { src: "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth-compat.js" },
  { src: "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore-compat.js" },
  {
    code: `if(!firebase.apps.length){firebase.initializeApp({apiKey:"AIzaSyCxufJubuS95zQnvctINvzj-H8WSIgsse4",authDomain:"widget-comment.firebaseapp.com",projectId:"widget-comment",storageBucket:"widget-comment.firebasestorage.app",messagingSenderId:"249700505242",appId:"1:249700505242:web:dab240af09caf30ad7f123"})}`,
  },
  { src: "/auth-loader.js" },
  { src: "/user-modals.js" },
  { src: "/firebase.js", type: "module" },
  { src: "/firebasepost.js" },
  { src: "/widget.js" },
  { src: "/footer.js" },
];

const adFrameDocument = `<!DOCTYPE html>
<html>
  <head>
    <style>body{margin:0;padding:0;display:flex;justify-content:center;}</style>
  </head>
  <body>
    <script>
      (function(settings){
        var script = document.createElement("script");
        script.settings = settings || {};
        script.src = "//gummy-debt.com/b/XwVes.dqGml/0/YyWrcj/OeUmG9yuTZZUYlmkuPzTHcozVNEjfQPz-MXj-EotbNjznMk2dNKD/M/yQN/QU";
        script.async = true;
        script.referrerPolicy = "no-referrer-when-downgrade";
        document.body.appendChild(script);
      })({});
    </script>
  </body>
</html>`;

let integrationsPromise: Promise<void> | undefined;

function loadScript(source: ScriptSource, index: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.dataset.homeIntegration = String(index);
    script.async = false;
    if (source.type) script.type = source.type;
    if (source.src) script.src = source.src;
    if (source.code) script.textContent = source.code;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load homepage script: ${source.src}`));
    document.head.appendChild(script);
    if (source.code) resolve();
  });
}

async function loadHomepageIntegrations() {
  for (const [index, source] of scripts.entries()) {
    await loadScript(source, index);
  }
}

function loadHomeAdvertisement() {
  const container = document.getElementById("home-ad");
  const mangaList = document.getElementById("githubManga");
  if (!container || !mangaList || container.dataset.loaded) return;

  const load = () => {
    if (container.dataset.loaded) return;
    container.dataset.loaded = "true";

    const iframe = document.createElement("iframe");
    iframe.title = "Advertisement";
    iframe.srcdoc = adFrameDocument;
    iframe.width = "100%";
    iframe.height = "250";
    iframe.loading = "lazy";
    iframe.referrerPolicy = "no-referrer-when-downgrade";
    iframe.sandbox.add("allow-scripts", "allow-popups", "allow-popups-to-escape-sandbox");
    container.appendChild(iframe);
  };

  const existingCards = mangaList.querySelector(".card:not(.skeleton-card)");
  if (existingCards) {
    window.setTimeout(load, 1000);
    return;
  }

  const observer = new MutationObserver(() => {
    if (!mangaList.querySelector(".card:not(.skeleton-card)")) return;
    observer.disconnect();
    window.clearTimeout(fallback);
    window.setTimeout(load, 1000);
  });
  observer.observe(mangaList, { childList: true, subtree: true });

  const fallback = window.setTimeout(() => {
    observer.disconnect();
    load();
  }, 10000);
}

export default function HomepageIntegrations() {
  useEffect(() => {
    loadHomeAdvertisement();
    integrationsPromise ??= loadHomepageIntegrations();
    integrationsPromise.catch((error: unknown) => {
      console.error("Homepage integrations failed to initialize.", error);
    });
  }, []);

  return null;
}
