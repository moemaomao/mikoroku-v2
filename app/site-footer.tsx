"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    _Hasync?: string[][];
    __mikorokuHistatsInitialized?: boolean;
  }
}

export default function SiteFooter({
  backgroundColor,
  removeTopGap = false,
}: {
  backgroundColor?: string;
  removeTopGap?: boolean;
}) {
  useEffect(() => {
    const histatsWrapper = document.getElementById("histats-wrapper");
    if (histatsWrapper) {
      const addAccessibleLabel = () => {
        const link = histatsWrapper.querySelector("a");
        if (!link) return false;
        if (!link.hasAttribute("aria-label")) {
          link.setAttribute("aria-label", "Histats Visitor Statistics");
        }
        return true;
      };

      if (!addAccessibleLabel()) {
        const observer = new MutationObserver(() => {
          if (addAccessibleLabel()) observer.disconnect();
        });
        observer.observe(histatsWrapper, { childList: true, subtree: true });
        return () => observer.disconnect();
      }
    }
  }, []);

  useEffect(() => {
    if (window.__mikorokuHistatsInitialized) return;

    window._Hasync = window._Hasync || [];
    window._Hasync.push(
      ["Histats.start", "1,4916560,4,2052,280,25,00010001"],
      ["Histats.fasi", "1"],
      ["Histats.track_hits", ""],
    );

    if (!document.querySelector('script[data-histats="mikoroku"]')) {
      const script = document.createElement("script");
      script.type = "text/javascript";
      script.async = true;
      script.src = "https://s10.histats.com/js15_as.js";
      script.dataset.histats = "mikoroku";
      script.onerror = () => console.error("Skrip statistik Histats gagal dimuat.");
      document.head.appendChild(script);
    }

    window.__mikorokuHistatsInitialized = true;
  }, []);

  return (
    <div id="site-footer" className="m-0 w-full p-0 transition-[margin,width] duration-300 min-[769px]:[body.sidebar-open_&]:ml-[var(--sidebar-width)] min-[769px]:[body.sidebar-open_&]:w-[calc(100%-var(--sidebar-width))]">
      <footer
        id="mainFooter"
        className="relative mt-10 w-full overflow-visible bg-transparent py-[50px] text-[#858585] transition-[margin,width] duration-300 max-[600px]:mt-[30px] max-[600px]:px-[15px] max-[600px]:pt-10 max-[600px]:pb-[30px] min-[768px]:py-[60px]"
        style={{
          backgroundColor: backgroundColor || "var(--mk-footer-bg, transparent)",
          marginTop: removeTopGap ? 0 : undefined,
          padding: removeTopGap ? "0 0 50px" : undefined,
        }}
      >
        <div
          className="site-footer-card mx-auto flex w-[calc(100%-20px)] max-w-[1900px] items-center justify-between gap-5 rounded-[18px] border border-white/10 px-[30px] py-[22px] max-[600px]:w-[calc(100%-1px)] max-[600px]:flex-col max-[600px]:gap-5 max-[600px]:px-5 max-[600px]:py-[25px] min-[768px]:px-10 min-[768px]:py-7"
          style={{
            backgroundColor: "var(--mk-footer-card-bg, rgba(15, 15, 25, 0.32))",
            borderColor: "var(--mk-footer-card-border, rgba(255, 255, 255, .12))",
            color: "var(--mk-footer-card-text, #d4d4d8)",
            WebkitBackdropFilter: "blur(28px) saturate(1.6)",
            backdropFilter: "blur(28px) saturate(1.6)",
          }}
        >
        <nav className="flex flex-wrap gap-4 max-[600px]:justify-center" aria-label="Informasi situs">
          <a className="text-[13px] text-[#ff5757] no-underline transition-colors duration-200 hover:text-[#4744ff]" style={{ color: "var(--mk-footer-link, #ff5757)" }} href="/privacy">Privacy Policy</a>
          <a className="text-[13px] text-[#ff5757] no-underline transition-colors duration-200 hover:text-[#4744ff]" style={{ color: "var(--mk-footer-link, #ff5757)" }} href="/dmca">DMCA</a>
          <a className="text-[13px] text-[#ff5757] no-underline transition-colors duration-200 hover:text-[#4744ff]" style={{ color: "var(--mk-footer-link, #ff5757)" }} href="/terms">Terms</a>
          <a className="text-[13px] text-[#ff5757] no-underline transition-colors duration-200 hover:text-[#4744ff]" style={{ color: "var(--mk-footer-link, #ff5757)" }} href="/about">About</a>
          <a className="text-[13px] text-[#ff5757] no-underline transition-colors duration-200 hover:text-[#4744ff]" style={{ color: "var(--mk-footer-link, #ff5757)" }} href="mailto:mikorokuscan@gmail.com">Contact</a>
        </nav>

        <div className="flex flex-col items-center text-center">
          <div className="mb-2 flex items-center justify-center gap-[10px] max-[768px]:mb-[10px]">
            <a
              href="https://discord.gg/kkt669knaG"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Discord"
              className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.06] text-[#008cff] transition-all duration-200 hover:border-[#5865f2] hover:bg-[#b2b8ff] hover:shadow-[0_0_16px_rgba(88,101,242,0.5)]"
            >
              <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20.317 4.369a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.249a18.27 18.27 0 0 0-5.487 0c-.164-.385-.398-.874-.61-1.249a.077.077 0 0 0-.079-.037 19.736 19.736 0 0 0-4.885 1.515.07.07 0 0 0-.032.027C.533 9.045-.32 13.579.099 18.057a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.873-1.295 1.226-1.994a.076.076 0 0 0-.041-.105 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.927 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .078.009c.12.099.246.197.373.291a.077.077 0 0 1-.006.128 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.04.106c.36.699.77 1.363 1.225 1.993a.076.076 0 0 0 .084.028 19.876 19.876 0 0 0 5.994-3.03.077.077 0 0 0 .03-.055c.5-5.177-.838-9.674-3.548-13.66a.061.061 0 0 0-.031-.30z" />
              </svg>
            </a>
            <a
              href="https://facebook.com/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.06] text-[#008cff] transition-all duration-200 hover:border-[#1877f2] hover:bg-[#b3d4ff] hover:shadow-[0_0_16px_rgba(24,119,242,0.5)]"
            >
              <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M22 12a10 10 0 1 0-11.63 9.87v-6.99H7.9V12h2.47V9.8c0-2.44 1.45-3.79 3.68-3.79 1.07 0 2.19.19 2.19.19v2.4h-1.23c-1.21 0-1.59.75-1.59 1.52V12h2.71l-.43 2.88h-2.28v6.99A10 10 0 0 0 22 12z" />
              </svg>
            </a>
          </div>

          <p className="mb-2 text-center max-[768px]:mb-[10px]">
            © {new Date().getFullYear()} <strong className="text-[#d66767]">Mikoroku.</strong> All Rights Reserved.
          </p>

          <div className="flex items-center justify-center gap-3">
            <div id="histats-wrapper" className="flex origin-center scale-[0.7] items-center justify-center max-[768px]:scale-[0.6]">
              <div id="histats_counter" />
            </div>
          </div>
        </div>
        </div>
      </footer>
    </div>
  );
}
