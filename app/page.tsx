import HomepageIntegrations from "./homepage-integrations";

export default function HomePage() {
  return (
    <>
      <div id="site-header" />
      <main>
        <div id="buildlog-widget" />
        <div id="heroSection" />

        <div className="main-layout">
          <section className="content" aria-label="Katalog terbaru">
            <h2 className="section-title">
              <span>Latest Manga</span>
            </h2>
            <div id="githubManga" />
            <button id="loadMoreGithub" className="load-more-btn" type="button">
              Load more
            </button>

            <h2 className="section-title">
              <span>Random Doujin dan sejenisnya</span>
            </h2>
            <div id="firebaseManga" />
            <button id="loadMoreFirebase" className="load-more-btn" type="button">
              Load more
            </button>

            <h2 className="section-title">
              <span>Latest Novel</span>
            </h2>
            <div id="firebaseNovel" />

          </section>

          <aside className="sidebar" aria-label="Komunitas dan dukungan">
            <div id="popular-widget" />
            <div className="home-ad" id="home-ad" />
          </aside>
        </div>
      </main>
      <div id="site-footer" />
      <HomepageIntegrations />
    </>
  );
}
