import { getSource } from '$lib/server/sources';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

const LOAD_TIMEOUT_MS = 12000;
const CACHE_TTL = 600;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
	return new Promise((resolve, reject) => {
		const t = setTimeout(() => reject(new Error('load_timeout')), ms);
		promise
			.then((v) => {
				clearTimeout(t);
				resolve(v);
			})
			.catch((e) => {
				clearTimeout(t);
				reject(e);
			});
	});
}

async function getCached<T>(
	key: string,
	fetcher: () => Promise<T>,
	ttlSeconds = CACHE_TTL
): Promise<T> {
	// @ts-ignore
	const cache = typeof caches !== 'undefined' ? caches.default : null;

	if (!cache) {
		return await fetcher();
	}

	const cacheKey = new Request(`https://cache.internal/${key}`);

	const cached = await cache.match(cacheKey);
	if (cached) {
		try {
			return (await cached.json()) as T;
		} catch {
		}
	}

	const data = await fetcher();

	const response = new Response(JSON.stringify(data), {
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': `public, max-age=${ttlSeconds}`
		}
	});

	cache.put(cacheKey, response).catch(console.error);

	return data;
}

export const load: PageServerLoad = async ({ params, url, setHeaders }) => {
	const sourceId = params.source;
	const idParts = Array.isArray(params.id) ? params.id : [params.id];
	const mangaId = '/' + idParts.filter(Boolean).join('/');
	const lang = (url.searchParams.get('lang') || 'all').toLowerCase();

	if (!sourceId || !mangaId || mangaId === '/') {
		throw error(400, 'Invalid manga path');
	}

	const cacheKey = `manga:${sourceId}:${mangaId}:lang=${lang}`;

	try {
		const manga = await getCached(cacheKey, async () => {
			const adapter = getSource(sourceId);
			return await withTimeout(
				adapter.getMangaDetails(mangaId, { lang }),
				LOAD_TIMEOUT_MS
			);
		});

		if (!manga || !manga.title) {
			throw error(404, 'Manga tidak ditemukan');
		}

		setHeaders({
			'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300'
		});

		return {
			manga,
			source: sourceId,
			selectedLang: lang
		};
	} catch (e: any) {
		console.error('[Manga Detail] load failed:', e);
		if (e?.status) throw e;
		throw error(404, 'Manga tidak ditemukan');
	}
};
