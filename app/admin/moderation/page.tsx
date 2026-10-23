import type { Metadata } from "next";
import ModerationPage from "./moderation-page";

export const metadata: Metadata = {
  title: "Moderator Panel - Mikoroku",
  robots: { index: false, follow: false },
};

export default function ModeratorRoute() {
  return <ModerationPage />;
}
