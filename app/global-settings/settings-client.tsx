"use client";

import dynamic from "next/dynamic";
import CenteredLoadingSpinner from "../centered-loading-spinner";

const GlobalSettingsPage = dynamic(() => import("./settings-page"), {
  ssr: false,
  loading: () => (
    <main
      className="route-page-background min-h-[calc(100vh-56px)]"
      style={{ backgroundColor: "var(--mk-page-bg, #0b0b0b)" }}
      aria-busy="true"
    >
      <CenteredLoadingSpinner label="Loading settings..." />
    </main>
  ),
});

export default function GlobalSettingsClient() {
  return <GlobalSettingsPage />;
}