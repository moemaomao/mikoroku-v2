import type { Metadata } from "next";
import GlobalSettingsClient from "./settings-client";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Global Settings - Mikoroku",
  description: "Configure Mikoroku catalog layout and display options.",
  robots: { index: false, follow: false },
};

export default function GlobalSettingsRoute() {
  return <GlobalSettingsClient />;
}
