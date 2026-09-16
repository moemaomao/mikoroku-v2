/**
 * Cloudflare KV Cache helper
 * Lebih stabil & durable dibanding Cache API
 */

const DEFAULT_TTL = 60 * 15; // 15 menit

type Env = {
	MIKOROKU_CACHE: KVNamespace;
};

function getKV(): KVNamespace | null {
	
	const env = (globalThis as any).env || (globalThis as any).__env;
	return env?.MIKOROKU_CACHE ?? null;
}

export async function getCached<T>(
	key: string,
	fetcher: () => Promise<T>,
	ttlSeconds = DEFAULT_TTL
): Promise<T> {
	const kv = getKV();

	// Fallback untuk local development
	if (!kv) {
		return await fetcher();
	}

	try {
		const cached = await kv.get(key, 'json');
		if (cached !== null) {
			return cached as T;
		}
	} catch (err) {
		console.error('[KV] get failed:', key, err);
	}

	// Cache miss → fetch data
	const data = await fetcher();

	// Simpan ke KV (jangan await supaya tidak memperlambat response)
	kv.put(key, JSON.stringify(data), {
		expirationTtl: ttlSeconds
	}).catch((err) => {
		console.error('[KV] put failed:', key, err);
	});

	return data;
}

/** Paksa hapus cache (berguna saat debugging) */
export async function deleteCache(key: string): Promise<void> {
	const kv = getKV();
	if (kv) {
		await kv.delete(key);
	}
}