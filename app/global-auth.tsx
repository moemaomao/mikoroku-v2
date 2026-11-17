"use client";

import { useEffect } from "react";
import { syncReadingHistoryWithUser } from "../lib/reading-history";
import { syncLocalReadMarksWithUser } from "../lib/reading-stats";
import {
  getPendingProfileBanner,
  PROFILE_BANNER_QUEUED_EVENT,
  syncPendingProfileBanner,
  type ProfileBannerFirestore,
} from "../lib/profile-banner-sync";
import {
  COMMENT_BACKGROUND_QUEUED_EVENT,
  getPendingCommentBackgroundRetry,
  syncPendingCommentBackground,
  type CommentBackgroundFirestore,
} from "../lib/comment-background-sync";

type AuthProvider = {
  new (): unknown;
};

let profileBannerSyncUid = "";
let profileBannerRetryTimer: number | undefined;
let profileBannerSyncInProgress = false;
let profileBannerListenersAttached = false;
let commentBackgroundRetryTimer: number | undefined;
let commentBackgroundSyncInProgress = false;

export default function GlobalAuth() {
  useEffect(() => {
    let authInitializationErrorLogged = false;

    const clearProfileBannerRetry = () => {
      if (profileBannerRetryTimer !== undefined) {
        window.clearTimeout(profileBannerRetryTimer);
        profileBannerRetryTimer = undefined;
      }
    };

    const scheduleProfileBannerSync = (uid: string, nextAttemptAt: number) => {
      clearProfileBannerRetry();
      profileBannerRetryTimer = window.setTimeout(() => {
        profileBannerRetryTimer = undefined;
        void syncProfileBanner(uid);
      }, Math.max(1000, nextAttemptAt - Date.now()));
    };

    const clearCommentBackgroundRetry = () => {
      if (commentBackgroundRetryTimer !== undefined) {
        window.clearTimeout(commentBackgroundRetryTimer);
        commentBackgroundRetryTimer = undefined;
      }
    };

    const scheduleCommentBackgroundSync = (uid: string, nextAttemptAt: number) => {
      clearCommentBackgroundRetry();
      commentBackgroundRetryTimer = window.setTimeout(() => {
        commentBackgroundRetryTimer = undefined;
        void syncCommentBackground(uid);
      }, Math.max(1000, nextAttemptAt - Date.now()));
    };

    const syncCommentBackground = async (uid = profileBannerSyncUid) => {
      if (!uid || uid !== profileBannerSyncUid || commentBackgroundSyncInProgress) return;
      commentBackgroundSyncInProgress = true;
      try {
        const nextAttemptAt = await getPendingCommentBackgroundRetry(uid);
        if (nextAttemptAt === null) {
          clearCommentBackgroundRetry();
          return;
        }
        if (!navigator.onLine) return;
        if (nextAttemptAt > Date.now()) {
          scheduleCommentBackgroundSync(uid, nextAttemptAt);
          return;
        }

        const firebase = window.firebase as typeof window.firebase & {
          auth?: () => { currentUser: { uid: string } | null };
          firestore?: () => CommentBackgroundFirestore;
        };
        if (firebase?.auth?.().currentUser?.uid !== uid) return;
        const firestore = firebase.firestore?.();
        if (!firestore) return;

        const retryAt = await syncPendingCommentBackground(uid, firestore);
        if (uid !== profileBannerSyncUid) return;
        if (retryAt !== null) scheduleCommentBackgroundSync(uid, retryAt);
        else clearCommentBackgroundRetry();
      } catch (error) {
        console.warn("Queued comment background synchronization will retry later.", error);
        if (uid === profileBannerSyncUid) {
          scheduleCommentBackgroundSync(uid, Date.now() + 60_000);
        }
      } finally {
        commentBackgroundSyncInProgress = false;
        if (profileBannerSyncUid && profileBannerSyncUid !== uid) {
          void syncCommentBackground(profileBannerSyncUid);
        }
      }
    };

    const syncProfileBanner = async (uid = profileBannerSyncUid) => {
      if (!uid || uid !== profileBannerSyncUid || profileBannerSyncInProgress) return;
      const pending = getPendingProfileBanner(uid);
      if (!pending) {
        clearProfileBannerRetry();
        return;
      }
      if (!navigator.onLine) return;
      if (pending.nextAttemptAt > Date.now()) {
        scheduleProfileBannerSync(uid, pending.nextAttemptAt);
        return;
      }

      profileBannerSyncInProgress = true;
      try {
        const firebase = window.firebase as typeof window.firebase & {
          auth?: () => { currentUser: { uid: string } | null };
          firestore?: () => ProfileBannerFirestore;
        };
        if (firebase?.auth?.().currentUser?.uid !== uid) return;
        const firestore = firebase.firestore?.();
        if (!firestore) return;

        const remaining = await syncPendingProfileBanner(uid, firestore);
        if (uid !== profileBannerSyncUid) return;
        if (remaining) scheduleProfileBannerSync(uid, remaining.nextAttemptAt);
        else clearProfileBannerRetry();
      } catch (error) {
        console.warn("Queued profile banner synchronization will retry later.", error);
        if (uid === profileBannerSyncUid) {
          scheduleProfileBannerSync(uid, Date.now() + 60_000);
        }
      } finally {
        profileBannerSyncInProgress = false;
        if (profileBannerSyncUid && profileBannerSyncUid !== uid) {
          void syncProfileBanner(profileBannerSyncUid);
        }
      }
    };

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
          profileBannerSyncUid = user?.uid || "";
          clearProfileBannerRetry();
          clearCommentBackgroundRetry();
          void window.updateHeaderAuth?.();
          if (user) {
            void syncReadingHistoryWithUser(user.uid).catch((error: unknown) => {
              console.error("Could not sync reading history for the signed-in user.", error);
            });
            void syncLocalReadMarksWithUser(user.uid).catch((error: unknown) => {
              console.error("Could not sync local chapter reads for the signed-in user.", error);
            });
            void syncProfileBanner(user.uid);
            void syncCommentBackground(user.uid);
          }
        });
      }
      if (!profileBannerListenersAttached) {
        profileBannerListenersAttached = true;
        const retryPendingBanner = () => { void syncProfileBanner(); };
        const retryPendingCommentBackground = () => { void syncCommentBackground(); };
        window.addEventListener("online", retryPendingBanner);
        window.addEventListener(PROFILE_BANNER_QUEUED_EVENT, retryPendingBanner);
        window.addEventListener("online", retryPendingCommentBackground);
        window.addEventListener(COMMENT_BACKGROUND_QUEUED_EVENT, retryPendingCommentBackground);
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") {
            retryPendingBanner();
            retryPendingCommentBackground();
          }
        });
      }
      window.dispatchEvent(new Event("firebaseCompatReady"));
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
