"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import SiteChrome from "../site-chrome";
import styles from "./login.module.css";

type CompatAuth = {
  onAuthStateChanged: (callback: (user: { uid: string } | null) => void) => () => void;
  signInWithEmailAndPassword: (email: string, password: string) => Promise<unknown>;
  createUserWithEmailAndPassword: (email: string, password: string) => Promise<unknown>;
};

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
  const [returnTo, setReturnTo] = useState("/");
  const [auth, setAuth] = useState<CompatAuth | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      if (!window.firebase.apps.length) window.firebase.initializeApp(firebaseConfig);
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

    setLoading(true);
    setError("");
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
    <>
      <SiteChrome showFooter={false} />
      <main className={styles.page}>
        <section className={styles.card} aria-labelledby="auth-title">
          <aside className={styles.intro} aria-label="Mikoroku membership">
            <div className={styles.art} aria-hidden="true">
              <span className={styles.artGlow} />
              <span className={styles.artOrbit} />
              <span className={styles.artBook}>M</span>
              <span className={styles.artSparkle}>✦</span>
            </div>
            <Link className={styles.brand} href="/" aria-label="Mikoroku home">
              <span className={styles.brandMark}>M</span>
              <span>Mikoroku</span>
            </Link>
            <div className={styles.introCopy}>
              <span className={styles.eyebrow}>YOUR READING, YOUR WAY</span>
              <h2>Find your next favorite story.</h2>
              <p>Keep your reading close and pick up right where the story left you.</p>
              <ul className={styles.benefits}>
                <li><span aria-hidden="true">◷</span> Keep track of your reading progress</li>
                <li><span aria-hidden="true">♡</span> Save series to your bookmarks</li>
                <li><span aria-hidden="true">✧</span> Join a community of fellow readers</li>
              </ul>
            </div>
            <span className={styles.panelFootnote}>A better place for your next chapter.</span>
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
              {isSignUp && <span className={styles.hint}>Use at least 6 characters.</span>}

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

            <Link className={styles.back} href={returnTo}>Back to previous page</Link>
          </div>
        </section>
      </main>
      <SiteChrome showChrome={false} />
    </>
  );
}
