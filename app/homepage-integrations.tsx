"use client";

import { useEffect } from "react";
import GlobalAuth from "./global-auth";
import UserModals from "./user-modals";
import { initializeFirebaseClient } from "./lib/firebase-client";
import MangaDataProvider from "./manga-data-provider";

type ScriptSource = {
  src?: string;
  type?: string;
  code?: string;
};

const scripts: ScriptSource[] = [
  { src: "https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js" },
  { src: "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth-compat.js" },
  { src: "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore-compat.js" },
  {
    code: `if(!firebase.apps.some(function(app){return app.name==="[DEFAULT]"})){firebase.initializeApp({apiKey:"AIzaSyCxufJubuS95zQnvctINvzj-H8WSIgsse4",authDomain:"widget-comment.firebaseapp.com",projectId:"widget-comment",storageBucket:"widget-comment.firebasestorage.app",messagingSenderId:"249700505242",appId:"1:249700505242:web:dab240af09caf30ad7f123"})}`,
  },
];

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
  initializeFirebaseClient();
  for (const [index, source] of scripts.entries()) {
    await loadScript(source, index);
  }
}

export default function HomepageIntegrations() {
  useEffect(() => {
    integrationsPromise ??= loadHomepageIntegrations();
    integrationsPromise.catch((error: unknown) => {
      console.error("Homepage integrations failed to initialize.", error);
    });
  }, []);

  return (
    <>
      <GlobalAuth />
      <UserModals />
      <MangaDataProvider />
    </>
  );
}
