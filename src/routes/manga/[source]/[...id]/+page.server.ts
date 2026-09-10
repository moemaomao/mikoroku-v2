import { getSource } from '$lib/server/sources';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

const LOAD_TIMEOUT_MS = 12000;

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

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	const sourceId = params.source;
	// [...id] → array, join jadi path lengkap (misal: comics/kidnapped-dragons-53fc8424)
	const idParts = Array.isArray(params.id) ? params.id : [params.id];
	const mangaId = '/' + idParts.join('/');

	if (!sourceId || !mangaId || mangaId === '/') {
		throw error(400, 'Invalid manga path');
	}

	try {
		const adapter = getSource(sourceId);
		const manga = await withTimeout(adapter.getMangaDetails(mangaId), LOAD_TIMEOUT_MS);

		if (!manga || !manga.title) {
			throw error(404, 'Manga tidak ditemukan');
		}

		setHeaders({
			'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300'
		});

		return {
			manga,
			source: sourceId
		};
	} catch (e: any) {
		console.error('[Manga Detail] load failed:', e);

		// Kalau sudah error() dari SvelteKit, biarin
		if (e?.status) throw e;

		throw error(404, 'Manga tidak ditemukan');
	}
};