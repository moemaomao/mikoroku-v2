import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

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
    <html lang="id" suppressHydrationWarning className="overflow-y-scroll">
      <head>
        <meta name="author" content="Mikoroku" />
        <meta name="theme-color" content="#7A0000" />
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
        <link rel="stylesheet" href="/style.css" data-main-style="true" />
      </head>
      <body suppressHydrationWarning className="pt-14!">
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var isDark=localStorage.getItem("darkMode")==="true";var roots=[document.documentElement,document.body];roots.forEach(function(root){root.classList.toggle("dark",isDark);root.classList.toggle("light",!isDark)})})();`,
          }}
        />
        {children}
      </body>
    </html>
  );
}