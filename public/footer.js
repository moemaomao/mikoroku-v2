const initFooter = () => {
  const el = document.getElementById("site-footer");
  if (!el || el.querySelector("#mainFooter")) return;

  const year = new Date().getFullYear();

  el.innerHTML = `
<footer id="mainFooter">
  <div class="footer-container">

    <!-- LINKS -->
    <div class="footer-center">
      <a href="/privacy">Privacy Policy</a>
      <a href="/dmca">DMCA</a>
      <a href="/terms">Terms</a>
      <a href="/about">About</a>
      <a href="mailto:mikorokuscan@gmail.com">Contact</a>
    </div>

    <!-- RIGHT -->
    <div class="footer-right">

      <!-- SOCIAL -->
      <div class="social">

        <!-- DISCORD -->
        <a
          href="https://discord.gg/kkt669knaG"
          target="_blank"
          rel="noopener noreferrer"
          class="social-icon discord"
        >
          <span class="sr-only">Discord</span>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.369a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.249a18.27 18.27 0 0 0-5.487 0c-.164-.385-.398-.874-.61-1.249a.077.077 0 0 0-.079-.037 19.736 19.736 0 0 0-4.885 1.515.07.07 0 0 0-.032.027C.533 9.045-.32 13.579.099 18.057a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.873-1.295 1.226-1.994a.076.076 0 0 0-.041-.105 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.927 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .078.009c.12.099.246.197.373.291a.077.077 0 0 1-.006.128 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.04.106c.36.699.77 1.363 1.225 1.993a.076.076 0 0 0 .084.028 19.876 19.876 0 0 0 5.994-3.03.077.077 0 0 0 .03-.055c.5-5.177-.838-9.674-3.548-13.66a.061.061 0 0 0-.031-.30z"/>
          </svg>
        </a>

        <!-- FACEBOOK -->
        <a
          href="https://facebook.com/"
          target="_blank"
          rel="noopener noreferrer"
          class="social-icon facebook"
        >
          <span class="sr-only">Facebook</span>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M22 12a10 10 0 1 0-11.63 9.87v-6.99H7.9V12h2.47V9.8c0-2.44 1.45-3.79 3.68-3.79 1.07 0 2.19.19 2.19.19v2.4h-1.23c-1.21 0-1.59.75-1.59 1.52V12h2.71l-.43 2.88h-2.28v6.99A10 10 0 0 0 22 12z"/>
          </svg>
        </a>

      </div>

      <!-- COPYRIGHT -->
      <div class="footer-copyright">
        © ${year} <b>Mikoroku.</b> All Rights Reserved.
      </div>

      <!-- HISTATS -->
      <div class="footer-bottom-row">
        <div id="histats-wrapper">
          <div id="histats_counter"></div>
        </div>
      </div>

    </div>

  </div>
</footer>
  `;

  // ==========================================
  // FIX ACCESSIBILITY HISTATS (MutationObserver)
  // ==========================================
  const targetNode = document.getElementById("histats-wrapper");
  if (targetNode) {
    const observer = new MutationObserver(() => {
      const histatsLink = targetNode.querySelector("a");
      if (histatsLink && !histatsLink.hasAttribute("aria-label")) {
        histatsLink.setAttribute("aria-label", "Histats Visitor Statistics");
        observer.disconnect();
      }
    });

    observer.observe(targetNode, { childList: true, subtree: true });
  }

  // ==========================================
  // HISTATS
  // ==========================================
  window._Hasync = window._Hasync || [];
  window._Hasync.push([
    'Histats.start',
    '1,4916560,4,2052,280,25,00010001'
  ]);
  window._Hasync.push([
    'Histats.fasi',
    '1'
  ]);
  window._Hasync.push([
    'Histats.track_hits',
    ''
  ]);

  if (!document.querySelector('script[data-histats="mikoroku"]')) {
    const hs = document.createElement('script');
    hs.type = 'text/javascript';
    hs.async = true;
    hs.src = 'https://s10.histats.com/js15_as.js';
    hs.setAttribute('data-histats', 'mikoroku');
    document.head.appendChild(hs);
  }
};

window.initSiteFooter = initFooter;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initFooter, { once: true });
} else {
  initFooter();
}