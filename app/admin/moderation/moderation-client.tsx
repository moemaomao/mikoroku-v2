"use client";

import dynamic from "next/dynamic";

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

export default function ModerationClient() {
  return <ModerationPage />;
}
