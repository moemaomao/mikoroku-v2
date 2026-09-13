/**
 * Simple cache helper pakai Cloudflare Cache API
 * Cocok untuk caching hasil scraping / API response
 */

<<<<<<< HEAD
const DEFAULT_TTL = 300; // 5 menit (detik)
=======
const DEFAULT_TTL = 300;
>>>>>>> ec3c23b (feat: add shared getCached and cache homepage + pages API)

export async function getCached<T>(
	key: string,
	fetcher: () => Promise<T>,
	ttlSeconds = DEFAULT_TTL
): Promise<T> {
<<<<<<< HEAD
	// Cache API hanya tersedia di Cloudflare runtime
	// @ts-ignore
	const cache = typeof caches !== 'undefined' ? caches.default : null;

	if (!cache) {
		// Fallback saat local dev (vite dev)
		return await fetcher();
	}

	// Buat Request palsu sebagai cache key
	const cacheKey = new Request(`https://cache.internal/${key}`, {
		method: 'GET'
	});

	// Coba ambil dari cache
	const cached = await cache.match(cacheKey);
	if (cached) {
		try {
			return (await cached.json()) as T;
		} catch {
			// Kalau corrupt, lanjut fetch baru
		}
	}

	// Cache miss → ambil data asli
	const data = await fetcher();

	// Simpan ke cache (pakai waitUntil biar tidak nahan response)
	const response = new Response(JSON.stringify(data), {
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': `public, max-age=${ttlSeconds}`
		}
	});

	// @ts-ignore
	if (typeof caches !== 'undefined') {
		// Jangan await supaya tidak memperlambat response
		cache.put(cacheKey, response.clone()).catch(console.error);
	}

	return data;
}
=======
	// @ts-expect-error caches is available in CF Workers
	const cache = typeof caches !== 'undefined' ? caches.default : null;

	if (!cache) {
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
	}

	const data = await fetcher();

	try {
		const response = new Response(JSON.stringify(data), {
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': `public, max-age=${ttlSeconds}`
			}
		});
		cache.put(cacheKey, response).catch((err: unknown) => {
			console.error('[cache] put failed:', key, err);
		});
	} catch (err: unknown) {
		console.error('[cache] serialize failed:', key, err);
	}

	return data;
}
>>>>>>> ec3c23b (feat: add shared getCached and cache homepage + pages API)
