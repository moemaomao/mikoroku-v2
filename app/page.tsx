import HomepageIntegrations from "./homepage-integrations";
import FirebasePostCatalog from "./firebase-post-catalog";
import GithubMangaCatalog from "./github-manga-catalog";
import HomeCommunityWidgets from "./home-community-widgets";
import { BannerAdSlot } from "./advertisement-manager";
import SiteFooter from "./site-footer";
import SiteHeader from "./site-header";
import { homepageSectionHeadingClass } from "./lib/homepage-classes";
import HeroFeatured from "./hero-featured";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <div id="home-hero-container">
          <HeroFeatured />
        </div>
        <BannerAdSlot placement="site-top" />
        <div className="main-layout home-page-layout mx-0 flex w-full items-start gap-5 px-4 transition-[margin-left,width] duration-300 min-[769px]:max-w-full min-[769px]:px-[15px] min-[769px]:gap-5 min-[1101px]:flex-row max-[1100px]:!my-0 max-[1100px]:!ml-0 max-[1100px]:!w-full max-[1100px]:!flex-col max-[1100px]:!gap-0 max-[1100px]:!px-3 min-[1400px]:gap-7 min-[1400px]:px-6 min-[1101px]:max-[1199px]:gap-4 min-[1101px]:max-[1199px]:px-[14px] max-[768px]:!px-[10px] max-[480px]:!px-2">
          <section className="content min-w-0 w-auto flex-[1_1_0%] max-[1100px]:!order-1 max-[1100px]:!w-full max-[1100px]:!flex-none" aria-label="Katalog terbaru">
            <GithubMangaCatalog>
              <h2 className={homepageSectionHeadingClass}>
                <span>Latest Manga</span>
              </h2>
            </GithubMangaCatalog>

            <FirebasePostCatalog />
            <BannerAdSlot placement="home-after-list" />
          </section>

          <aside className="sidebar sticky top-20 ml-auto mt-[11px] w-[260px] min-w-[240px] flex-[0_0_260px] self-start max-[1100px]:!relative max-[1100px]:!order-2 max-[1100px]:!mt-10 max-[1100px]:!min-h-0 max-[1100px]:!w-full max-[1100px]:!min-w-0 max-[1100px]:!flex-none max-[1100px]:!top-0 min-[769px]:max-[1100px]:!block min-[1400px]:w-[280px] min-[1400px]:min-w-[260px] min-[1400px]:flex-[0_0_280px] min-[1200px]:max-[1399px]:w-[260px] min-[1200px]:max-[1399px]:min-w-[240px] min-[1200px]:max-[1399px]:flex-[0_0_260px] min-[1101px]:max-[1199px]:w-[240px] min-[1101px]:max-[1199px]:min-w-[220px] min-[1101px]:max-[1199px]:flex-[0_0_240px] [body.right-sidebar-closed_&]:hidden" aria-label="Komunitas dan dukungan">
            <HomeCommunityWidgets />
            <BannerAdSlot placement="home-sidebar" />
          </aside>
        </div>
      </main>
      <SiteFooter />
      <HomepageIntegrations />
    </>
  );
}
