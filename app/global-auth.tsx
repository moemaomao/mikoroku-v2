"use client";

import { useEffect } from "react";

type AuthProvider = {
  new (): unknown;
};

export default function GlobalAuth() {
  useEffect(() => {
    let authInitializationErrorLogged = false;
    const initialize = () => {
      const firebase = window.firebase;
      if (!firebase?.auth || !firebase.apps.some((app) => app.name === "[DEFAULT]")) return false;

      const auth = firebase.auth;
      let authInstance: ReturnType<typeof auth>;
      try {
        authInstance = auth();
      } catch (error) {
        if (!authInitializationErrorLogged) {
          console.error("Firebase Auth could not initialize.", error);
          authInitializationErrorLogged = true;
        }
        return false;
      }
      authInitializationErrorLogged = false;

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
          await authInstance.signInWithPopup(new Provider());
        } catch (error) {
          console.error("Login dengan penyedia sosial gagal.", error);
        }
      };

      if (!window.__authListenerAttached) {
        window.__authListenerAttached = true;
        authInstance.onAuthStateChanged((user) => {
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
