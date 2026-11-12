"use client";

import { useEffect, useState, type FormEvent } from "react";
import styles from "./login.module.css";

type CompatAuth = {
  onAuthStateChanged: (callback: (user: { uid: string } | null) => void) => () => void;
  signInWithEmailAndPassword: (email: string, password: string) => Promise<unknown>;
  createUserWithEmailAndPassword: (email: string, password: string) => Promise<unknown>;
};

type LoginCover = {
  title: string;
  cover: string;
};

const COVER_COLUMN_COUNT = 12;
const COVER_COVERS_PER_COLUMN = 2;
const COVER_REPEAT_COUNT = 12;

const excludedGenres = new Set([
  "adult",
  "hentai",
  "ecchi",
  "erotica",
  "smut",
  "porn",
  "pornographic",
  "mature",
  "doujinshi",
]);

const firebaseConfig = {
  apiKey: "AIzaSyCxufJubuS95zQnvctINvzj-H8WSIgsse4",
  authDomain: "widget-comment.firebaseapp.com",
  projectId: "widget-comment",
  storageBucket: "widget-comment.firebasestorage.app",
  messagingSenderId: "249700505242",
  appId: "1:249700505242:web:dab240af09caf30ad7f123",
};

function loadScript(src: string): Promise<void> {
  const absoluteSrc = new URL(src, window.location.href).href;
  const existing = [...document.scripts].find((script) => script.src === absoluteSrc);
  if (existing && (existing.dataset.loaded === "true" || window.firebase?.auth)) {
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

function getAuthErrorMessage(error: unknown): string {
  const code = typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : "";

  switch (code) {
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/user-disabled":
      return "This account has been disabled. Please contact an administrator.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return "The email or password is incorrect.";
    case "auth/email-already-in-use":
      return "This email is already registered. Please sign in.";
    case "auth/weak-password":
      return "Password is too weak. Use at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    case "auth/network-request-failed":
      return "Connection failed. Check your internet connection and try again.";
    case "auth/operation-not-allowed":
      return "Email sign-in is not enabled.";
    default:
      return "Authentication failed. Please try again.";
  }
}

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [covers, setCovers] = useState<LoginCover[]>([]);
  const [returnTo, setReturnTo] = useState("/");
  const [auth, setAuth] = useState<CompatAuth | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    void fetch("/catalog/manga.json", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Manga catalog returned HTTP ${response.status}.`);
        const items: unknown = await response.json();
        if (!Array.isArray(items)) throw new Error("Manga catalog response must be an array.");

        const safeCovers = items.flatMap((item): LoginCover[] => {
          if (typeof item !== "object" || item === null) return [];
          const record = item as Record<string, unknown>;
          const title = typeof record.title === "string" ? record.title : "";
          const cover = [record.cover, record.img].find(
            (value): value is string => typeof value === "string" && /^https?:\/\//i.test(value),
          ) || "";
          const genres = Array.isArray(record.genres)
            ? record.genres.filter((genre): genre is string => typeof genre === "string")
            : [];
          if (!title || !cover || genres.some((genre) => excludedGenres.has(genre.trim().toLowerCase()))) {
            return [];
          }
          return [{ title, cover }];
        });
        setCovers(safeCovers.slice(0, 40));
      })
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted) {
          console.error("Could not load manga covers for the login page.", loadError);
        }
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const requestedReturn = new URLSearchParams(window.location.search).get("returnTo");
    const safeReturnTo = requestedReturn?.startsWith("/") && !requestedReturn.startsWith("//")
      ? requestedReturn
      : "/";
    setReturnTo(safeReturnTo);

    let active = true;
    let unsubscribe: (() => void) | undefined;

    void (async () => {
      await loadScript("https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js");
      await loadScript("https://www.gstatic.com/firebasejs/10.14.0/firebase-auth-compat.js");
      if (!window.firebase) throw new Error("Firebase Auth is unavailable.");
      if (!window.firebase.apps.some((app) => app.name === "[DEFAULT]")) {
        window.firebase.initializeApp(firebaseConfig);
      }
      const initializedAuth = window.firebase.auth();
      if (!active) return;
      setAuth(initializedAuth);
      unsubscribe = initializedAuth.onAuthStateChanged((user) => {
        if (active && user) window.location.replace(safeReturnTo);
      });
    })().catch((loadError: unknown) => {
      console.error("Failed to load Firebase Auth on the login page.", loadError);
      if (active) setError("Could not load the sign-in service. Reload the page and try again.");
    });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth) return;

    setError("");
    if (isSignUp && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await auth.createUserWithEmailAndPassword(email.trim(), password);
      } else {
        await auth.signInWithEmailAndPassword(email.trim(), password);
      }
      window.location.replace(returnTo);
    } catch (submitError: unknown) {
      setError(getAuthErrorMessage(submitError));
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="auth-title">
          <aside className={styles.intro} aria-label="Mikoroku membership">
            <div className={styles.coverWall} aria-hidden="true">
              {Array.from({ length: COVER_COLUMN_COUNT }, (_, column) => {
                const columnCovers = Array.from({ length: COVER_COVERS_PER_COLUMN }, (_, index) => (
                  covers.length ? covers[(column * COVER_COVERS_PER_COLUMN + index) % covers.length] : null
                )).filter((cover): cover is LoginCover => cover !== null);
                const repeatedCovers = Array.from({ length: COVER_REPEAT_COUNT }, () => columnCovers).flat();
                return (
                  <div className={styles.coverColumn} key={column}>
                    {repeatedCovers.map((cover, index) => (
                      <div className={styles.cover} key={`${cover.cover}-${index}`}>
                        <img alt="" loading="eager" src={cover.cover} />
                        <span>{cover.title}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
            <div className={styles.introShade} />
            <a className={styles.brand} href="/" aria-label="Mikoroku home">
              <img alt="" className={styles.brandLogo} src="/assets/icons/mikoroku.png" />
            </a>
            <div className={styles.introCopy}>
              <span className={styles.eyebrow}>YOUR NEXT CHAPTER STARTS HERE</span>
              <h2>Welcome back,<br /><em>Reader.</em></h2>
              <p>Pick up right where you left off.</p>
              <ul className={styles.benefits}>
                <li><span aria-hidden="true">▤</span><span><strong>Explore titles</strong><small>Manga, Manhwa, Manhua &amp; Novels</small></span></li>
                <li><span aria-hidden="true">♧</span><span><strong>Keep your place</strong><small>Pick up where you left off</small></span></li>
                <li><span aria-hidden="true">✧</span><span><strong>Save your favorites</strong><small>Build a library that feels like yours</small></span></li>
              </ul>
            </div>
            <span className={styles.panelFootnote}>A little more story in every day.</span>
          </aside>

          <div className={styles.formPanel}>
            <div className={styles.formHeading}>
              <span className={styles.accountIcon} aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="3.5" />
                  <path d="M5 20c.7-3.5 3.1-5.3 7-5.3s6.3 1.8 7 5.3" />
                </svg>
              </span>
              <div>
                <h1 id="auth-title">{isSignUp ? "Create your account" : "Welcome back"}</h1>
                <p>{isSignUp ? "Join Mikoroku and make it yours." : "Sign in to continue reading."}</p>
              </div>
            </div>

            <form className={styles.form} onSubmit={submit}>
              <div className={styles.formTabs} role="group" aria-label="Account action">
                <button
                  aria-pressed={!isSignUp}
                  className={!isSignUp ? styles.activeTab : ""}
                  onClick={() => {
                    setIsSignUp(false);
                    setError("");
                  }}
                  type="button"
                >
                  Log In
                </button>
                <button
                  aria-pressed={isSignUp}
                  className={isSignUp ? styles.activeTab : ""}
                  onClick={() => {
                    setIsSignUp(true);
                    setError("");
                  }}
                  type="button"
                >
                  Sign Up
                </button>
              </div>
              <label htmlFor="auth-email">Email address</label>
              <input
                autoComplete="email"
                id="auth-email"
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                required
                type="email"
                value={email}
              />

              <label htmlFor="auth-password">Password</label>
              <input
                autoComplete={isSignUp ? "new-password" : "current-password"}
                id="auth-password"
                minLength={6}
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 6 characters"
                required
                type="password"
                value={password}
              />
              {isSignUp && (
                <>
                  <label htmlFor="auth-confirm-password">Confirm password</label>
                  <input
                    autoComplete="new-password"
                    id="auth-confirm-password"
                    minLength={6}
                    name="confirmPassword"
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Re-enter your password"
                    required
                    type="password"
                    value={confirmPassword}
                  />
                  <span className={styles.hint}>Use at least 6 characters.</span>
                </>
              )}

              {error && <p className={styles.error} role="alert">{error}</p>}

              <button className={styles.submit} disabled={!auth || loading} type="submit">
                {loading ? "Please wait..." : isSignUp ? "Create account" : "Sign in"}
              </button>
            </form>

            <p className={styles.switchMode}>
              {isSignUp ? "Already have an account?" : "New to Mikoroku?"}{" "}
              <button
                onClick={() => {
                  setIsSignUp((current) => !current);
                  setError("");
                }}
                type="button"
              >
                {isSignUp ? "Sign in" : "Create an account"}
              </button>
            </p>

            <a className={styles.back} href={returnTo}>Back to previous page</a>
          </div>
      </section>
    </main>
  );
}
