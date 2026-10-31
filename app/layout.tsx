import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AdvertisementManager } from "./advertisement-manager";
import NextTopLoader from "nextjs-toploader";

export const metadata: Metadata = {
  metadataBase: new URL("https://mikoroku.top"),
  title: "Mikoroku - Borderline H scans",
  description: "Mikoroku - Platform baca manga bahasa Indonesia.",
  keywords: [
    "baca manga gratis",
    "manga indonesia",
    "komik online",
    "chapter terbaru",
    "mikoroku manga",
  ],
  openGraph: {
    title: "Mikoroku - Baca Manga Gratis",
    description: "Platform baca manga bahasa Indonesia terlengkap",
    type: "website",
    url: "https://mikoroku.top/",
    siteName: "Mikoroku",
    images: [
      {
        url: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhlpxqlAz__8_IHcJpy_JsiuX2dr0ompUWEoaUjtk279x167sNP1AphlLYw92AECMAcyXEg4bSnNcGnKZ86a3KEFGHwyi1huUIJ52zejDYkSeeTEnCL4Loig440EuS6yyeKZjmnAdkdcxsic5rArUT_bwv2Sk4lJgDXSYFSWLBawxBPBjGZPTS-pp2xTsc/s100/MIKOROKU.png",
        width: 1000,
        height: 430,
        alt: "Mikoroku - web manga",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mikoroku - Baca Manga Gratis",
    description: "Platform baca manga bahasa Indonesia terlengkap",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/assets/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/assets/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/assets/icons/favicon.ico" },
    ],
    apple: "/assets/icons/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className="overflow-y-scroll [--sidebar-width:280px] [--gap:12px] [--radius:10px]"
      style={{ backgroundColor: "#0b0b0b" }}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var isDark=true;try{isDark=localStorage.getItem("darkMode")!=="false"}catch(e){}var root=document.documentElement;root.classList.toggle("dark",isDark);root.classList.toggle("light",!isDark);root.style.backgroundColor=isDark?"#0b0b0b":"#f8f9fa";root.style.colorScheme=isDark?"dark":"light";try{var appearance=JSON.parse(localStorage.getItem("mikoroku_global_appearance_v1")||"null");root.dataset.cardDisplay=appearance&&appearance.cardDisplay==="list"?"list":"default"}catch(e){root.dataset.cardDisplay="default"}root.style.setProperty("--mk-page-bg",isDark?"#0b0b0b":"#f8f9fa");root.style.setProperty("--mk-route-text",isDark?"#ffffff":"#1e293b");root.style.setProperty("--mk-bookmark-container",isDark?"#0f0f1e":"#ffffff");root.style.setProperty("--mk-bookmark-text",isDark?"#ffffff":"#111827");root.style.setProperty("--mk-commission-card-bg",isDark?"#171725":"#ffffff");root.style.setProperty("--mk-commission-card-text",isDark?"#e2e8f0":"#1e293b");root.style.setProperty("--mk-footer-bg",isDark?"#0b0b0b":"#f8f9fa");root.style.setProperty("--mk-footer-card-bg",isDark?"rgba(23,23,37,.96)":"rgba(255,255,255,.94)");root.style.setProperty("--mk-footer-card-border",isDark?"rgba(255,255,255,.1)":"rgba(15,23,42,.12)");root.style.setProperty("--mk-footer-card-text",isDark?"#d4d4d8":"#334155");root.style.setProperty("--mk-footer-link",isDark?"#ff5757":"#be123c");})();`,
          }}
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `html,body{background-color:var(--mk-page-bg,#0b0b0b)!important;}html.light,body.light{background-color:#f8f9fa!important;color:#1e293b!important;--mk-page-bg:#f8f9fa;color-scheme:light;}html.dark,body.dark{background-color:#0b0b0b!important;color:#fff!important;--mk-page-bg:#0b0b0b;color-scheme:dark;}html .route-page-background{background-color:var(--mk-page-bg,#0b0b0b)!important;}html.light .route-page-background,body.light .route-page-background{background-color:#f8f9fa!important;color:#1e293b;}html.light .commission-page,body.light .commission-page{background-image:radial-gradient(ellipse at top,rgba(217,70,239,.12),transparent 50%),radial-gradient(ellipse at bottom right,rgba(244,63,94,.1),transparent 40%)!important;}html.light #mainFooter .site-footer-card,body.light #mainFooter .site-footer-card{border-color:rgba(15,23,42,.12)!important;background-color:rgba(255,255,255,.94)!important;color:#334155!important;}html.light #mainFooter nav a,body.light #mainFooter nav a{color:#be123c!important;}html.light #mainFooter p,body.light #mainFooter p{color:#475569!important;}html.dark .bookmark-route .bookmark-container{background-color:#0f0f1e!important;}html.dark .bookmark-route .bookmark-card{background-color:rgba(255,255,255,.05)!important;}html.dark .commission-card{background-color:#171725!important;}html.dark .legal-page-card{background-color:rgba(20,20,24,.82)!important;}html.dark [data-route-card="settings"]{background-color:#191a20!important;}html.dark [data-route-card="settings-inset"]{background-color:rgba(255,255,255,.03)!important;}html.dark [data-route-card="settings-toggle"],html.dark [data-route-card="settings-option"]{background-color:rgba(255,255,255,.04)!important;}#mainHeader{background:rgba(9,9,11,.92)!important;border-bottom:1px solid rgb(63 63 70)!important;color:#fff!important;}#mainHeader button,#mainHeader a,#mainHeader svg{color:inherit;}html.light #mainHeader{background:rgba(255,255,255,.88)!important;border-bottom-color:#d4d4d8!important;color:#18181b!important;}`,
          }}
        />
        <meta name="author" content="Mikoroku" />
        <meta name="theme-color" content="#7A0000" />
        <meta name="36b5c8cd1a2e7f2ae448252f862af29bf0ba6ff9" content="36b5c8cd1a2e7f2ae448252f862af29bf0ba6ff9" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://blogger.googleusercontent.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Kodchasan:wght@400;500;600;700&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=Merriweather:wght@400;700&family=Roboto:wght@400;500&family=Open+Sans:wght@400;600&family=Nunito:wght@400;600;700&family=Patrick+Hand&family=Caveat:wght@400;500;600;700&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bangers&family=Cinzel:wght@600;700&family=Creepster&family=MedievalSharp&family=Noto+Sans+JP:wght@500;700&family=Orbitron:wght@500;700&family=Pacifico&family=Press+Start+2P&family=Share+Tech+Mono&family=VT323&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
          data-fa="true"
        />
      </head>
      <body suppressHydrationWarning className="m-0 min-h-dvh overflow-x-clip bg-[#0b0b0b] pt-14! font-['Kodchasan',Arial,sans-serif] leading-[1.4] text-white antialiased [text-rendering:optimizeLegibility] dark:bg-[#0b0b0b] dark:text-white">
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var root=document.documentElement;document.body.classList.toggle("dark",root.classList.contains("dark"));document.body.classList.toggle("light",root.classList.contains("light"))})();`,
          }}
        />
        <NextTopLoader
          color="#ef4444"
          height={2}
          crawl={false}
          showSpinner={false}
          speed={250}
        />
        <AdvertisementManager>{children}</AdvertisementManager>
      </body>
    </html>
  );
}