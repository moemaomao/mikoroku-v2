import HomepageIntegrations from "./homepage-integrations";
import FirebasePostCatalog from "./firebase-post-catalog";
import GithubMangaCatalog from "./github-manga-catalog";
import HomeCommunityWidgets from "./home-community-widgets";
import SiteFooter from "./site-footer";
import SiteHeader from "./site-header";
import { homepageSectionHeadingClass } from "./lib/homepage-classes";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <div id="home-hero-container" />
        <div className="main-layout mx-0 flex w-full items-start gap-5 px-4 transition-[margin-left,width] duration-300 min-[769px]:ml-[var(--sidebar-width,240px)] min-[769px]:w-[calc(100%-var(--sidebar-width,240px))] min-[769px]:max-w-full min-[769px]:px-[15px] min-[769px]:gap-5 min-[1101px]:flex-row max-[1100px]:!my-0 max-[1100px]:!ml-0 max-[1100px]:!w-full max-[1100px]:!flex-col max-[1100px]:!gap-0 max-[1100px]:!px-3 min-[1400px]:gap-7 min-[1400px]:px-6 min-[1101px]:max-[1199px]:gap-4 min-[1101px]:max-[1199px]:px-[14px] max-[768px]:!px-[10px] max-[480px]:!px-2 [body.left-sidebar-closed_&]:!ml-0 [body.left-sidebar-closed_&]:!w-full">
          <section className="content min-w-0 w-auto flex-[1_1_0%] max-[1100px]:!order-1 max-[1100px]:!w-full max-[1100px]:!flex-none" aria-label="Katalog terbaru">
            <GithubMangaCatalog>
              <h2 className={homepageSectionHeadingClass}>
                <span>Latest Manga</span>
              </h2>
            </GithubMangaCatalog>

            <FirebasePostCatalog />
          </section>

          <aside className="sidebar sticky top-20 ml-auto mt-[11px] w-[300px] min-w-[280px] flex-[0_0_300px] self-start max-[1100px]:!relative max-[1100px]:!order-2 max-[1100px]:!mt-10 max-[1100px]:!min-h-0 max-[1100px]:!w-full max-[1100px]:!min-w-0 max-[1100px]:!flex-none max-[1100px]:!top-0 min-[769px]:max-[1100px]:!block min-[1400px]:w-[320px] min-[1400px]:min-w-[320px] min-[1400px]:flex-[0_0_320px] min-[1200px]:max-[1399px]:w-[300px] min-[1200px]:max-[1399px]:min-w-[300px] min-[1200px]:max-[1399px]:flex-[0_0_300px] min-[1101px]:max-[1199px]:w-[280px] min-[1101px]:max-[1199px]:min-w-[280px] min-[1101px]:max-[1199px]:flex-[0_0_280px] [body.right-sidebar-closed_&]:hidden" aria-label="Komunitas dan dukungan">
            <HomeCommunityWidgets />
            <div className="home-ad flex w-full justify-center [&_iframe]:overflow-hidden [&_iframe]:border-0" id="home-ad" />
          </aside>
        </div>
      </main>
      <SiteFooter />
      <HomepageIntegrations />
    </>
  );
}
