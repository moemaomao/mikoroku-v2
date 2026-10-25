"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const FUNNY_LINES = [
  "If you're looking for porn, this is not the place.",
  "This page packed its bags and left without telling anyone.",
  "404: the chapter you wanted is currently in another castle.",
  "We checked under the bed. Still nothing.",
  "Even the emergency server shrugged and walked away.",
  "This URL went on a vacation and forgot to send a postcard.",
  "Not lost. Just extremely committed to not existing.",
  "The manga is real. This page is not.",
  "You found the secret room. Unfortunately it's empty.",
  "Touch grass, then try a real series page.",
];

export default function NotFound() {
  const [joke, setJoke] = useState(FUNNY_LINES[0]);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setJoke(FUNNY_LINES[Math.floor(Math.random() * FUNNY_LINES.length)]);

    const readTheme = () => {
      const dark =
        document.documentElement.classList.contains("dark") ||
        document.body.classList.contains("dark") ||
        (!document.documentElement.classList.contains("light") &&
          !document.body.classList.contains("light") &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      setIsDark(dark);
    };

    readTheme();
    const observer = new MutationObserver(readTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    window.addEventListener("storage", readTheme);
    return () => {
      observer.disconnect();
      window.removeEventListener("storage", readTheme);
    };
  }, []);

  return (
    <main
      className={`relative flex min-h-[calc(100dvh-3.5rem)] flex-col items-center justify-center overflow-hidden px-4 py-16 text-center transition-colors ${
        isDark ? "bg-[#0b0b0b] text-white" : "bg-[#f8f9fa] text-zinc-900"
      }`}
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className={`absolute left-1/2 top-[18%] h-[420px] w-[420px] -translate-x-1/2 rounded-full blur-2xl ${
            isDark
              ? "bg-[radial-gradient(circle,color-mix(in_srgb,var(--mikoroku-accent,#9d1018)_28%,transparent)_0%,transparent_70%)]"
              : "bg-[radial-gradient(circle,color-mix(in_srgb,var(--mikoroku-accent,#9d1018)_18%,transparent)_0%,transparent_70%)]"
          }`}
        />
        <div
          className={`absolute bottom-[10%] left-[12%] h-48 w-48 rounded-full blur-xl ${
            isDark
              ? "bg-[radial-gradient(circle,rgba(59,130,246,0.12)_0%,transparent_70%)]"
              : "bg-[radial-gradient(circle,rgba(59,130,246,0.08)_0%,transparent_70%)]"
          }`}
        />
        <div
          className={`absolute bottom-[18%] right-[10%] h-40 w-40 rounded-full blur-xl ${
            isDark
              ? "bg-[radial-gradient(circle,rgba(245,158,11,0.1)_0%,transparent_70%)]"
              : "bg-[radial-gradient(circle,rgba(245,158,11,0.08)_0%,transparent_70%)]"
          }`}
        />
      </div>

      <div className="relative z-[1] w-full max-w-lg">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--mikoroku-accent,#9d1018)]">
          Error 404
        </p>

        <div className="relative mx-auto mb-6 select-none">
          <span
            className={`block text-[clamp(5.5rem,18vw,8.5rem)] font-black leading-none tracking-tight ${
              isDark ? "text-white/[0.06]" : "text-zinc-900/[0.06]"
            }`}
          >
            404
          </span>
          <span className="absolute inset-0 flex items-center justify-center text-[clamp(5.5rem,18vw,8.5rem)] font-black leading-none tracking-tight text-transparent [-webkit-text-stroke:1.5px_color-mix(in_srgb,var(--mikoroku-accent,#9d1018)_55%,transparent)]">
            404
          </span>
        </div>

        <h1
          className={`text-2xl font-bold tracking-tight sm:text-3xl ${
            isDark ? "text-white" : "text-zinc-900"
          }`}
        >
          Page not found
        </h1>
        <p
          className={`mx-auto mt-3 max-w-md text-sm leading-relaxed sm:text-[15px] ${
            isDark ? "text-slate-400" : "text-slate-600"
          }`}
        >
          The page you are looking for does not exist, was moved, or the link is incorrect.
        </p>

        <p
          className={`mx-auto mt-4 max-w-md rounded-2xl border px-4 py-3 text-sm font-medium italic leading-relaxed ${
            isDark
              ? "border-white/10 bg-white/[0.04] text-zinc-200"
              : "border-black/10 bg-white text-zinc-800 shadow-sm"
          }`}
        >
          “{joke}”
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--mikoroku-accent,#9d1018)] px-5 py-2.5 text-sm font-semibold text-white no-underline shadow-[0_8px_24px_color-mix(in_srgb,var(--mikoroku-accent,#9d1018)_35%,transparent)] transition hover:-translate-y-0.5 hover:brightness-110"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M15 19l-7-7 7-7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Back to home
          </Link>
          <Link
            href="/manga-list"
            className={`inline-flex items-center justify-center rounded-xl border px-5 py-2.5 text-sm font-semibold no-underline transition hover:border-[var(--mikoroku-accent,#9d1018)] hover:text-[var(--mikoroku-accent,#9d1018)] ${
              isDark
                ? "border-white/12 bg-white/[0.04] text-zinc-100"
                : "border-black/10 bg-white text-zinc-800 shadow-sm"
            }`}
          >
            Browse manga
          </Link>
        </div>

        <p className={`mt-10 text-xs ${isDark ? "text-slate-500" : "text-slate-500"}`}>
          If you followed a shared link, the series slug may have changed.
        </p>
      </div>
    </main>
  );
}
