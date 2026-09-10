/**
 * Home Page - Server Load
 * Soft-fail + timeout agar Workers free tidak 500/1102 terus
 */

import { getAllSources, getSource } from '$lib/server/sources';
import type { PageServerLoad } from './$types';

const LOAD_TIMEOUT_MS = 8000;
const MAX_MANGAS = 40;

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

export const load: PageServerLoad = async ({ url, setHeaders, depends }) => {
	const sourceId = url.searchParams.get('source') || 'asura';
	const pageNum = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
	const query = (url.searchParams.get('q') || '').trim();

	const lang = (url.searchParams.get('lang') || 'all').toLowerCase();
	const type = (url.searchParams.get('type') || 'all').toLowerCase();

	depends(`browse:${sourceId}`);

	const sources = getAllSources().map((s) => ({ id: s.id, name: s.name }));
	let mangas: any[] = [];

	try {
		const adapter = getSource(sourceId);

		// Adapter yang support filter (Hitomi, nhentai, dll) sudah filter di sumbernya
		const fetchPromise = query
			? adapter.searchManga(query, { page: pageNum, lang, type })
			: adapter.getLatestManga(pageNum, { lang, type });

		const result = await withTimeout(fetchPromise, LOAD_TIMEOUT_MS);
		let list = Array.isArray(result) ? result : [];

		// Hanya filter di memori JIKA item punya field lang/language/type
		// (jangan hapus hasil yang sudah di-filter di adapter)
		const hasLangField = list.some(
			(m: any) => m.lang != null || m.language != null
		);
		const hasTypeField = list.some((m: any) => m.type != null);

		if (lang !== 'all' && hasLangField) {
			list = list.filter((m: any) => {
				const itemLang = (m.lang || m.language || '').toLowerCase();
				return !itemLang || itemLang === lang;
			});
		}

		if (type !== 'all' && hasTypeField) {
			list = list.filter((m: any) => {
				const itemType = (m.type || '').toLowerCase();
				return !itemType || itemType === type;
			});
		}

		mangas = list.slice(0, MAX_MANGAS);
	} catch (e) {
		console.error('[Browse] load failed:', e);
		mangas = [];
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
		selectedType: type
	};
};