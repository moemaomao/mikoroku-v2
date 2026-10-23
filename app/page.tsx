import HomepageIntegrations from "./homepage-integrations";
import SiteFooter from "./site-footer";
import SiteHeader from "./site-header";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <div
          id="heroSection"
          className="[&_.hero-nav]:!bg-[var(--mikoroku-hero-nav)] [&_.hero-nav]:!text-white [&_.hero-dot]:!bg-[var(--mikoroku-hero-dot)] [&_.hero-dot.is-active]:!bg-[var(--mikoroku-hero-dot-active)]"
        />

        <div className="main-layout">
          <section className="content [&_.up-badge]:!bg-[var(--mikoroku-home-up)]" aria-label="Katalog terbaru">
            <h2 className="section-title before:!bg-[var(--mikoroku-home-section-accent)] after:!bg-[var(--mikoroku-home-section-accent)] [&>span]:!border-[var(--mikoroku-home-section-accent)] [&>span]:!text-[var(--mikoroku-home-section-text)]">
              <span>Latest Manga</span>
            </h2>
            <div id="githubManga" />
            <button id="loadMoreGithub" className="load-more-btn !bg-[var(--mikoroku-home-load-more)] hover:!bg-[var(--mikoroku-home-load-more-hover)] focus-visible:!outline-[var(--mikoroku-home-load-more)]" type="button">
              Load more
            </button>

            <h2 className="section-title before:!bg-[var(--mikoroku-home-section-accent)] after:!bg-[var(--mikoroku-home-section-accent)] [&>span]:!border-[var(--mikoroku-home-section-accent)] [&>span]:!text-[var(--mikoroku-home-section-text)]">
              <span>Random Doujin dan sejenisnya</span>
            </h2>
            <div id="firebaseManga" />
            <button id="loadMoreFirebase" className="load-more-btn !bg-[var(--mikoroku-home-load-more)] hover:!bg-[var(--mikoroku-home-load-more-hover)] focus-visible:!outline-[var(--mikoroku-home-load-more)]" type="button">
              Load more
            </button>

            <h2 className="section-title before:!bg-[var(--mikoroku-home-section-accent)] after:!bg-[var(--mikoroku-home-section-accent)] [&>span]:!border-[var(--mikoroku-home-section-accent)] [&>span]:!text-[var(--mikoroku-home-section-text)]">
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
      <SiteFooter />
      <HomepageIntegrations />
    </>
  );
}
