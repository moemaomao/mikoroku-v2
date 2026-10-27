import dynamic from "next/dynamic";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Moderator Panel - Mikoroku",
  robots: { index: false, follow: false },
};

const ModerationPage = dynamic(() => import("./moderation-page"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f1117",
        color: "#e8eaed",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      Loading moderator panel...
    </div>
  ),
});

export default function ModeratorRoute() {
  return <ModerationPage />;
}
