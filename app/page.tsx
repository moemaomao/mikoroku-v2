import HomepageIntegrations from "./homepage-integrations";

const adFrameDocument = `<!DOCTYPE html>
<html>
  <head>
    <style>body{margin:0;padding:0;display:flex;justify-content:center;}</style>
  </head>
  <body>
    <script>
      (function(settings){
        var script = document.createElement("script");
        script.settings = settings || {};
        script.src = "//gummy-debt.com/b/XwVes.dqGml/0/YyWrcj/OeUmG9yuTZZUYlmkuPzTHcozVNEjfQPz-MXj-EotbNjznMk2dNKD/M/yQN/QU";
        script.async = true;
        script.referrerPolicy = "no-referrer-when-downgrade";
        document.body.appendChild(script);
      })({});
    </script>
  </body>
</html>`;

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
            <div className="home-ad">
              <iframe
                title="Advertisement"
                srcDoc={adFrameDocument}
                width="100%"
                height="250"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
              />
            </div>
          </aside>
        </div>
      </main>
      <div id="site-footer" />
      <HomepageIntegrations />
    </>
  );
}
