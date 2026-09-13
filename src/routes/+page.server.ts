/**
 * Home Page - Server Load
 */

import { getAllSources, getSource } from '$lib/server/sources';
import type { PageServerLoad } from './$types';

const LOAD_TIMEOUT_MS = 12000;
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

/** Samakan english/indonesian/... dengan kode ISO (en/id/...) */
function normLang(lang?: string): string {
	const raw = String(lang || '')
		.trim()
		.toLowerCase();
	if (!raw || raw === 'all' || raw === 'any' || raw === '*') return '';
	const aliases: Record<string, string> = {
		english: 'en',
		indonesian: 'id',
		indonesia: 'id',
		bahasa: 'id',
		japanese: 'ja',
		japan: 'ja',
		korean: 'ko',
		korea: 'ko',
		chinese: 'zh',
		french: 'fr',
		spanish: 'es',
		portuguese: 'pt-br',
		russian: 'ru',
		vietnamese: 'vi',
		thai: 'th',
		arabic: 'ar',
		german: 'de',
		italian: 'it',
		polish: 'pl',
		turkish: 'tr'
	};
	return aliases[raw] || raw;
}

export const load: PageServerLoad = async ({ url, setHeaders, depends }) => {
	const sourceParam = url.searchParams.get('source');
	const sourceId = sourceParam; // biarkan null kalau belum ada
	const pageNum = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
	const query = (url.searchParams.get('q') || '').trim();
	const lang = (url.searchParams.get('lang') || 'all').toLowerCase();
	const type = (url.searchParams.get('type') || 'all').toLowerCase();

	const sources = getAllSources().map((s) => ({ id: s.id, name: s.name }));
	let mangas: any[] = [];

	// Hanya fetch manga kalau sudah ada source
	if (sourceId) {
		depends(`browse:${sourceId}`);

		try {
			const adapter = getSource(sourceId);

			const fetchPromise = query
				? adapter.searchManga(query, { page: pageNum, lang, type })
				: adapter.getLatestManga(pageNum, { lang, type });

			const result = await withTimeout(fetchPromise, LOAD_TIMEOUT_MS);
			let list = Array.isArray(result) ? result : [];

			// ... filter lang & type tetap sama seperti sebelumnya ...

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
		currentSource: sourceId,      // bisa null
		currentPage: pageNum,
		searchQuery: query,
		selectedLang: lang,
		selectedType: type,
		needsSource: !sourceId        // flag untuk UI
	};
};