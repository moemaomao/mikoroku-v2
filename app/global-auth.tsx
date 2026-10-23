"use client";

import { useEffect } from "react";

type AuthProvider = {
  new (): unknown;
};

export default function GlobalAuth() {
  useEffect(() => {
    const initialize = () => {
      const firebase = window.firebase;
      if (!firebase?.auth) return false;

      const auth = firebase.auth;
      window.triggerLogin = async (provider) => {
        if (provider === "email") {
          const returnTo = `${location.pathname}${location.search}${location.hash}`;
          location.assign(`/login?returnTo=${encodeURIComponent(returnTo)}`);
          return;
        }

        const constructors: Record<string, AuthProvider> = {
          google: auth.GoogleAuthProvider,
          github: auth.GithubAuthProvider,
          facebook: auth.FacebookAuthProvider,
          twitter: auth.TwitterAuthProvider,
        };
        const Provider = provider ? constructors[provider] : undefined;
        if (!Provider) return;

        try {
          await auth().signInWithPopup(new Provider());
        } catch (error) {
          console.error("Login dengan penyedia sosial gagal.", error);
        }
      };

      if (!window.__authListenerAttached) {
        window.__authListenerAttached = true;
        auth().onAuthStateChanged((user) => {
          window.currentUser = user;
          void window.updateHeaderAuth?.();
        });
      }
      return true;
    };

    if (initialize()) return;
    let timeout = 0;
    const interval = window.setInterval(() => {
      if (initialize()) {
        window.clearInterval(interval);
        window.clearTimeout(timeout);
      }
    }, 150);
    timeout = window.setTimeout(() => {
      window.clearInterval(interval);
      console.error("Firebase Auth was not available to initialize global authentication.");
    }, 15000);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, []);

  return null;
}
