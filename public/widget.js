const initWidgets = () => {
  const container = document.getElementById("popular-widget");
  if (!container) return;

  container.innerHTML = `
    <!-- GROUP CHAT -->
    <div class="widget">
      <div class="widget-title"><span>💬 Group Chat</span></div>
      <div id="chatango-container" style="min-height: 400px;"></div>
    </div>

    <!-- DISCORD -->
    <div class="widget">
      <div class="widget-title"><span>🌟 Discord Server</span></div>
      <div id="discord-container" style="min-height: 400px;"></div>
    </div>

    <!-- TOP SUPPORTER -->
    <div class="widget">
      <div class="widget-title"><span>❤️ Top Supporter</span></div>
      <div id="trakteer-container" style="min-height: 400px;"></div>
    </div>
  `;

  const loadChatango = () => {
    const chatContainer = document.getElementById("chatango-container");
    if (!chatContainer || chatContainer.dataset.loaded) return;
    chatContainer.dataset.loaded = "true";

    const s = document.createElement("script");
    s.id = "cid0020000395201926758";
    s.async = true;
    s.src = "https://st.chatango.com/js/gz/emb.js";
    s.setAttribute("data-cfasync", "false");
    s.style.cssText = "width:100% !important; height:100% !important; display:block;";
    s.innerHTML = JSON.stringify({
      handle: "mikorokugrup",
      arch: "js",
      styles: { a: "ffcc00", b: 100, c: "000000", d: "000000", k: "ffcc00", l: "ffcc00", m: "ffcc00", q: "ffcc00", r: 100, cnrs: "1" }
    });
    chatContainer.appendChild(s);
  };

  const loadDiscord = () => {
    const discordContainer = document.getElementById("discord-container");
    if (!discordContainer || discordContainer.dataset.loaded) return;
    discordContainer.dataset.loaded = "true";

    discordContainer.innerHTML = `
      <iframe
        title="Discord Server"
        src="https://discord.com/widget?id=845650870833381396&theme=dark"
        width="100%" height="400" allowtransparency="true" frameborder="0" loading="lazy"
        sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts">
      </iframe>`;
  };

  const loadTrakteer = () => {
    const trakteerContainer = document.getElementById("trakteer-container");
    if (!trakteerContainer || trakteerContainer.dataset.loaded) return;
    trakteerContainer.dataset.loaded = "true";

    trakteerContainer.innerHTML = `
      <iframe
        title="Top Supporter"
        src="https://stream.trakteer.id/top-supporter/index.html?ts_font=Amaranth&ts_count=10&ts_theme=default&ts_1_clr1=rgba%28190%2C+30%2C+45%2C+1%29&ts_1_clr2=rgba%28254%2C+216%2C+73%2C+1%29&ts_1_clr3=rgba%28215%2C+216%2C+200%2C+1%29&ts_1_clr4=rgba%28243%2C+221%2C+202%2C+1%29&ts_1_clr5=rgba%28255%2C+255%2C+255%2C+1%29&ts_1_clr6=rgba%280%2C+0%2C+0%2C+1%29&ts_topthree=true&key=trstream-mzZFhwKT3ckqKvscQyBU&page_url=trakteer.id%2Fmikorokuscan%2Fgift&mod=3&hash=b9073anedkr4ekzg&timestamp=1763749149"
        height="400" width="100%" frameborder="0" scrolling="auto" loading="lazy"
        style="border:0; border-radius:12px;">
      </iframe>`;
  };

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        loadChatango();
        loadDiscord();
        loadTrakteer();
        obs.disconnect();
      }
    });
  }, { rootMargin: "200px" });

  observer.observe(container);
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initWidgets, { once: true });
} else {
  initWidgets();
}