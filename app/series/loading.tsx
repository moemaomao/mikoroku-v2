import SiteHeader from "../site-header";

export default function LoadingSeries() {
  return (
    <>
      <SiteHeader />
      <main className="route-page-background min-h-[calc(100vh-56px)]" aria-busy="true" />
    </>
  );
}
