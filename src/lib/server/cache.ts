/**
 * Simple cache helper pakai Cloudflare Cache API
 * Cocok untuk caching hasil scraping / API response
 */

const DEFAULT_TTL = 300; // 5 menit (detik)

export async function getCached<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds = DEFAULT_TTL
): Promise<T> {
    // @ts-expect-error caches is available in CF Workers
    const cache = typeof caches !== 'undefined' ? caches.default : null;

    if (!cache) {
        // Fallback saat local dev (vite dev)
        return await fetcher();
    }

    const cacheKey = new Request(`https://cache.internal/${encodeURIComponent(key)}`, {
        method: 'GET'
    });

    try {
        const cached = await cache.match(cacheKey);
        if (cached) {
            const data = (await cached.json()) as T;
            return data;
        }
    } catch {
        // Kalau corrupt, lanjut fetch baru
    }

    // Cache miss → ambil data asli
    const data = await fetcher();

    try {
        const response = new Response(JSON.stringify(data), {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': `public, max-age=${ttlSeconds}`
            }
        });
        
        // Jangan await supaya tidak memperlambat response
        cache.put(cacheKey, response).catch((err: unknown) => {
            console.error('[cache] put failed:', key, err);
        });
    } catch (err: unknown) {
        console.error('[cache] serialize failed:', key, err);
    }

    return data;
}