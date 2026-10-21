const initBuildLog = () => {
  const el = document.getElementById("buildlog-widget");
  if (!el) return;

  el.innerHTML = `
    <div class="buildlog-wrapper">
      <button class="buildlog-toggle" type="button" aria-expanded="false">
        <span>Build Log v1.7.0</span>
        <span class="buildlog-arrow">▼</span>
      </button>

      <div class="buildlog-content" hidden>
        <div class="build-log">

          <h2>MIKOROKU BUILD LOG v1.7.0</h2>

          <p><strong>Tanggal:</strong> 24 Agustus 2026</p>

          <p>
            <strong>Status:</strong>
            <span class="status">
              Stable • Reader • Community • UI/UX
            </span>
          </p>

          <!-- ========================= -->
          <!-- UPDATE TERBARU -->
          <!-- ========================= -->

          <h3>🚀 Update Terbaru (v1.7.0)</h3>

          <ul>
            <li>✅ Tampilan Homepage diperbarui</li>
            <li>✅ Perbaikan posisi Sidebar di Desktop</li>
            <li>✅ Perbaikan posisi Section Title</li>
            <li>✅ Perbaikan posisi tombol Load More</li>
            <li>✅ Perbaikan Sticky Header & Sidebar</li>
            <li>✅ Peningkatan tampilan Mobile</li>
            <li>✅ Pergantian Server Chapter</li>
            <li>✅ Sistem Chapter lebih stabil saat berpindah Manga</li>
            <li>✅ Loading Screen saat membuka Reader</li>
            <li>✅ Loading Indicator saat Download Chapter</li>
            <li>✅ Peningkatan pengalaman Download Chapter</li>
            <li>✅ Peningkatan sistem Reading History</li>
            <li>✅ Peningkatan Continue Reading</li>
            <li>✅ Peningkatan Bookmark</li>
            <li>✅ Perbaikan tampilan User Settings</li>
            <li>✅ Kontrol animasi untuk user</li>
            <li>✅ Kontrol animasi border level komentar</li>
            <li>✅ Peningkatan performa Reader</li>
            <li>✅ Peningkatan performa Mobile</li>
            <li>✅ Berbagai perbaikan UI/UX</li>
          </ul>


          <!-- ========================= -->
          <!-- CORE -->
          <!-- ========================= -->

          <h3>Fitur Sudah Selesai</h3>

          <h4>🏠 Homepage</h4>

          <ul>
            <li>Homepage Infinite Scroll</li>
            <li>Responsive Manga Grid</li>
            <li>Dark / Light Mode</li>
            <li>Search System</li>
            <li>Bookmark System</li>
            <li>Reading History</li>
            <li>Continue Reading</li>
            <li>Announcement Widget</li>
            <li>Popular Content</li>
            <li>Responsive Sidebar</li>
          </ul>


          <!-- ========================= -->
          <!-- DETAIL -->
          <!-- ========================= -->

          <h4>📖 Manga Detail</h4>

          <ul>
            <li>Cover Manga</li>
            <li>Synopsis</li>
            <li>Genre</li>
            <li>Rating</li>
            <li>Author / Artist</li>
            <li>Circle / Group</li>
            <li>Status</li>
            <li>Alternative Title</li>
            <li>Publication & Serialization</li>
            <li>Female / Male Tags</li>
            <li>Demographic Information</li>
            <li>Dynamic SEO Information</li>
            <li>Dynamic Open Graph</li>
          </ul>


          <!-- ========================= -->
          <!-- READER -->
          <!-- ========================= -->

          <h4>📚 Manga Reader</h4>

          <ul>
            <li>Webtoon Mode</li>
            <li>Page Mode</li>
            <li>Reader Settings</li>
            <li>Data Saver</li>
            <li>Keyboard Navigation</li>
            <li>Previous / Next Chapter</li>
            <li>Save Reading Position</li>
            <li>Mark Chapter as Read</li>
            <li>Reading History</li>
            <li>Continue Reading</li>
            <li>Chapter Navigation</li>
            <li>Optimized Image Loading</li>
            <li>Mobile Reader Optimization</li>
          </ul>


          <!-- ========================= -->
          <!-- NOVEL -->
          <!-- ========================= -->

          <h4>📕 Novel Reader</h4>

          <ul>
            <li>Auto Scroll</li>
            <li>Text To Speech</li>
            <li>Dark Theme</li>
            <li>Font Size Control</li>
            <li>Font Family Selector</li>
            <li>Column Width Control</li>
            <li>Scroll Speed Control</li>
          </ul>


          <!-- ========================= -->
          <!-- COMMUNITY -->
          <!-- ========================= -->

          <h4>💬 Community</h4>

          <ul>
            <li>Google Login</li>
            <li>GitHub Login</li>
            <li>Facebook Login</li>
            <li>X / Twitter Login</li>
            <li>Email Login & Register</li>

            <li>Comment System</li>
            <li>Reply & Mention</li>
            <li>Emoji Reaction</li>
            <li>Notification Center</li>
            <li>Realtime Direct Message</li>

            <li>User Settings</li>
            <li>Avatar</li>
            <li>User Badge</li>
            <li>User Background</li>
            <li>Animation Settings</li>
          </ul>


          <!-- ========================= -->
          <!-- PERFORMANCE -->
          <!-- ========================= -->

          <h4>⚡ Performance</h4>

          <ul>
            <li>Faster Content Loading</li>
            <li>Lazy Loading</li>
            <li>Image Loading Optimization</li>
            <li>Reader Performance Improvements</li>
            <li>Mobile Performance Improvements</li>
            <li>Duplicate Content Render Fix</li>
            <li>General UI Performance Improvements</li>
          </ul>


          <!-- ========================= -->
          <!-- NEXT UPDATE -->
          <!-- ========================= -->

          <h3>🔜 Next Update</h3>

          <ul class="todo">
            <li>Advanced Search Filter</li>
            <li>Random Manga Improvements</li>
            <li>Trending System</li>
            <li>Release Calendar</li>
            <li>Auto Next Chapter</li>
            <li>Fullscreen Reader</li>
            <li>Progressive Web App (PWA)</li>
            <li>Offline Reading</li>
            <li>Advanced SEO</li>
            <li>Reading Statistics</li>
            <li>Achievement System</li>
            <li>More User Profile Features</li>
          </ul>


          <!-- ========================= -->
          <!-- VERSION HISTORY -->
          <!-- ========================= -->

          <h3>📜 Version History</h3>

          <h4>v1.6.2 — 24 Agustus 2026</h4>

          <ul>
            <li>UI/UX Improvements</li>
            <li>Reader Improvements</li>
            <li>Chapter Navigation Improvements</li>
            <li>Download Experience Improvements</li>
            <li>Sidebar & Responsive Improvements</li>
            <li>User Settings Improvements</li>
            <li>Mobile Performance Improvements</li>
          </ul>

          <h4>v1.6.1 — Juli / Agustus 2026</h4>

          <ul>
            <li>Bookmark Improvements</li>
            <li>Reading History</li>
            <li>Continue Reading</li>
            <li>Firebase Authentication</li>
            <li>Emoji Reaction</li>
            <li>Comment Improvements</li>
            <li>Notification System</li>
            <li>Reader Settings</li>
            <li>Data Saver</li>
            <li>SEO & Open Graph Improvements</li>
            <li>Performance Improvements</li>
          </ul>

          <h4>v1.6.0 — 26 Juli 2026</h4>

          <ul>
            <li>Major Reader Improvements</li>
            <li>Community Features</li>
            <li>Reading System</li>
            <li>Manga Detail Improvements</li>
            <li>Dark / Light Mode</li>
            <li>Bookmark System</li>
          </ul>

        </div>
      </div>
    </div>

    <style>
      .buildlog-wrapper {
        margin: 5px 10px;
        position: relative;
        min-height: 30px;
        transition:
          margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1),
          width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .buildlog-toggle {
        width: 100%;
        background: #1a1a1a;
        color: #fff;
        border: none;
        padding: 12px 16px;
        font-size: 14px;
        border-radius: 10px;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .buildlog-toggle:hover {
        background: #252525;
      }

      .buildlog-arrow {
        transition: transform 0.3s ease;
        font-size: 12px;
      }

      .buildlog-wrapper.open .buildlog-arrow {
        transform: rotate(180deg);
      }

      .buildlog-content {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        max-height: 0;
        overflow: hidden;
        margin-top: 5px;
        visibility: hidden;
        opacity: 0;
        transition:
          max-height 0.4s ease,
          visibility 0.3s,
          opacity 0.3s;
        z-index: 999;
      }

      .buildlog-wrapper.open .buildlog-content {
        max-height: 70vh;
        visibility: visible;
        opacity: 1;
      }

      .build-log {
        padding: 14px;
        background: rgba(0, 0, 0, 0.88);
        color: #eee;
        border-radius: 12px;
        font-size: 13px;
        line-height: 1.7;
        max-height: 70vh;
        overflow: auto;
        border: 0.5px solid #777;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
      }

      .build-log h2 {
        margin-top: 0;
        color: #4da6ff;
      }

      .build-log h3 {
        margin-top: 22px;
        padding-bottom: 6px;
        border-bottom: 1px solid #333;
      }

      .build-log h4 {
        color: #9fd3ff;
        margin-top: 18px;
      }

      .build-log ul {
        padding-left: 20px;
      }

      .build-log li {
        margin: 4px 0;
      }

      .status {
        color: #00d26a;
        font-weight: bold;
      }

      .todo li {
        color: #ffb84d;
      }

      @media (min-width: 769px) {
        body.sidebar-open .buildlog-wrapper {
          margin-left: var(--sidebar-width, 280px);
          width: calc(
            100% - var(--sidebar-width, 280px) - 20px
          );
        }
      }

      @media (max-width: 768px) {
        .buildlog-wrapper {
          margin: 5px 8px;
        }

        .buildlog-toggle {
          padding: 11px 13px;
          font-size: 13px;
        }

        .build-log {
          font-size: 12px;
          max-height: 75vh;
          padding: 12px;
        }

        .build-log h2 {
          font-size: 18px;
        }

        .build-log h3 {
          font-size: 15px;
        }

        .build-log h4 {
          font-size: 14px;
        }
      }
    </style>
  `;

  const wrapper = el.querySelector(".buildlog-wrapper");
  const toggleBtn = el.querySelector(".buildlog-toggle");
  const content = el.querySelector(".buildlog-content");

  toggleBtn?.addEventListener("click", () => {
    const isOpen = wrapper.classList.toggle("open");

    toggleBtn.setAttribute(
      "aria-expanded",
      String(isOpen)
    );

    content.hidden = !isOpen;
  });

  document.addEventListener("click", (e) => {
    if (
      !wrapper.contains(e.target) &&
      wrapper.classList.contains("open")
    ) {
      wrapper.classList.remove("open");

      toggleBtn.setAttribute(
        "aria-expanded",
        "false"
      );

      content.hidden = true;
    }
  });
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initBuildLog, { once: true });
} else {
  initBuildLog();
}