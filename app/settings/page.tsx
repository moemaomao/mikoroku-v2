import type { Metadata } from "next";
import SettingsPage from "./settings-page";

export const metadata: Metadata = {
  title: "Pengaturan - Mikoroku",
  description: "Atur profil dan preferensi akun Mikoroku.",
  robots: { index: false, follow: false },
};

export default function SettingsRoute() {
  return <SettingsPage />;
}
