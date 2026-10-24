function initMikorokuAnnouncement() {
  const target = document.getElementById("announcement-widget");
  if (!target) return;

  target.innerHTML = `
    <div class="mkr-announcement">

      <div class="mkr-announcement-head">
        <h3 class="mkr-announcement-title">PERHATIAN</h3>
        <button
          type="button"
          class="mkr-announcement-close"
          id="close-announcement"
          aria-label="Tutup pengumuman"
        >×</button>
      </div>

      <div class="mkr-server-list">

        <div class="mkr-server-item mkr-server-one">
          <div class="mkr-server-name">
            <span class="mkr-server-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="4" y="4" width="16" height="6" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/>
                <rect x="4" y="14" width="16" height="6" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/>
                <circle cx="8" cy="7" r="1" fill="currentColor"/>
                <circle cx="8" cy="17" r="1" fill="currentColor"/>
              </svg>
            </span>
            <span>Server 1</span>
          </div>
          <div class="mkr-server-description">
            Server utama untuk membaca chapter. (Rekomendasi)
          </div>
        </div>

        <div class="mkr-server-item mkr-server-two">
          <div class="mkr-server-name">
            <span class="mkr-server-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="4" y="4" width="16" height="6" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/>
                <rect x="4" y="14" width="16" height="6" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/>
                <circle cx="8" cy="7" r="1" fill="currentColor"/>
                <circle cx="8" cy="17" r="1" fill="currentColor"/>
              </svg>
            </span>
            <span>Server 2</span>
          </div>
          <div class="mkr-server-description">
            Server alternatif jika chapter di Server 1 mengalami masalah
            atau tidak dapat dimuat.
          </div>
        </div>

        <div class="mkr-server-item mkr-server-emergency">
          <div class="mkr-server-name">
            <span class="mkr-server-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="4" y="4" width="16" height="6" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/>
                <rect x="4" y="14" width="16" height="6" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/>
                <circle cx="8" cy="7" r="1" fill="currentColor"/>
                <circle cx="8" cy="17" r="1" fill="currentColor"/>
              </svg>
            </span>
            <span>Emergency Server</span>
          </div>
          <div class="mkr-server-description">
            Server cadangan. Sebagian chapter belum lengkap.
            Jika gambar tidak muncul, artinya server sedang terkena limit
            dan gambar tidak dapat dimuat sementara. (Busuk)
          </div>
        </div>

      </div>
    </div>
  `;

  const closeBtn = document.getElementById("close-announcement");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      target.style.display = "none";
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initMikorokuAnnouncement, { once: true });
} else {
  initMikorokuAnnouncement();
}

/* ============================================================
   MIKOROKU ANNOUNCEMENT
   CSS disamakan dengan blok .synopsis
   ============================================================ */
(() => {
  const style = document.createElement("style");
  style.textContent = `

  #announcement-widget,
  #announcement-widget * {
    box-sizing: border-box;
  }

  #announcement-widget {
    width: 100%;
    margin: 0;
    padding: 0;
  }

  /* Sama dengan .synopsis — margin atas biar tidak mepet tab di mobile */
  #announcement-widget .mkr-announcement {
    padding: 15px 14px;
    background: rgba(26, 26, 46, 0.35);
    margin: 16px 12px 15px;
    border-radius: 14px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    font-size: 13px;
    color: #fff;
    font-family: 'Kodchasan', system-ui, -apple-system, sans-serif;
    position: relative;
    overflow: hidden;
  }

  /* Header */
  #announcement-widget .mkr-announcement-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 0 0 14px 0;
    padding: 0;
    position: relative;
  }

  /* Title — selaras .synopsis h2 */
  #announcement-widget .mkr-announcement-title {
    margin: 0;
    padding: 0;
    font-size: 18px;
    font-weight: 700;
    line-height: 1.25;
    color: #ffd700;
  }

  /* Close button */
  #announcement-widget .mkr-announcement-close {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: #ddd;
    font-size: 22px;
    font-weight: 300;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s ease, color 0.2s ease;
  }

  #announcement-widget .mkr-announcement-close:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #ff6b6b;
  }

  /* Server list */
  #announcement-widget .mkr-server-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin: 0;
    padding: 0;
  }

  #announcement-widget .mkr-server-item {
    margin: 0;
    padding: 0;
  }

  #announcement-widget .mkr-server-name {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 4px 0;
    padding: 0;
    font-size: 13px;
    font-weight: 700;
    line-height: 1.3;
  }

  #announcement-widget .mkr-server-icon {
    width: 16px;
    height: 16px;
    min-width: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  #announcement-widget .mkr-server-icon svg {
    display: block;
    width: 16px;
    height: 16px;
  }

  #announcement-widget .mkr-server-description {
    margin: 0;
    padding: 0 0 0 24px;
    color: #ddd;
    font-size: 13px;
    font-weight: 400;
    line-height: 1.5;
  }

  /* Warna server */
  #announcement-widget .mkr-server-one .mkr-server-name,
  #announcement-widget .mkr-server-one .mkr-server-icon {
    color: #60a5fa;
  }

  #announcement-widget .mkr-server-two .mkr-server-name,
  #announcement-widget .mkr-server-two .mkr-server-icon {
    color: #fbbf24;
  }

  #announcement-widget .mkr-server-emergency .mkr-server-name,
  #announcement-widget .mkr-server-emergency .mkr-server-icon {
    color: #f87171;
  }

  /* Tablet — sama margin .synopsis */
  @media (min-width: 768px) {
    #announcement-widget .mkr-announcement {
      margin: 12px 30px 30px;
      padding: 15px 14px;
    }
  }

  /* Desktop — sama margin .synopsis */
  @media (min-width: 1024px) {
    #announcement-widget .mkr-announcement {
      margin: 0 40px 40px;
    }
  }

    @media (min-width: 1024px) {
    #announcement-widget .mkr-announcement {
      margin: 0 40px 40px;
    }
  }

  /* =========================================================
     LIGHT MODE
     ========================================================= */

  /* Match .synopsis light: rgba(184,174,174,0.329) + soft border */
  html.light #announcement-widget .mkr-announcement,
  html:not(.dark) #announcement-widget .mkr-announcement {
    background: rgba(184, 174, 174, 0.329);
    border-color: rgba(0, 0, 0, 0.1);
    color: #050000;
  }

  html.dark #announcement-widget .mkr-announcement {
    background: rgba(26, 26, 46, 0.35);
    border-color: rgba(255, 255, 255, 0.08);
    color: #fff;
  }

  html.light #announcement-widget .mkr-announcement-title,
  html:not(.dark) #announcement-widget .mkr-announcement-title {
    color: #b45309;
  }

  html.dark #announcement-widget .mkr-announcement-title {
    color: #ffd700;
  }

  html.light #announcement-widget .mkr-announcement-close {
    color: #555555;
  }

  html.light #announcement-widget .mkr-announcement-close:hover {
    background: rgba(0, 0, 0, 0.06);
    color: #ef4444;
  }

  html.light #announcement-widget .mkr-server-description {
    color: #333333;
  }

  html.light #announcement-widget .mkr-server-one .mkr-server-name,
  html.light #announcement-widget .mkr-server-one .mkr-server-icon {
    color: #2563eb;
  }

  html.light #announcement-widget .mkr-server-two .mkr-server-name,
  html.light #announcement-widget .mkr-server-two .mkr-server-icon {
    color: #d97706;
  }

  html.light #announcement-widget .mkr-server-emergency .mkr-server-name,
  html.light #announcement-widget .mkr-server-emergency .mkr-server-icon {
    color: #dc2626;
  }

  `;
  document.head.appendChild(style);
})();
