/**
 * Cloudflare KV Cache helper (SvelteKit compatible)
 */

const DEFAULT_TTL = 60 * 15; // 15 menit

export async function getCached<T>(
	key: string,
	fetcher: () => Promise<T>,
	ttlSeconds = DEFAULT_TTL,
	platform?: App.Platform
): Promise<T> {
	const kv = platform?.env?.MIKOROKU_CACHE as KVNamespace | undefined;

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

	const data = await fetcher();

	kv.put(key, JSON.stringify(data), {
		expirationTtl: ttlSeconds
	}).catch((err) => {
		console.error('[KV] put failed:', key, err);
	});

	return data;
}

export async function deleteCache(key: string, platform?: App.Platform): Promise<void> {
	const kv = platform?.env?.MIKOROKU_CACHE as KVNamespace | undefined;
	if (kv) {
		await kv.delete(key);
	}
}