import JSZip from "jszip"; // pastikan sudah di-bundle / tersedia di environment

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.split("/").filter(Boolean);

    // ======================
    // CORS Preflight
    // ======================
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }

    // ======================
    // ROBOTS.TXT
    // ======================
    if (url.pathname === "/robots.txt") {
      return new Response(
`User-agent: *
Allow: /

Sitemap: https://mikoroku.com/sitemap.xml`,
        {
          headers: {
            "Content-Type": "text/plain; charset=UTF-8"
          }
        }
      );
    }

    // ======================
    // SITEMAP.XML
    // ======================
    if (url.pathname === "/sitemap.xml") {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://mikoroku.com/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://mikoroku.com/manga-list</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://mikoroku.com/hentai-list</loc>
    <changefreq>daily</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>https://mikoroku.com/genre-list</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://mikoroku.com/privacy</loc>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>https://mikoroku.com/terms</loc>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>https://mikoroku.com/dmca</loc>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>https://mikoroku.com/about</loc>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>https://mikoroku.com/bookmark</loc>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>`;

      return new Response(xml, {
        headers: {
          "Content-Type": "application/xml; charset=UTF-8"
        }
      });
    }

    // ======================
    // DOWNLOAD ZIP
    // ======================
    if (url.pathname === "/download-zip") {
      try {
        const body = await request.json();
        const { images, filename } = body;

        if (!images || !Array.isArray(images) || images.length === 0) {
          return jsonResponse({ error: "No images" }, 400);
        }

        const zip = new JSZip();
        let success = 0;

        const chunks = chunkArray(images, 6);

        for (const chunk of chunks) {
          await Promise.all(chunk.map(async (imgUrl) => {
            try {
              const res = await fetch(imgUrl, {
                headers: {
                  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                  "Referer": "https://www.blogger.com/"
                }
              });

              if (!res.ok) return;

              const buffer = await res.arrayBuffer();
              const ext = res.headers.get("content-type")?.includes("png") ? "png" : "jpg";
              const name = `${String(success + 1).padStart(3, "0")}.${ext}`;
              
              zip.file(name, buffer);
              success++;
            } catch (e) {
              console.log("Gagal satu gambar:", e.message);
            }
          }));
        }

        if (success === 0) {
          return jsonResponse({ error: "Semua gambar gagal diunduh" }, 500);
        }

        const zipBuffer = await zip.generateAsync({
          type: "arraybuffer",
          compression: "DEFLATE",
          compressionOptions: { level: 6 }
        });

        return new Response(zipBuffer, {
          headers: {
            ...corsHeaders(),
            "Content-Type": "application/zip",
            "Content-Disposition": `attachment; filename="${filename || "chapter.zip"}"`
          }
        });

      } catch (err) {
        return jsonResponse({ error: err.message }, 500);
      }
    }

    // =====================================================
    // REDIRECT URL LAMA NOVEL
    // =====================================================
    if (url.pathname === "/novel-reader.html") {
      const slug = url.searchParams.get("slug");
      const chapter = url.searchParams.get("chapter");

      if (slug) {
        const destination = chapter
          ? `/novel/${encodeURIComponent(slug)}/${encodeURIComponent(chapter)}`
          : `/series/${encodeURIComponent(slug)}`;
        return Response.redirect(
          `${url.origin}${destination}`,
          301
        );
      }
    }

    // =====================================================
    // REDIRECT URL LAMA MANGA
    // =====================================================
    if (url.pathname === "/reader.html") {
      const slug = url.searchParams.get("slug");
      const chapter = url.searchParams.get("chapter");

      if (slug && chapter) {
        return Response.redirect(
          `${url.origin}/manga/${encodeURIComponent(slug)}/${encodeURIComponent(chapter)}`,
          301
        );
      }
    }

    // =====================================================
    // FILE STATIS
    // =====================================================
    return fetch(request);
  }
};

// ======================
// Helper functions
// ======================
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(),
      "Content-Type": "application/json"
    }
  });
}

function chunkArray(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Max-Age": "86400",
  };

  // Tangani Preflight CORS
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Endpoint lain tidak tersedia.
  return new Response(
    JSON.stringify({
      error: "API Not Found",
      path: path,
    }),
    {
      status: 404,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    }
  );
}