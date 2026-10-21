import type { Metadata } from "next";
import SiteChrome from "../site-chrome";
import AnnouncementsPage from "./announcements-page";

export const metadata: Metadata = {
  title: "Announcements - Mikoroku",
  description: "The latest updates and announcements from Mikoroku.",
};

export default function AnnouncementsRoute() {
  return (
    <>
      <SiteChrome showFooter={false} />
      <AnnouncementsPage />
      <SiteChrome showChrome={false} />
    </>
  );
}
