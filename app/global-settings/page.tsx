import type { Metadata } from "next";
import GlobalSettingsPage from "./settings-page";

export const metadata: Metadata = {
  title: "Global Settings - Mikoroku",
  description: "Atur tampilan katalog Mikoroku.",
  robots: { index: false, follow: false },
};

export default function GlobalSettingsRoute() {
  return <GlobalSettingsPage />;
}
