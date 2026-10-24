"use client";

import { useEffect } from "react";
import GlobalAuth from "./global-auth";
import UserModals from "./user-modals";
import { initializeFirebaseClient } from "./lib/firebase-client";
import MangaDataProvider from "./manga-data-provider";
import SiteFooter from "./site-footer";
import SiteHeader from "./site-header";

function alreadyInitialized(src: string): boolean {
  if (src.includes("firebase-app-compat.js")) return !!window.firebase?.initializeApp;
  if (src.includes("firebase-auth-compat.js")) return !!window.firebase?.auth;
  if (src.includes("firebase-firestore-compat.js")) return !!window.firebase?.firestore;
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

async function initializeSiteChrome(showChrome: boolean): Promise<void> {
  if (!showChrome) return;

  try {
    initializeFirebaseClient();
    await loadScript("https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js");
    await loadScript("https://www.gstatic.com/firebasejs/10.14.0/firebase-auth-compat.js");
    await loadScript("https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore-compat.js");
    if (!window.firebase) throw new Error("Firebase compat SDK tidak tersedia.");
    if (!window.firebase.apps.some((app) => app.name === "[DEFAULT]")) {
      window.firebase.initializeApp({
        apiKey: "AIzaSyCxufJubuS95zQnvctINvzj-H8WSIgsse4",
        authDomain: "widget-comment.firebaseapp.com",
        projectId: "widget-comment",
        storageBucket: "widget-comment.firebasestorage.app",
        messagingSenderId: "249700505242",
        appId: "1:249700505242:web:dab240af09caf30ad7f123",
      });
    }
  } catch (error) {
    console.error("Firebase halaman gagal diinisialisasi.", error);
  }

  if (showChrome && (!window.firestore || !window.fs)) {
    console.warn("Firebase katalog tidak tersedia; pencarian header tanpa data manga.");
  }

}

export default function SiteChrome({
  showChrome = true,
  showFooter = true,
}: {
  showChrome?: boolean;
  showFooter?: boolean;
}) {
  useEffect(() => {
    void initializeSiteChrome(showChrome).catch((error: unknown) => {
      console.error("Header dan footer gagal dimuat.", error);
    });
  }, [showChrome]);

  return showChrome || showFooter ? (
    <>
      {showChrome && <SiteHeader />}
      {showChrome && <GlobalAuth />}
      {showChrome && <UserModals />}
      {showChrome && <MangaDataProvider />}
      {showFooter && <SiteFooter />}
    </>
  ) : null;
}
