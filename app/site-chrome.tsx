"use client";

import { useEffect } from "react";

function alreadyInitialized(src: string): boolean {
  if (src.includes("firebase-app-compat.js")) return !!window.firebase?.initializeApp;
  if (src.includes("firebase-auth-compat.js")) return !!window.firebase?.auth;
  if (src.includes("firebase-firestore-compat.js")) return !!window.firebase?.firestore;
  if (src === "/firebase.js") return !!window.firestore && !!window.fs;
  if (src === "/manga-data.js") return !!window.__mangaDataLoaded;
  if (src === "/auth-loader.js") return !!window.__authListenerAttached || !!window.triggerLogin;
  if (src === "/user-modals.js") return !!window.showHistory;
  if (src === "/header.js") return !!window.initSiteHeader;
  if (src === "/footer.js") return !!window.initSiteFooter;
  return false;
}

function loadScript(src: string, type = "text/javascript"): Promise<void> {
  const absoluteSrc = new URL(src, window.location.href).href;
  const existing = [...document.scripts].find((script) => script.src === absoluteSrc);
  if (existing && (existing.dataset.loaded === "true" || alreadyInitialized(src))) {
    existing.dataset.loaded = "true";
    return Promise.resolve();
  }
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Gagal memuat ${src}`)), { once: true });
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.type = type;
    script.async = false;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => {
      script.remove();
      reject(new Error(`Gagal memuat ${src}`));
    };
    document.head.appendChild(script);
  });
}

async function initializeSiteChrome(showChrome: boolean, showFooter: boolean): Promise<void> {
  const headerPromise = showChrome
    ? loadScript("/header.js")
        .then(() => window.initSiteHeader?.())
        .catch((error: unknown) => {
          console.error("Header dan sidebar gagal dimuat.", error);
        })
    : Promise.resolve();

  try {
    await loadScript("https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js");
    await loadScript("https://www.gstatic.com/firebasejs/10.14.0/firebase-auth-compat.js");
    await loadScript("https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore-compat.js");
    if (!window.firebase) throw new Error("Firebase compat SDK tidak tersedia.");
    if (!window.firebase.apps.length) {
      window.firebase.initializeApp({
        apiKey: "AIzaSyCxufJubuS95zQnvctINvzj-H8WSIgsse4",
        authDomain: "widget-comment.firebaseapp.com",
        projectId: "widget-comment",
        storageBucket: "widget-comment.firebasestorage.app",
        messagingSenderId: "249700505242",
        appId: "1:249700505242:web:dab240af09caf30ad7f123",
      });
    }
    await loadScript("/firebase.js", "module");
  } catch (error) {
    console.error("Firebase halaman gagal diinisialisasi.", error);
  }

  if (showChrome && window.firestore && window.fs) {
    await loadScript("/manga-data.js").catch((error: unknown) => {
      console.error("Dataset katalog header gagal dimuat.", error);
    });
  } else if (showChrome) {
    console.warn("Firebase katalog tidak tersedia; pencarian header tanpa data manga.");
  }

  const scripts = [
    ...(showChrome && window.firebase ? ["/auth-loader.js", "/user-modals.js"] : []),
    ...(showFooter ? ["/footer.js"] : []),
  ];
  for (const src of scripts) {
    await loadScript(src).catch((error: unknown) => {
      console.error(`Integrasi situs gagal dimuat: ${src}`, error);
    });
  }
  await headerPromise;
  if (showFooter) window.initSiteFooter?.();
}

export default function SiteChrome({
  showChrome = true,
  showFooter = true,
}: {
  showChrome?: boolean;
  showFooter?: boolean;
}) {
  useEffect(() => {
    void initializeSiteChrome(showChrome, showFooter).catch((error: unknown) => {
      console.error("Header dan footer gagal dimuat.", error);
    });
    return () => {
      if (showChrome) document.getElementById("site-header")?.replaceChildren();
      if (showFooter) document.getElementById("site-footer")?.replaceChildren();
    };
  }, [showChrome, showFooter]);

  return showChrome || showFooter ? (
    <>
      {showChrome && <div id="site-header" />}
      {showFooter && <div id="site-footer" />}
    </>
  ) : null;
}
