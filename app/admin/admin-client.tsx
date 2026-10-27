"use client";

import dynamic from "next/dynamic";

const AdminPage = dynamic(() => import("./admin-page"), {
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
      Loading admin...
    </div>
  ),
});

export default function AdminClient() {
  return <AdminPage />;
}
