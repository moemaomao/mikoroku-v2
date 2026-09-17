// @ts-nocheck
import { getSource } from '$lib/server/sources';
import { getCached } from '$lib/server/cache';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

const LOAD_TIMEOUT_MS = 12000;
const DETAIL_CACHE_TTL = 600; // 10 menit

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

export const load = async ({ params, url, setHeaders, locals }: Parameters<PageServerLoad>[0]) => {
	const sourceId = params.source;
	const idParts = Array.isArray(params.id) ? params.id : [params.id];
	const mangaId = '/' + idParts.filter(Boolean).join('/');
	const lang = (url.searchParams.get('lang') || 'all').toLowerCase();

	if (!sourceId || !mangaId || mangaId === '/') {
		throw error(400, 'Invalid manga path');
	}

	const cacheKey = `manga:${sourceId}:${mangaId}:lang=${lang}`;

	try {
		const manga = await getCached(
			cacheKey,
			async () => {
				const adapter = getSource(sourceId);
				return await withTimeout(
					adapter.getMangaDetails(mangaId, { lang }),
					LOAD_TIMEOUT_MS
				);
			},
			DETAIL_CACHE_TTL,
			locals.kv
		);

		if (!manga || !manga.title) {
			throw error(404, 'Manga tidak ditemukan');
		}

		setHeaders({
			'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300'
		});

		return {
			manga,
			source: sourceId,
			selectedLang: lang,
			canonicalUrl: url.href
		};
	} catch (e: any) {
		console.error('[Manga Detail] load failed:', e);
		if (e?.status) throw e;
		throw error(404, 'Manga tidak ditemukan');
	}
};