"use client";

import { useEffect, useRef, useState } from "react";

const trakteerWidgetUrl =
  "https://stream.trakteer.id/top-supporter/index.html?ts_font=Amaranth&ts_count=10&ts_theme=default&ts_1_clr1=rgba%28190%2C+30%2C+45%2C+1%29&ts_1_clr2=rgba%28254%2C+216%2C+73%2C+1%29&ts_1_clr3=rgba%28215%2C+216%2C+200%2C+1%29&ts_1_clr4=rgba%28243%2C+221%2C+202%2C+1%29&ts_1_clr5=rgba%28255%2C+255%2C+255%2C+1%29&ts_1_clr6=rgba%280%2C+0%2C+0%2C+1%29&ts_topthree=true&key=trstream-mzZFhwKT3ckqKvscQyBU&page_url=trakteer.id%2Fmikorokuscan%2Fgift&mod=3&hash=b9073anedkr4ekzg&timestamp=1763749149";

export default function HomeCommunityWidgets() {
  const containerRef = useRef<HTMLElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [nearViewport, setNearViewport] = useState(false);
  const [discordOpen, setDiscordOpen] = useState(false);
  const [discordTheme, setDiscordTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      setNearViewport(true);
      observer.disconnect();
    }, { rootMargin: "200px" });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const readTheme = () => {
      const isDark =
        document.documentElement.classList.contains("dark") ||
        document.body.classList.contains("dark");
      setDiscordTheme(isDark ? "dark" : "light");
    };
    readTheme();
    const observer = new MutationObserver(readTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    window.addEventListener("storage", readTheme);
    return () => {
      observer.disconnect();
      window.removeEventListener("storage", readTheme);
    };
  }, []);

  useEffect(() => {
    const container = chatContainerRef.current;
    if (!nearViewport || !container || container.dataset.loaded) return;
    container.dataset.loaded = "true";
    const script = document.createElement("script");
    script.id = "cid0020000395201926758";
    script.async = true;
    script.src = "https://st.chatango.com/js/gz/emb.js";
    script.setAttribute("data-cfasync", "false");
    script.style.cssText = "width:100% !important;height:100% !important;display:block;";
    const accentRaw =
      getComputedStyle(document.documentElement).getPropertyValue("--mikoroku-accent").trim() ||
      "#9d1018";
    const accentHex = accentRaw.startsWith("#") ? accentRaw.slice(1) : "9d1018";
    const isDark =
      document.documentElement.classList.contains("dark") ||
      document.body.classList.contains("dark");
    script.textContent = JSON.stringify({
      handle: "mikorokugrup",
      arch: "js",
      styles: {
        a: accentHex,
        b: 100,
        c: isDark ? "ffffff" : "111111",
        d: isDark ? "ffffff" : "111111",
        k: accentHex,
        l: accentHex,
        m: accentHex,
        n: isDark ? "1a1a1a" : "f5f5f5",
        p: isDark ? "ffffff" : "111111",
        q: accentHex,
        r: 100,
        cnrs: "1",
      },
    });
    container.appendChild(script);
    const styleEmbed = () => {
      container.querySelectorAll<HTMLElement>(':scope > div, :scope > iframe, div[id^="cid"], iframe').forEach((element) => {
        element.classList.add("relative", "m-0", "block", "h-full", "w-full", "max-w-full");
        element.style.setProperty("position", "relative", "important");
        element.style.setProperty("width", "100%", "important");
        element.style.setProperty("height", "100%", "important");
        element.style.setProperty("max-width", "100%", "important");
        element.style.setProperty("left", "auto", "important");
        element.style.setProperty("right", "auto", "important");
        element.style.setProperty("top", "auto", "important");
        element.style.setProperty("bottom", "auto", "important");
        element.style.setProperty("margin", "0", "important");
      });
      container.querySelectorAll("iframe").forEach((frame) => {
        frame.classList.add("rounded-xl", "border-0");
      });
    };
    const embedObserver = new MutationObserver(styleEmbed);
    embedObserver.observe(container, { childList: true, subtree: true });
    styleEmbed();
    return () => {
      embedObserver.disconnect();
      script.remove();
      delete container.dataset.loaded;
    };
  }, [nearViewport]);

  return (
    <section id="popular-widget" ref={containerRef} aria-label="Community widgets">
      <div className="mb-7 last:mb-0">
        <div className="mb-[14px] flex w-full items-center justify-center text-center text-sm font-semibold text-zinc-800 dark:text-white before:h-px before:flex-1 before:bg-[var(--mikoroku-home-section-accent,#aaa)] before:content-[''] after:h-px after:flex-1 after:bg-[var(--mikoroku-home-section-accent,#aaa)] after:content-['']">
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--mikoroku-home-section-accent,#aaa)] bg-[#f0f0f0] px-[14px] py-[5px] text-[13.5px] font-semibold leading-[1.3] text-[var(--mikoroku-home-section-text,#111)] dark:bg-[#1a1a1a] dark:text-[var(--mikoroku-home-section-text,currentColor)]">💬 Group Chat</span>
        </div>
        <div id="chatango-container" ref={chatContainerRef} className="relative h-[620px] min-h-[520px] w-full overflow-hidden rounded-xl bg-black min-[769px]:max-[1100px]:h-[480px] min-[769px]:max-[1100px]:min-h-[480px] max-[768px]:h-[420px] max-[768px]:min-h-[420px] max-[480px]:h-[380px] max-[480px]:min-h-[380px]" />
      </div>
      <div className="mb-7 last:mb-0">
        <div className="mb-[14px] flex w-full items-center justify-center text-center text-sm font-semibold text-zinc-800 dark:text-white before:h-px before:flex-1 before:bg-[var(--mikoroku-home-section-accent,#aaa)] before:content-[''] after:h-px after:flex-1 after:bg-[var(--mikoroku-home-section-accent,#aaa)] after:content-['']">
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--mikoroku-home-section-accent,#aaa)] bg-[#f0f0f0] px-[14px] py-[5px] text-[13.5px] font-semibold leading-[1.3] text-[var(--mikoroku-home-section-text,#111)] dark:bg-[#1a1a1a] dark:text-[var(--mikoroku-home-section-text,currentColor)]">🌟 Discord Server</span>
        </div>
        <div id="discord-container" className="min-h-[400px]">
          {!discordOpen ? (
            <button
              type="button"
              className="flex min-h-[400px] w-full items-center justify-center rounded-xl border border-[var(--mikoroku-home-section-accent,#aaa)] bg-[#f0f0f0] px-5 text-center text-sm font-semibold text-[var(--mikoroku-home-section-text,#111)] transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mikoroku-home-section-accent,#aaa)] dark:bg-[#1a1a1a] dark:text-[var(--mikoroku-home-section-text,currentColor)] max-[768px]:min-h-[320px]"
              onClick={() => setDiscordOpen(true)}
              aria-expanded="false"
            >
              <span className="inline-flex items-center gap-2 rounded-lg bg-[#5865f2] px-4 py-2.5 text-white shadow-sm">
                <svg
                  aria-hidden="true"
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M19.54 5.32A16.9 16.9 0 0 0 15.4 4l-.5 1.02a15.4 15.4 0 0 0-5.8 0L8.6 4a16.9 16.9 0 0 0-4.14 1.32C1.84 9.18 1.13 12.95 1.48 16.66a16.7 16.7 0 0 0 5.08 2.58l1.23-1.67c-.68-.25-1.33-.56-1.94-.92l.48-.37c3.74 1.75 7.8 1.75 11.5 0l.49.37c-.62.36-1.27.67-1.95.92l1.23 1.67a16.7 16.7 0 0 0 5.08-2.58c.41-4.3-.7-8.03-3.14-11.34ZM8.1 14.8c-1.1 0-2-1-2-2.23s.88-2.23 2-2.23 2.02 1 2 2.23-.9 2.23-2 2.23Zm7.8 0c-1.1 0-2-1-2-2.23s.88-2.23 2-2.23 2.02 1 2 2.23-.9 2.23-2 2.23Z" />
                </svg>
                <span>Open Discord Server</span>
              </span>
            </button>
          ) : (
            <iframe
              key={discordTheme}
              className="block w-full rounded-xl border-0"
              title="Discord Server"
              src={`https://discord.com/widget?id=845650870833381396&theme=${discordTheme}`}
              width="100%"
              height="400"
              frameBorder="0"
              loading="lazy"
              sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
            />
          )}
        </div>
      </div>
      <div className="mb-7 last:mb-0">
        <div className="mb-[14px] flex w-full items-center justify-center text-center text-sm font-semibold text-zinc-800 dark:text-white before:h-px before:flex-1 before:bg-[var(--mikoroku-home-section-accent,#aaa)] before:content-[''] after:h-px after:flex-1 after:bg-[var(--mikoroku-home-section-accent,#aaa)] after:content-['']">
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--mikoroku-home-section-accent,#aaa)] bg-[#f0f0f0] px-[14px] py-[5px] text-[13.5px] font-semibold leading-[1.3] text-[var(--mikoroku-home-section-text,#111)] dark:bg-[#1a1a1a] dark:text-[var(--mikoroku-home-section-text,currentColor)]">❤️ Top Supporter</span>
        </div>
        <div id="trakteer-container" className="min-h-[400px]">
          {nearViewport && (
            <iframe
              className="block w-full rounded-xl border-0"
              title="Top Supporter"
              src={trakteerWidgetUrl}
              height="400"
              width="100%"
              frameBorder="0"
              scrolling="auto"
              loading="lazy"
              style={{ border: 0, borderRadius: 12 }}
            />
          )}
        </div>
      </div>
    </section>
  );
}
