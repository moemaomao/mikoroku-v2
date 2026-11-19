import CenteredLoadingSpinner from "../centered-loading-spinner";
import SiteHeader from "../site-header";

export default function LoadingSeries() {
  return (
    <>
      <SiteHeader />
      <main className="route-page-background">
        <CenteredLoadingSpinner label="Memuat detail manga" />
      </main>
    </>
  );
}
