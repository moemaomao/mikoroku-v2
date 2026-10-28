"use client";

import dynamic from "next/dynamic";

const GlobalSettingsPage = dynamic(() => import("./settings-page"), {
  ssr: false,
  loading: () => (
    <main
      className="route-page-background min-h-[calc(100vh-56px)] px-4 py-8 text-slate-900 dark:text-slate-100 sm:px-6 sm:py-12"
      style={{ backgroundColor: "var(--mk-page-bg, #0b0b0b)", color: "var(--mk-route-text, #fff)" }}
    >
      <div className="mx-auto max-w-3xl" aria-busy="true">
        <h1 className="mt-2 text-3xl font-bold">Global Settings</h1>
        <p className="mt-2 text-sm" role="status">Loading settings...</p>
      </div>
    </main>
  ),
});

export default function GlobalSettingsClient() {
  return <GlobalSettingsPage />;
}
