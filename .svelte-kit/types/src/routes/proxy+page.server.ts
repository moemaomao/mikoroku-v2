// @ts-nocheck
/**
 * Home Page - Server Load
 */

import { getAllSources, getSource } from '$lib/server/sources';
import { getCached } from '$lib/server/cache';
import type { PageServerLoad } from './$types';

const LOAD_TIMEOUT_MS = 12000;
const MAX_MANGAS = 40;
const LIST_CACHE_TTL = 300;

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

export const load = async ({ url, setHeaders, depends }: Parameters<PageServerLoad>[0]) => {
	const sourceParam = url.searchParams.get('source');
	const sourceId = sourceParam;
	const pageNum = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
	const query = (url.searchParams.get('q') || '').trim();
	const lang = (url.searchParams.get('lang') || 'all').toLowerCase();
	const type = (url.searchParams.get('type') || 'all').toLowerCase();

	const sources = getAllSources().map((s) => ({ id: s.id, name: s.name }));
	let mangas: any[] = [];

	if (sourceId) {
		depends(`browse:${sourceId}`);

		const cacheKey = [
			'browse',
			sourceId,
			`p=${pageNum}`,
			`q=${query}`,
			`lang=${lang}`,
			`type=${type}`
		].join(':');

		try {
			const list = await getCached(
				cacheKey,
				async () => {
					const adapter = getSource(sourceId);
					const fetchPromise = query
						? adapter.searchManga(query, { page: pageNum, lang, type })
						: adapter.getLatestManga(pageNum, { lang, type });

					const result = await withTimeout(fetchPromise, LOAD_TIMEOUT_MS);
					return Array.isArray(result) ? result : [];
				},
				LIST_CACHE_TTL
			);

			mangas = list.slice(0, MAX_MANGAS);
		} catch (e) {
			console.error('[Browse] load failed:', e);
			mangas = [];
		}
	}

	setHeaders({
		'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
	});

	return {
		mangas,
		sources,
		currentSource: sourceId,
		currentPage: pageNum,
		searchQuery: query,
		selectedLang: lang,
		selectedType: type,
		needsSource: !sourceId
	};
};