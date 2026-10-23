"use client";

import { useEffect, useRef, useState } from "react";

const trakteerWidgetUrl =
  "https://stream.trakteer.id/top-supporter/index.html?ts_font=Amaranth&ts_count=10&ts_theme=default&ts_1_clr1=rgba%28190%2C+30%2C+45%2C+1%29&ts_1_clr2=rgba%28254%2C+216%2C+73%2C+1%29&ts_1_clr3=rgba%28215%2C+216%2C+200%2C+1%29&ts_1_clr4=rgba%28243%2C+221%2C+202%2C+1%29&ts_1_clr5=rgba%28255%2C+255%2C+255%2C+1%29&ts_1_clr6=rgba%280%2C+0%2C+0%2C+1%29&ts_topthree=true&key=trstream-mzZFhwKT3ckqKvscQyBU&page_url=trakteer.id%2Fmikorokuscan%2Fgift&mod=3&hash=b9073anedkr4ekzg&timestamp=1763749149";

export default function HomeCommunityWidgets() {
  const containerRef = useRef<HTMLElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [nearViewport, setNearViewport] = useState(false);

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
    const container = chatContainerRef.current;
    if (!nearViewport || !container || container.dataset.loaded) return;
    container.dataset.loaded = "true";
    const script = document.createElement("script");
    script.id = "cid0020000395201926758";
    script.async = true;
    script.src = "https://st.chatango.com/js/gz/emb.js";
    script.setAttribute("data-cfasync", "false");
    script.style.cssText = "width:100% !important;height:100% !important;display:block;";
    script.textContent = JSON.stringify({
      handle: "mikorokugrup",
      arch: "js",
      styles: {
        a: "ffcc00",
        b: 100,
        c: "000000",
        d: "000000",
        k: "ffcc00",
        l: "ffcc00",
        m: "ffcc00",
        q: "ffcc00",
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
        <div className="mb-[14px] flex w-full items-center justify-center text-center text-sm font-semibold text-white before:h-px before:flex-1 before:bg-[var(--mikoroku-home-section-accent,#aaa)] before:content-[''] after:h-px after:flex-1 after:bg-[var(--mikoroku-home-section-accent,#aaa)] after:content-[''] [.light_&]:before:bg-[var(--mikoroku-home-section-accent,#aaa)] [.light_&]:after:bg-[var(--mikoroku-home-section-accent,#aaa)]">
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--mikoroku-home-section-accent,#aaa)] bg-[#1a1a1a] px-[14px] py-[5px] text-[13.5px] font-semibold leading-[1.3] text-[var(--mikoroku-home-section-text,currentColor)] [.light_&]:border-[var(--mikoroku-home-section-accent,#aaa)] [.light_&]:bg-[#f0f0f0] [.light_&]:text-[var(--mikoroku-home-section-text,#111)]">💬 Group Chat</span>
        </div>
        <div id="chatango-container" ref={chatContainerRef} className="relative h-[620px] min-h-[520px] w-full overflow-hidden rounded-xl bg-black min-[769px]:max-[1100px]:h-[480px] min-[769px]:max-[1100px]:min-h-[480px] max-[768px]:h-[420px] max-[768px]:min-h-[420px] max-[480px]:h-[380px] max-[480px]:min-h-[380px]" />
      </div>
      <div className="mb-7 last:mb-0">
        <div className="mb-[14px] flex w-full items-center justify-center text-center text-sm font-semibold text-white before:h-px before:flex-1 before:bg-[var(--mikoroku-home-section-accent,#aaa)] before:content-[''] after:h-px after:flex-1 after:bg-[var(--mikoroku-home-section-accent,#aaa)] after:content-[''] dark:before:bg-[var(--mikoroku-home-section-accent,#aaa)] dark:after:bg-[var(--mikoroku-home-section-accent,#aaa)]">
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--mikoroku-home-section-accent,#aaa)] bg-[#1a1a1a] px-[14px] py-[5px] text-[13.5px] font-semibold leading-[1.3] text-[var(--mikoroku-home-section-text,currentColor)] [.light_&]:border-[var(--mikoroku-home-section-accent,#aaa)] [.light_&]:bg-[#f0f0f0] [.light_&]:text-[var(--mikoroku-home-section-text,#111)]">🌟 Discord Server</span>
        </div>
        <div id="discord-container" className="min-h-[400px]">
          {nearViewport && (
            <iframe
              className="block w-full rounded-xl border-0"
              title="Discord Server"
              src="https://discord.com/widget?id=845650870833381396&theme=dark"
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
        <div className="mb-[14px] flex w-full items-center justify-center text-center text-sm font-semibold text-white before:h-px before:flex-1 before:bg-[var(--mikoroku-home-section-accent,#aaa)] before:content-[''] after:h-px after:flex-1 after:bg-[var(--mikoroku-home-section-accent,#aaa)] after:content-[''] [.light_&]:before:bg-[var(--mikoroku-home-section-accent,#aaa)] [.light_&]:after:bg-[var(--mikoroku-home-section-accent,#aaa)]">
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--mikoroku-home-section-accent,#aaa)] bg-[#1a1a1a] px-[14px] py-[5px] text-[13.5px] font-semibold leading-[1.3] text-[var(--mikoroku-home-section-text,currentColor)] [.light_&]:border-[var(--mikoroku-home-section-accent,#aaa)] [.light_&]:bg-[#f0f0f0] [.light_&]:text-[var(--mikoroku-home-section-text,#111)]">❤️ Top Supporter</span>
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
